import { useState, useCallback, useRef, useEffect } from 'react';
import { 
  CubeState, 
  ConnectionState, 
  CubeOrientation, 
  MoveEvent, 
  createSolvedCube,
  CubeFace,
  Facelets,
  CubeColor
} from '@/types/cube';
import { connectGanCube, GanCubeConnection, GanCubeEvent } from 'gan-web-bluetooth';
import { Subscription } from 'rxjs';

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
  clearMacAddress: () => void;
  needsMacAddress: boolean;
  pendingDeviceName: string | null;
  confirmMacAddress: (mac: string) => void;
  cancelConnection: () => void;
}

// Convert Kociemba notation facelets string to our color array
// Kociemba format: UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB
const kociembaToFacelets = (kociemba: string): Facelets => {
  const colorMap: Record<string, CubeColor> = {
    'U': 'white',   // Up = White
    'R': 'red',     // Right = Red
    'F': 'green',   // Front = Green
    'D': 'yellow',  // Down = Yellow
    'L': 'orange',  // Left = Orange
    'B': 'blue',    // Back = Blue
  };
  
  return kociemba.split('').map(c => colorMap[c] || 'white') as Facelets;
};

// Convert quaternion to Euler angles for 3D visualization
const quaternionToEuler = (q: { x: number; y: number; z: number; w: number }): CubeOrientation => {
  // Convert quaternion to Euler angles (in degrees)
  const sinr_cosp = 2 * (q.w * q.x + q.y * q.z);
  const cosr_cosp = 1 - 2 * (q.x * q.x + q.y * q.y);
  const roll = Math.atan2(sinr_cosp, cosr_cosp);

  const sinp = 2 * (q.w * q.y - q.z * q.x);
  const pitch = Math.abs(sinp) >= 1 ? Math.sign(sinp) * Math.PI / 2 : Math.asin(sinp);

  const siny_cosp = 2 * (q.w * q.z + q.x * q.y);
  const cosy_cosp = 1 - 2 * (q.y * q.y + q.z * q.z);
  const yaw = Math.atan2(siny_cosp, cosy_cosp);

  // Convert to degrees
  const toDeg = 180 / Math.PI;
  return {
    x: roll * toDeg,
    y: pitch * toDeg,
    z: yaw * toDeg,
  };
};

