import { useState, useCallback, useRef, useEffect } from 'react';
import { 
  CubeState, 
  ConnectionState, 
  CubeOrientation, 
  MoveEvent, 
  createSolvedCube,
  CubeFace,
  Facelets 
} from '@/types/cube';

// GAN Cube Bluetooth UUIDs - From official gan-web-bluetooth library
// Gen2 protocol (GAN356 i, GAN356 i Carry, GAN356 i3, etc.)
const GAN_GEN2_SERVICE = '6e400001-b5a3-f393-e0a9-e50e24dc4179';
const GAN_GEN2_COMMAND_CHARACTERISTIC = '28be4a4a-cd67-11e9-a32f-2a2ae2dbcce4';
const GAN_GEN2_STATE_CHARACTERISTIC = '28be4cb6-cd67-11e9-a32f-2a2ae2dbcce4';

// Gen3 protocol (GAN356 i Carry 2)
const GAN_GEN3_SERVICE = '8653000a-43e6-47b7-9cb0-5fc21d4ae340';
const GAN_GEN3_COMMAND_CHARACTERISTIC = '8653000c-43e6-47b7-9cb0-5fc21d4ae340';
const GAN_GEN3_STATE_CHARACTERISTIC = '8653000b-43e6-47b7-9cb0-5fc21d4ae340';

// Gen4 protocol (newer models like GAN12 ui Maglev)
const GAN_GEN4_SERVICE = '00000010-0000-fff7-fff6-fff5fff4fff0';
const GAN_GEN4_COMMAND_CHARACTERISTIC = '0000fff5-0000-1000-8000-00805f9b34fb';
const GAN_GEN4_STATE_CHARACTERISTIC = '0000fff6-0000-1000-8000-00805f9b34fb';

// Legacy service UUID (older cubes)
const GAN_LEGACY_SERVICE = '0000fff0-0000-1000-8000-00805f9b34fb';
const GAN_LEGACY_STATE_CHARACTERISTIC = '0000fff6-0000-1000-8000-00805f9b34fb';
const GAN_LEGACY_COMMAND_CHARACTERISTIC = '0000fff5-0000-1000-8000-00805f9b34fb';

interface UseCubeConnectionReturn {
  connectionState: ConnectionState;
  cubeState: CubeState;
  connect: () => Promise<void>;
  disconnect: () => void;
  resetCube: () => void;
  syncCube: () => void;
  error: string | null;
  deviceName: string | null;
}

