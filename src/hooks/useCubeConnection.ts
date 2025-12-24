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

// GAN Cube Bluetooth UUIDs (common for GAN smart cubes)
const GAN_SERVICE_UUID = '0000fff0-0000-1000-8000-00805f9b34fb';
const GAN_CHARACTERISTIC_UUID = '0000fff6-0000-1000-8000-00805f9b34fb';
const GAN_WRITE_UUID = '0000fff5-0000-1000-8000-00805f9b34fb';

// Alternative UUIDs for different GAN cube models
const GAN_SERVICE_UUID_V2 = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const GAN_READ_UUID_V2 = '28be4cb6-cd67-11e9-a32f-2a2ae2dbcce4';
const GAN_WRITE_UUID_V2 = '28be4a4a-cd67-11e9-a32f-2a2ae2dbcce4';

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

  // Parse orientation data (gyroscope)
  const parseOrientation = useCallback((data: DataView): CubeOrientation => {
    try {
      // GAN cubes send gyro data as 3 signed 16-bit integers
      // Typically at specific offsets in the data packet
      const x = data.getInt16(2, true) / 100;
      const y = data.getInt16(4, true) / 100;
      const z = data.getInt16(6, true) / 100;
      return { x, y, z };
    } catch {
      return { x: 0, y: 0, z: 0 };
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

  // Handle incoming data from the cube
  const handleCharacteristicChange = useCallback((event: Event) => {
    const characteristic = event.target as BluetoothRemoteGATTCharacteristic;
    const value = characteristic.value;
    if (!value) return;

    const data = new DataView(value.buffer);
    
    // Parse the incoming data based on GAN protocol
    const messageType = data.getUint8(0);
    
    // Different message types from GAN cubes
    if (messageType < 12) {
      // Move event
      const move = parseMove(data);
      if (move) {
        setCubeState(prev => ({
          ...prev,
          lastMove: move,
          moveCount: prev.moveCount + 1,
          facelets: applyMove(prev.facelets, move),
        }));
      }
    } else if (data.byteLength >= 8) {
      // Orientation/gyro data
      const orientation = parseOrientation(data);
      setCubeState(prev => ({
        ...prev,
        orientation,
      }));
    }
  }, [parseMove, parseOrientation, applyMove]);

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
          GAN_SERVICE_UUID, 
          GAN_SERVICE_UUID_V2,
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

      // Try different service UUIDs
      let service: BluetoothRemoteGATTService | null = null;
      let readCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;
      
      try {
        service = await server.getPrimaryService(GAN_SERVICE_UUID);
        readCharacteristic = await service.getCharacteristic(GAN_CHARACTERISTIC_UUID);
        writeCharacteristicRef.current = await service.getCharacteristic(GAN_WRITE_UUID);
      } catch {
        try {
          service = await server.getPrimaryService(GAN_SERVICE_UUID_V2);
          readCharacteristic = await service.getCharacteristic(GAN_READ_UUID_V2);
          writeCharacteristicRef.current = await service.getCharacteristic(GAN_WRITE_UUID_V2);
        } catch (e2) {
          throw new Error('Could not find GAN cube service. Make sure your cube is in pairing mode.');
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
