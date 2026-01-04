// Cube face colors
export type CubeColor = 'white' | 'yellow' | 'green' | 'blue' | 'red' | 'orange';

// Standard cube face identifiers
export type CubeFace = 'U' | 'D' | 'F' | 'B' | 'L' | 'R';

// Cube move notation
export type CubeMove = 'U' | 'U\'' | 'U2' | 'D' | 'D\'' | 'D2' |
  'F' | 'F\'' | 'F2' | 'B' | 'B\'' | 'B2' |
  'L' | 'L\'' | 'L2' | 'R' | 'R\'' | 'R2';

// Facelets state - 54 stickers (9 per face, 6 faces)
// Order: U (0-8), R (9-17), F (18-26), D (27-35), L (36-44), B (45-53)
export type Facelets = CubeColor[];

// Gyroscope/orientation data
export interface CubeOrientation {
  x: number;  // Roll (Euler)
  y: number;  // Pitch (Euler)
  z: number;  // Yaw (Euler)
  quaternion?: {
    x: number;
    y: number;
    z: number;
    w: number;
  };
}

// Timer state
export type TimerState = 'idle' | 'ready' | 'running' | 'stopped';

// Cube connection state
export type ConnectionState = 'disconnected' | 'connecting' | 'connected';

// Move event from cube
export interface MoveEvent {
  face: CubeFace;
  direction: 1 | -1;  // 1 = clockwise, -1 = counter-clockwise
  notation: string;
  timestamp: number;
}

// Full cube state
export interface CubeState {
  facelets: Facelets;
  orientation: CubeOrientation;
  batteryLevel: number;
  moveCount: number;
  lastMove: MoveEvent | null;
  moveHistory: MoveEvent[];
}

// Create solved cube state
export const createSolvedCube = (): Facelets => {
  const colors: CubeColor[] = ['white', 'red', 'green', 'yellow', 'orange', 'blue'];
  return colors.flatMap(color => Array(9).fill(color));
};

// Check if cube is solved
export const isCubeSolved = (facelets: Facelets): boolean => {
  for (let face = 0; face < 6; face++) {
    const startIdx = face * 9;
    const faceColor = facelets[startIdx];
    for (let i = 1; i < 9; i++) {
      if (facelets[startIdx + i] !== faceColor) {
        return false;
      }
    }
  }
  return true;
};

// Generate a random scramble (20 moves)
export const generateScramble = (): string[] => {
  const faces: CubeFace[] = ['U', 'D', 'F', 'B', 'L', 'R'];
  const modifiers = ['', "'", '2'];
  const scramble: string[] = [];
  let lastFace: CubeFace | null = null;
  let secondLastFace: CubeFace | null = null;

  for (let i = 0; i < 20; i++) {
    let face: CubeFace;
    do {
      face = faces[Math.floor(Math.random() * faces.length)];
    } while (
      face === lastFace ||
      (face === secondLastFace && isOppositeFace(face, lastFace!))
    );

    const modifier = modifiers[Math.floor(Math.random() * modifiers.length)];
    scramble.push(face + modifier);

    secondLastFace = lastFace;
    lastFace = face;
  }

  return scramble;
};

const isOppositeFace = (a: CubeFace, b: CubeFace): boolean => {
  const opposites: Record<CubeFace, CubeFace> = {
    'U': 'D', 'D': 'U',
    'F': 'B', 'B': 'F',
    'L': 'R', 'R': 'L'
  };
  return opposites[a] === b;
};

// Format time in mm:ss.ms format
export const formatTime = (ms: number): string => {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const milliseconds = Math.floor((ms % 1000) / 10);

  if (minutes > 0) {
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
  }
  return `${seconds}.${milliseconds.toString().padStart(2, '0')}`;
};