export const useCubeConnection = (): UseCubeConnectionReturn => {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [cubeState, setCubeState] = useState<CubeState>({
    facelets: createSolvedCube(),
    orientation: { x: 0, y: 0, z: 0 },
    batteryLevel: 100,
    moveCount: 0,
    lastMove: null,
  });

  const deviceRef = useRef<BluetoothDevice | null>(null);
  const characteristicRef = useRef<BluetoothRemoteGATTCharacteristic | null>(null);
  const writeCharacteristicRef = useRef<BluetoothRemoteGATTCharacteristic | null>(null);
  
  // Gyro smoothing state - all useRefs must be declared together at top
  const gyroAccumulator = useRef({ x: 0, y: 0, z: 0 });
  const smoothedGyro = useRef({ x: 0, y: 0, z: 0 });
  const lastGyroUpdate = useRef(Date.now());

  // Face index mapping for GAN cubes
  const faceMap: CubeFace[] = ['U', 'R', 'F', 'D', 'L', 'B'];

  // Parse move data from GAN cube
  const parseMove = useCallback((data: DataView): MoveEvent | null => {
    try {
      // GAN cubes typically send move data in a specific format
      // The first few bytes indicate the move
      const moveIndex = data.getUint8(0);
      const face = faceMap[moveIndex % 6] || 'U';
      const direction = (moveIndex < 6) ? 1 : -1;
      const modifier = direction === -1 ? "'" : '';
      
      return {
        face,
        direction: direction as 1 | -1,
        notation: `${face}${modifier}`,
        timestamp: Date.now(),
      };
    } catch {
      return null;
    }
  }, []);
  
  // Parse orientation data (gyroscope) - V2 protocol
  // GAN cubes send gyro as 8-bit signed values (-128 to 127) at offsets 1,2,3 after message type
  const parseGyroData = useCallback((data: number[]): CubeOrientation | null => {
    try {
      // Message type 1 = gyro data in V2 protocol
      // Values are signed bytes representing angular velocity, not absolute angles
      const rawX = data[1] > 127 ? data[1] - 256 : data[1];
      const rawY = data[2] > 127 ? data[2] - 256 : data[2];
      const rawZ = data[3] > 127 ? data[3] - 256 : data[3];
      
      // Apply deadzone to filter noise (cube is stationary if values are small)
      const DEADZONE = 5;
      const x = Math.abs(rawX) < DEADZONE ? 0 : rawX;
      const y = Math.abs(rawY) < DEADZONE ? 0 : rawY;
      const z = Math.abs(rawZ) < DEADZONE ? 0 : rawZ;
      
      // If all values are in deadzone, no significant movement
      if (x === 0 && y === 0 && z === 0) {
        return null;
      }
      
      // Calculate time delta for integration
      const now = Date.now();
      const dt = Math.min((now - lastGyroUpdate.current) / 1000, 0.1); // Cap at 100ms
      lastGyroUpdate.current = now;
      
      // Integrate angular velocity to get angle change (scale factor tuned for GAN cubes)
      const SCALE = 0.5;
      gyroAccumulator.current.x += x * dt * SCALE;
      gyroAccumulator.current.y += y * dt * SCALE;
      gyroAccumulator.current.z += z * dt * SCALE;
      
      // Apply low-pass filter for smooth movement
      const SMOOTHING = 0.15;
      smoothedGyro.current.x += (gyroAccumulator.current.x - smoothedGyro.current.x) * SMOOTHING;
      smoothedGyro.current.y += (gyroAccumulator.current.y - smoothedGyro.current.y) * SMOOTHING;
      smoothedGyro.current.z += (gyroAccumulator.current.z - smoothedGyro.current.z) * SMOOTHING;
      
      return {
        x: smoothedGyro.current.x,
        y: smoothedGyro.current.y,
        z: smoothedGyro.current.z,
      };
    } catch {
      return null;
    }
  }, []);

  // Apply a move to the facelets
  const applyMove = useCallback((facelets: Facelets, move: MoveEvent): Facelets => {
    const newFacelets = [...facelets];
    const faceIndex = faceMap.indexOf(move.face);
    if (faceIndex === -1) return newFacelets;

    const offset = faceIndex * 9;
    const clockwise = move.direction === 1;

    // Rotate the face itself
    const face = newFacelets.slice(offset, offset + 9);
    const rotatedFace = clockwise
      ? [face[6], face[3], face[0], face[7], face[4], face[1], face[8], face[5], face[2]]
      : [face[2], face[5], face[8], face[1], face[4], face[7], face[0], face[3], face[6]];
    
    for (let i = 0; i < 9; i++) {
      newFacelets[offset + i] = rotatedFace[i];
    }

    // Rotate adjacent edges (simplified - full implementation would be more complex)
    // This is a placeholder - proper cube state tracking requires full permutation tables
    
    return newFacelets;
  }, []);

  // Handle incoming data from the cube (V2 protocol)
  const handleCharacteristicChange = useCallback((event: Event) => {
    const characteristic = event.target as BluetoothRemoteGATTCharacteristic;
    const value = characteristic.value;
    if (!value) return;

    // Convert to byte array for V2 protocol parsing
    const bytes: number[] = [];
    for (let i = 0; i < value.byteLength; i++) {
      bytes[i] = value.getUint8(i);
    }
    
    // V2 protocol message type is in first 4 bits of first byte
    const messageType = bytes[0] >> 4;
    
    // Message type 1 = Gyro data
    if (messageType === 1) {
      const orientation = parseGyroData(bytes);
      if (orientation) {
        setCubeState(prev => ({
          ...prev,
          orientation,
        }));
      }
      return;
    }
    
    // Message type 2 = Move data
    if (messageType === 2) {
      const data = new DataView(value.buffer);
      const move = parseMove(data);
      if (move) {
        setCubeState(prev => ({
          ...prev,
          lastMove: move,
          moveCount: prev.moveCount + 1,
          facelets: applyMove(prev.facelets, move),
        }));
      }
      return;
    }
    
    // Message type 4 = Facelet state
    // Message type 9 = Battery level
    if (messageType === 9 && bytes.length >= 2) {
      const battery = bytes[1];
      setCubeState(prev => ({
        ...prev,
        batteryLevel: battery,
      }));
    }
  }, [parseMove, parseGyroData, applyMove]);

  // Connect to the cube
  const connect = useCallback(async () => {
    if (!navigator.bluetooth) {
      setError('Web Bluetooth is not supported in this browser. Please use Chrome, Edge, or Opera.');
      return;
    }

    setConnectionState('connecting');
    setError(null);

    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [
          { namePrefix: 'GAN' },
          { namePrefix: 'Gan' },
          { namePrefix: 'gan' },
          { namePrefix: 'MG' }, // Monster Go
        ],
        optionalServices: [
          GAN_GEN2_SERVICE,
          GAN_GEN3_SERVICE,
          GAN_GEN4_SERVICE,
          GAN_LEGACY_SERVICE,
          '0000180f-0000-1000-8000-00805f9b34fb' // Battery service
        ],
      });

      deviceRef.current = device;
      setDeviceName(device.name || 'GAN Cube');

      device.addEventListener('gattserverdisconnected', () => {
        setConnectionState('disconnected');
        setDeviceName(null);
      });

      const server = await device.gatt?.connect();
      if (!server) throw new Error('Failed to connect to GATT server');

      // Try different service UUIDs in order of likelihood
      let service: BluetoothRemoteGATTService | null = null;
      let readCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;
      let protocolVersion = 'unknown';
      
      // Try Gen2 protocol first (most common for GAN i3, i Carry, etc.)
      try {
        console.log('Trying GAN Gen2 protocol...');
        service = await server.getPrimaryService(GAN_GEN2_SERVICE);
        readCharacteristic = await service.getCharacteristic(GAN_GEN2_STATE_CHARACTERISTIC);
        writeCharacteristicRef.current = await service.getCharacteristic(GAN_GEN2_COMMAND_CHARACTERISTIC);
        protocolVersion = 'gen2';
        console.log('Connected using Gen2 protocol');
      } catch {
        // Try Gen3 protocol
        try {
          console.log('Trying GAN Gen3 protocol...');
          service = await server.getPrimaryService(GAN_GEN3_SERVICE);
          readCharacteristic = await service.getCharacteristic(GAN_GEN3_STATE_CHARACTERISTIC);
          writeCharacteristicRef.current = await service.getCharacteristic(GAN_GEN3_COMMAND_CHARACTERISTIC);
          protocolVersion = 'gen3';
          console.log('Connected using Gen3 protocol');
        } catch {
          // Try Gen4 protocol
          try {
            console.log('Trying GAN Gen4 protocol...');
            service = await server.getPrimaryService(GAN_GEN4_SERVICE);
            readCharacteristic = await service.getCharacteristic(GAN_GEN4_STATE_CHARACTERISTIC);
            writeCharacteristicRef.current = await service.getCharacteristic(GAN_GEN4_COMMAND_CHARACTERISTIC);
            protocolVersion = 'gen4';
            console.log('Connected using Gen4 protocol');
          } catch {
            // Try Legacy protocol
            try {
              console.log('Trying GAN Legacy protocol...');
              service = await server.getPrimaryService(GAN_LEGACY_SERVICE);
              readCharacteristic = await service.getCharacteristic(GAN_LEGACY_STATE_CHARACTERISTIC);
              writeCharacteristicRef.current = await service.getCharacteristic(GAN_LEGACY_COMMAND_CHARACTERISTIC);
              protocolVersion = 'legacy';
              console.log('Connected using Legacy protocol');
            } catch (e4) {
              console.error('All protocols failed:', e4);
              throw new Error('Could not find GAN cube service. Make sure your cube is in pairing mode and try again.');
            }
          }
        }
      }

      if (!readCharacteristic) throw new Error('Could not find read characteristic');

      characteristicRef.current = readCharacteristic;

      // Start notifications
      await readCharacteristic.startNotifications();
      readCharacteristic.addEventListener('characteristicvaluechanged', handleCharacteristicChange);

      setConnectionState('connected');
    } catch (err) {
      console.error('Connection error:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect to cube');
      setConnectionState('disconnected');
    }
  }, [handleCharacteristicChange]);

  // Disconnect from the cube
  const disconnect = useCallback(() => {
    if (characteristicRef.current) {
      characteristicRef.current.removeEventListener('characteristicvaluechanged', handleCharacteristicChange);
    }
    if (deviceRef.current?.gatt?.connected) {
      deviceRef.current.gatt.disconnect();
    }
    deviceRef.current = null;
    characteristicRef.current = null;
    writeCharacteristicRef.current = null;
    setConnectionState('disconnected');
    setDeviceName(null);
  }, [handleCharacteristicChange]);

  // Reset cube state to solved
  const resetCube = useCallback(() => {
    setCubeState({
      facelets: createSolvedCube(),
      orientation: { x: 0, y: 0, z: 0 },
      batteryLevel: cubeState.batteryLevel,
      moveCount: 0,
      lastMove: null,
    });
  }, [cubeState.batteryLevel]);

  // Sync cube state (request current state from cube)
  const syncCube = useCallback(async () => {
    if (writeCharacteristicRef.current && connectionState === 'connected') {
      try {
        // Send sync request command to cube
        // GAN protocol: request current state
        const syncCommand = new Uint8Array([0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
        await writeCharacteristicRef.current.writeValue(syncCommand);
      } catch (err) {
        console.error('Sync error:', err);
      }
    }
  }, [connectionState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    connectionState,
    cubeState,
    connect,
    disconnect,
    resetCube,
    syncCube,
    error,
    deviceName,
  };
};