export const useCubeConnection = (): UseCubeConnectionReturn => {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [macAddress, setMacAddressState] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ganCubeMac');
      // Validate that it's a proper MAC address string
      if (saved && typeof saved === 'string' && /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/.test(saved)) {
        return saved;
      }
      // Clear invalid value
      localStorage.removeItem('ganCubeMac');
      return null;
    }
    return null;
  });
  const [needsMacAddress, setNeedsMacAddress] = useState(false);
  const [pendingDeviceName, setPendingDeviceName] = useState<string | null>(null);
  const [cubeState, setCubeState] = useState<CubeState>({
    facelets: createSolvedCube(),
    orientation: { x: 0, y: 0, z: 0 },
    batteryLevel: 100,
    moveCount: 0,
    lastMove: null,
  });

  const connectionRef = useRef<GanCubeConnection | null>(null);
  const subscriptionRef = useRef<Subscription | null>(null);
  const moveCountRef = useRef(0);
  const macResolverRef = useRef<((mac: string | null) => void) | null>(null);

  // Set MAC address and save to localStorage
  const setMacAddress = useCallback((mac: string) => {
    setMacAddressState(mac);
    if (typeof window !== 'undefined' && mac) {
      localStorage.setItem('ganCubeMac', mac);
    }
  }, []);

  // Clear MAC address
  const clearMacAddress = useCallback(() => {
    setMacAddressState(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('ganCubeMac');
    }
  }, []);

  // Handle cube events
  const handleCubeEvent = useCallback((event: GanCubeEvent) => {
    switch (event.type) {
      case 'FACELETS':
        setCubeState(prev => ({
          ...prev,
          facelets: kociembaToFacelets(event.facelets),
        }));
        break;

      case 'MOVE':
        moveCountRef.current++;
        // Swap F↔B and L↔R to match virtual cube orientation
        // Original: URFDLB (indices 0=U, 1=R, 2=F, 3=D, 4=L, 5=B)
        // Swapped:  URBDLF (F↔B at indices 2↔5, L↔R stays but we need opposite swap)
        const faceMapping = 'URBDLF';
        const face = faceMapping.charAt(event.face) as CubeFace;
        const moveEvent: MoveEvent = {
          face,
          direction: event.direction === 0 ? 1 : -1,
          notation: event.move,
          timestamp: event.timestamp,
        };
        setCubeState(prev => ({
          ...prev,
          moveCount: moveCountRef.current,
          lastMove: moveEvent,
        }));
        break;

      case 'GYRO':
        const orientation = quaternionToEuler(event.quaternion);
        setCubeState(prev => ({
          ...prev,
          orientation,
        }));
        break;

      case 'BATTERY':
        setCubeState(prev => ({
          ...prev,
          batteryLevel: event.batteryLevel,
        }));
        break;

      case 'DISCONNECT':
        setConnectionState('disconnected');
        setDeviceName(null);
        break;
    }
  }, []);

  // Custom MAC address provider
  const customMacAddressProvider = useCallback(async (
    device: BluetoothDevice, 
    isFallbackCall?: boolean
  ): Promise<string | null> => {
    // If we have a saved MAC address, try it first
    const savedMac = localStorage.getItem('ganCubeMac');
    if (!isFallbackCall && savedMac) {
      return savedMac;
    }

    // If this is a fallback call, we need to ask the user for the MAC address
    if (isFallbackCall) {
      setPendingDeviceName(device.name || 'GAN Cube');
      setNeedsMacAddress(true);
      
      // Return a promise that will be resolved when user provides MAC
      return new Promise<string | null>((resolve) => {
        macResolverRef.current = resolve;
      });
    }

    return null;
  }, []);

  // Confirm MAC address from user
  const confirmMacAddress = useCallback((mac: string) => {
    setMacAddress(mac);
    setNeedsMacAddress(false);
    setPendingDeviceName(null);
    if (macResolverRef.current) {
      macResolverRef.current(mac);
      macResolverRef.current = null;
    }
  }, [setMacAddress]);

  // Cancel connection
  const cancelConnection = useCallback(() => {
    setNeedsMacAddress(false);
    setPendingDeviceName(null);
    setConnectionState('disconnected');
    if (macResolverRef.current) {
      macResolverRef.current(null);
      macResolverRef.current = null;
    }
  }, []);

  // Connect to the cube
  const connect = useCallback(async (providedMac?: string) => {
    if (!navigator.bluetooth) {
      setError('Web Bluetooth is not supported. Please use Chrome, Edge, or Opera.');
      return;
    }

    // If MAC is provided directly, save it
    if (providedMac) {
      setMacAddress(providedMac);
    }

    setConnectionState('connecting');
    setError(null);

    try {
      const conn = await connectGanCube(customMacAddressProvider);
      
      connectionRef.current = conn;
      setDeviceName(conn.deviceName);
      
      // Save the MAC address from the connection
      if (conn.deviceMAC) {
        setMacAddress(conn.deviceMAC);
      }
      
      // Subscribe to events
      subscriptionRef.current = conn.events$.subscribe({
        next: handleCubeEvent,
        error: (err) => {
          console.error('[GAN] Event error:', err);
          setError('Connection lost');
          setConnectionState('disconnected');
        },
      });

      setConnectionState('connected');
      
      // Request initial state
      await conn.sendCubeCommand({ type: 'REQUEST_FACELETS' });
      await conn.sendCubeCommand({ type: 'REQUEST_BATTERY' });
      await conn.sendCubeCommand({ type: 'REQUEST_HARDWARE' });

    } catch (err) {
      console.error('Connection error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect to cube';
      setError(errorMessage);
      setConnectionState('disconnected');
      setNeedsMacAddress(false);
      setPendingDeviceName(null);
    }
  }, [handleCubeEvent, customMacAddressProvider, setMacAddress]);

  // Disconnect from the cube
  const disconnect = useCallback(async () => {
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
    }
    if (connectionRef.current) {
      await connectionRef.current.disconnect();
      connectionRef.current = null;
    }
    setConnectionState('disconnected');
    setDeviceName(null);
  }, []);

  // Reset cube state to solved
  const resetCube = useCallback(() => {
    moveCountRef.current = 0;
    setCubeState({
      facelets: createSolvedCube(),
      orientation: { x: 0, y: 0, z: 0 },
      batteryLevel: cubeState.batteryLevel,
      moveCount: 0,
      lastMove: null,
    });
    
    // Also reset the cube's internal state
    if (connectionRef.current) {
      connectionRef.current.sendCubeCommand({ type: 'REQUEST_RESET' });
    }
  }, [cubeState.batteryLevel]);

  // Sync cube state
  const syncCube = useCallback(async () => {
    if (connectionRef.current) {
      await connectionRef.current.sendCubeCommand({ type: 'REQUEST_FACELETS' });
      await connectionRef.current.sendCubeCommand({ type: 'REQUEST_BATTERY' });
    }
  }, []);

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
    clearMacAddress,
    needsMacAddress,
    pendingDeviceName,
    confirmMacAddress,
    cancelConnection,
  };
};
