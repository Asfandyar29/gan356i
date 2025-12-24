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
import { GanCubeDecoder, parseV2Data } from '@/lib/ganCrypto';

// GAN Cube Bluetooth UUIDs - V2 protocol (GAN356 i, GAN356 i Carry, GAN356 i3, etc.)
const GAN_SERVICE = '6e400001-b5a3-f393-e0a9-e50e24dc4179';
const GAN_WRITE_CHARACTERISTIC = '28be4a4a-cd67-11e9-a32f-2a2ae2dbcce4';
const GAN_READ_CHARACTERISTIC = '28be4cb6-cd67-11e9-a32f-2a2ae2dbcce4';

interface UseCubeConnectionReturn {
  connectionState: ConnectionState;
  cubeState: CubeState;
  connect: (macAddress?: string) => Promise<void>;
  disconnect: () => void;
  resetCube: () => void;
  syncCube: () => void;
  error: string | null;
  deviceName: string | null;
  macAddress: string | null;
  setMacAddress: (mac: string) => void;
}

export const useCubeConnection = (): UseCubeConnectionReturn => {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [macAddress, setMacAddressState] = useState<string | null>(() => {
    // Try to load saved MAC address
    if (typeof window !== 'undefined') {
      return localStorage.getItem('ganCubeMac') || null;
    }
    return null;
  });
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
  const decoderRef = useRef<GanCubeDecoder>(new GanCubeDecoder());
  const prevMoveCntRef = useRef<number>(-1);
  
  // Gyro smoothing state
  const gyroAccumulator = useRef({ x: 0, y: 0, z: 0 });
  const smoothedGyro = useRef({ x: 0, y: 0, z: 0 });
  const lastGyroUpdate = useRef(Date.now());

  // Face index mapping for GAN cubes
  const faceMap: CubeFace[] = ['U', 'R', 'F', 'D', 'L', 'B'];

  // Set MAC address and save to localStorage
  const setMacAddress = useCallback((mac: string) => {
    setMacAddressState(mac);
    if (typeof window !== 'undefined') {
      localStorage.setItem('ganCubeMac', mac);
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
    
    return newFacelets;
  }, []);

  // Process gyro data with smoothing
  const processGyroData = useCallback((rawX: number, rawY: number, rawZ: number): CubeOrientation | null => {
    // Apply deadzone to filter noise
    const DEADZONE = 8;
    const x = Math.abs(rawX) < DEADZONE ? 0 : rawX;
    const y = Math.abs(rawY) < DEADZONE ? 0 : rawY;
    const z = Math.abs(rawZ) < DEADZONE ? 0 : rawZ;
    
    // If all values are in deadzone, no significant movement
    if (x === 0 && y === 0 && z === 0) {
      return null;
    }
    
    // Calculate time delta for integration
    const now = Date.now();
    const dt = Math.min((now - lastGyroUpdate.current) / 1000, 0.1);
    lastGyroUpdate.current = now;
    
    // Integrate angular velocity
    const SCALE = 0.3;
    gyroAccumulator.current.x += x * dt * SCALE;
    gyroAccumulator.current.y += y * dt * SCALE;
    gyroAccumulator.current.z += z * dt * SCALE;
    
    // Apply low-pass filter
    const SMOOTHING = 0.12;
    smoothedGyro.current.x += (gyroAccumulator.current.x - smoothedGyro.current.x) * SMOOTHING;
    smoothedGyro.current.y += (gyroAccumulator.current.y - smoothedGyro.current.y) * SMOOTHING;
    smoothedGyro.current.z += (gyroAccumulator.current.z - smoothedGyro.current.z) * SMOOTHING;
    
    return {
      x: smoothedGyro.current.x,
      y: smoothedGyro.current.y,
      z: smoothedGyro.current.z,
    };
  }, []);

  // Handle incoming data from the cube
  const handleCharacteristicChange = useCallback((event: Event) => {
    const characteristic = event.target as BluetoothRemoteGATTCharacteristic;
    const value = characteristic.value;
    if (!value) return;

    // Decrypt the data
    const decryptedBytes = decoderRef.current.decode(value);
    
    // Parse V2 protocol data
    const parsed = parseV2Data(decryptedBytes, prevMoveCntRef.current);
    
    if (parsed.type === 1 && parsed.gyro) {
      // Gyro data
      const orientation = processGyroData(parsed.gyro.x, parsed.gyro.y, parsed.gyro.z);
      if (orientation) {
        setCubeState(prev => ({
          ...prev,
          orientation,
        }));
      }
    } else if (parsed.type === 2 && parsed.moves && parsed.moves.length > 0) {
      // Move data
      if (parsed.moveCount !== undefined) {
        prevMoveCntRef.current = parsed.moveCount;
      }
      
      // Process the most recent move
      const latestMove = parsed.moves[0];
      if (latestMove) {
        const face = latestMove.move.charAt(0) as CubeFace;
        const isPrime = latestMove.move.includes("'");
        
        const moveEvent: MoveEvent = {
          face,
          direction: isPrime ? -1 : 1,
          notation: latestMove.move,
          timestamp: Date.now(),
        };
        
        setCubeState(prev => ({
          ...prev,
          lastMove: moveEvent,
          moveCount: prev.moveCount + parsed.moves!.length,
          facelets: applyMove(prev.facelets, moveEvent),
        }));
      }
    } else if (parsed.type === 9 && parsed.battery !== undefined) {
      // Battery level
      setCubeState(prev => ({
        ...prev,
        batteryLevel: parsed.battery!,
      }));
    }
  }, [applyMove, processGyroData]);

  // Request cube state
  const requestCubeState = useCallback(async () => {
    if (writeCharacteristicRef.current) {
      try {
        // Request facelet state (command 4)
        const cmd = new Uint8Array([0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
        await writeCharacteristicRef.current.writeValue(cmd);
      } catch (e) {
        console.error('[GAN] Failed to request state:', e);
      }
    }
  }, []);

  // Request battery level
  const requestBattery = useCallback(async () => {
    if (writeCharacteristicRef.current) {
      try {
        const cmd = new Uint8Array([0x09, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
        await writeCharacteristicRef.current.writeValue(cmd);
      } catch (e) {
        console.error('[GAN] Failed to request battery:', e);
      }
    }
  }, []);

  // Connect to the cube
  const connect = useCallback(async (mac?: string) => {
    if (!navigator.bluetooth) {
      setError('Web Bluetooth is not supported. Please use Chrome, Edge, or Opera.');
      return;
    }

    const macToUse = mac || macAddress;
    if (!macToUse) {
      setError('MAC address is required. Find it at chrome://bluetooth-internals after connecting your cube.');
      return;
    }

    // Validate MAC format
    if (!/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/.test(macToUse)) {
      setError('Invalid MAC address format. Use XX:XX:XX:XX:XX:XX');
      return;
    }

    setConnectionState('connecting');
    setError(null);

    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [
          { namePrefix: 'GAN' },
          { namePrefix: 'Gan' },
          { namePrefix: 'MG' },
        ],
        optionalServices: [GAN_SERVICE],
      });

      deviceRef.current = device;
      setDeviceName(device.name || 'GAN Cube');

      device.addEventListener('gattserverdisconnected', () => {
        setConnectionState('disconnected');
        setDeviceName(null);
        prevMoveCntRef.current = -1;
      });

      const server = await device.gatt?.connect();
      if (!server) throw new Error('Failed to connect to GATT server');

      // Get the V2 service
      const service = await server.getPrimaryService(GAN_SERVICE);
      
      // Get characteristics
      const readCharacteristic = await service.getCharacteristic(GAN_READ_CHARACTERISTIC);
      writeCharacteristicRef.current = await service.getCharacteristic(GAN_WRITE_CHARACTERISTIC);
      characteristicRef.current = readCharacteristic;

      // Initialize decoder with MAC address
      const decoderInitialized = decoderRef.current.initDecoder(macToUse);
      if (!decoderInitialized) {
        console.warn('[GAN] Decoder init failed, data may be encrypted');
      }

      // Save MAC address
      setMacAddress(macToUse);

      // Start notifications
      await readCharacteristic.startNotifications();
      readCharacteristic.addEventListener('characteristicvaluechanged', handleCharacteristicChange);

      setConnectionState('connected');
      
      // Request initial state
      setTimeout(() => {
        requestCubeState();
        requestBattery();
      }, 500);

    } catch (err) {
      console.error('Connection error:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect to cube');
      setConnectionState('disconnected');
    }
  }, [handleCharacteristicChange, macAddress, requestBattery, requestCubeState, setMacAddress]);

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
    prevMoveCntRef.current = -1;
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
    // Reset gyro accumulators
    gyroAccumulator.current = { x: 0, y: 0, z: 0 };
    smoothedGyro.current = { x: 0, y: 0, z: 0 };
  }, [cubeState.batteryLevel]);

  // Sync cube state
  const syncCube = useCallback(async () => {
    if (connectionState === 'connected') {
      await requestCubeState();
      await requestBattery();
    }
  }, [connectionState, requestBattery, requestCubeState]);

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
    macAddress,
    setMacAddress,
  };
};
