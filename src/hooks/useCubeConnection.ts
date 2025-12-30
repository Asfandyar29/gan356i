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
  connect: () => Promise<void>;
  disconnect: () => void;
  resetCube: () => void;
  syncCube: () => void;
  error: string | null;
  deviceName: string | null;
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
        const face = 'URFDLB'.charAt(event.face) as CubeFace;
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

  // Connect to the cube
  const connect = useCallback(async () => {
    if (!navigator.bluetooth) {
      setError('Web Bluetooth is not supported. Please use Chrome, Edge, or Opera.');
      return;
    }

    setConnectionState('connecting');
    setError(null);

    try {
      const conn = await connectGanCube();
      
      connectionRef.current = conn;
      setDeviceName(conn.deviceName);
      
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
      setError(err instanceof Error ? err.message : 'Failed to connect to cube');
      setConnectionState('disconnected');
    }
  }, [handleCubeEvent]);

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
  };
};
