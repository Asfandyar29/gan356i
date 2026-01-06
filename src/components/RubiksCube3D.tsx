import { useRef, useMemo, useState, useEffect, useCallback } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls, RoundedBox, MeshReflectorMaterial, ContactShadows, Environment, Float } from '@react-three/drei';
import * as THREE from 'three';
import { Facelets, CubeColor, CubeOrientation, MoveEvent } from '@/types/cube';
import AxisCalibration, { AxisConfig, loadAxisConfig } from './AxisCalibration';
import { applyMove } from '@/lib/cube-solver';

// Scramble Arrow Component
const ScrambleArrow = ({ move }: { move: string }) => {
  const groupRef = useRef<THREE.Group>(null);

  const face = move[0];
  const modifier = move.length > 1 ? move[1] : '';
  const isCCW = modifier === "'";
  const isDouble = modifier === '2';

  const color = "#00FF00"; // Green arrow
  const arcRadius = 1.0;
  const tubeRadius = 0.08;

  const validFaces = ['U', 'D', 'F', 'B', 'L', 'R'];
  if (!validFaces.includes(face)) return null;

  let position: [number, number, number] = [0, 0, 0];
  let rotation: [number, number, number] = [0, 0, 0];
  const offset = 2.2;

  switch (face) {
    case 'F': position = [0, 0, offset]; rotation = [0, 0, 0]; break;
    case 'B': position = [0, 0, -offset]; rotation = [0, Math.PI, 0]; break;
    case 'U': position = [0, offset, 0]; rotation = [-Math.PI / 2, 0, 0]; break;
    case 'D': position = [0, -offset, 0]; rotation = [Math.PI / 2, 0, 0]; break;
    case 'R': position = [offset, 0, 0]; rotation = [0, Math.PI / 2, 0]; break;
    case 'L': position = [-offset, 0, 0]; rotation = [0, -Math.PI / 2, 0]; break;
  }

  return (
    <group position={position} rotation={rotation as any}>
      <group scale={[1, 1, 1]} rotation={[0, 0, isCCW ? Math.PI / 2 : 0]}>
        <ArrowArc isCCW={isCCW} isDouble={isDouble} color={color} radius={arcRadius} tube={tubeRadius} />
      </group>
    </group>
  );
};

const ArrowArc = ({ isCCW, isDouble, color, radius, tube }: any) => {
  const arcLen = isDouble ? Math.PI : Math.PI / 1.5;

  return (
    <group rotation={[0, 0, 0]}>
      <group rotation={[0, 0, Math.PI / 2]}>
        <mesh rotation={[0, 0, isCCW ? 0 : -arcLen]}>
          <torusGeometry args={[radius, tube, 8, 32, arcLen]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} />
        </mesh>

        <group rotation={[0, 0, isCCW ? arcLen : -arcLen]}>
          <mesh position={[radius, 0, 0]} rotation={[0, 0, isCCW ? 0 : Math.PI]}>
            <coneGeometry args={[tube * 2.5, tube * 4, 16]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

// Check WebGL support
const isWebGLAvailable = (): boolean => {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
};

// Map cube colors to hex values - matching GAN cube stickerless colors
const colorMap: Record<CubeColor, string> = {
  white: '#FFFFFF',
  yellow: '#FEDD00',
  green: '#00A550',
  blue: '#0046AD',
  red: '#C41E3A',
  orange: '#FF5F00',
};

// Easing function for smoother animations
const easeInOutCubic = (t: number): number => {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

const GanLogo = () => {
  const texture = useLoader(THREE.TextureLoader, '/gan-logo.png');

  return (
    <mesh position={[0, 0, 0.01]} rotation={[0, 0, 0]}>
      <planeGeometry args={[0.6, 0.6]} />
      <meshBasicMaterial
        map={texture}
        transparent={true}
        polygonOffset={true}
        polygonOffsetFactor={-1}
      />
    </mesh>
  );
};

interface CubeletProps {
  position: [number, number, number];
  colors: (CubeColor | null)[];
  isCenter?: boolean;
  animationRotation?: { axis: 'x' | 'y' | 'z'; angle: number } | null;
  persistentRotation?: { axis: 'x' | 'y' | 'z'; angle: number } | null;
}

const Cubelet = ({ position, colors, isCenter = false, animationRotation, persistentRotation }: CubeletProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const size = 0.95;
  const stickerOffset = 0.48;
  const stickerSize = 0.82;
  const stickerThickness = 0.015;
  const stickerRadius = 0.1;

  // Store the initial position for this render cycle
  const basePosition = useRef(position);
  // Store colors - only update when NOT animating to prevent flashing
  const displayColors = useRef(colors);

  // Update base position and colors only when not animating
  useEffect(() => {
    if (!animationRotation) {
      basePosition.current = position;
      displayColors.current = colors;
    }
  }, [position, colors, animationRotation]);

  // Apply animation and persistent rotation
  useFrame(() => {
    if (groupRef.current) {
      const q = new THREE.Quaternion();

      // Base persistent rotation (for centers)
      if (persistentRotation) {
        const { axis, angle } = persistentRotation;
        const axisVec = new THREE.Vector3(
          axis === 'x' ? 1 : 0,
          axis === 'y' ? 1 : 0,
          axis === 'z' ? 1 : 0
        );
        q.setFromAxisAngle(axisVec, angle);
      }

      // Active move animation offset
      const activeQ = new THREE.Quaternion();
      if (animationRotation) {
        const { axis, angle } = animationRotation;
        const axisVec = new THREE.Vector3(
          axis === 'x' ? 1 : 0,
          axis === 'y' ? 1 : 0,
          axis === 'z' ? 1 : 0
        );
        activeQ.setFromAxisAngle(axisVec, angle);

        // Multiplicative rotation (animation is around world axes in this simulator)
        q.premultiply(activeQ);
      }

      // Use the stored base position for animation calculations
      const pos = new THREE.Vector3(...basePosition.current);
      // Pieces being animated move along their layer arc in world space
      if (animationRotation) {
        pos.applyQuaternion(activeQ);
      }

      groupRef.current.position.copy(pos);
      groupRef.current.quaternion.copy(q);
    }
  });

  // Face directions and rotations
  const faceDirections: [number, number, number][] = [
    [1, 0, 0],   // Right
    [-1, 0, 0],  // Left
    [0, 1, 0],   // Up
    [0, -1, 0],  // Down
    [0, 0, 1],   // Front
    [0, 0, -1],  // Back
  ];

  const faceRotations: [number, number, number][] = [
    [0, Math.PI / 2, 0],  // Right
    [0, -Math.PI / 2, 0], // Left
    [-Math.PI / 2, 0, 0], // Up
    [Math.PI / 2, 0, 0],  // Down
    [0, 0, 0],            // Front
    [0, Math.PI, 0],      // Back
  ];

  // Use the stored colors to prevent flashing during animation
  const colorsToRender = animationRotation ? displayColors.current : colors;

  return (
    <group ref={groupRef} position={position}>
      <RoundedBox args={[size, size, size]} radius={0.08} smoothness={4}>
        <meshStandardMaterial color="#1a1a1a" />
      </RoundedBox>

      {colorsToRender.map((color, index) => {
        if (!color) return null;

        const displayColor = colorMap[color];
        const dir = faceDirections[index];
        const rot = faceRotations[index];
        const stickerPos: [number, number, number] = [
          dir[0] * stickerOffset,
          dir[1] * stickerOffset,
          dir[2] * stickerOffset,
        ];

        const isWhiteCenter = isCenter && color === 'white' && index === 2;

        return (
          <group key={index} position={stickerPos} rotation={rot}>
            <RoundedBox args={[stickerSize, stickerSize, stickerThickness]} radius={stickerRadius} smoothness={4}>
              <meshStandardMaterial
                color={displayColor}
                roughness={0.3}
                metalness={0.1}
              />
            </RoundedBox>
            {isWhiteCenter && <GanLogo />}
          </group>
        );
      })}
    </group>
  );
};

// ... (GanLogo remains same)

interface AnimatingLayer {
  face: string;
  direction: 1 | -1;
}

interface CubeGroupProps {
  facelets: Facelets;
  orientation: CubeOrientation;
  axisConfig: AxisConfig;
  lastMove: MoveEvent | null;
  nextMove?: string | null;
}

// Normalize angle to prevent sudden jumps (keeps angle in -180 to 180 range)
const normalizeAngle = (angle: number): number => {
  while (angle > 180) angle -= 360;
  while (angle < -180) angle += 360;
  return angle;
};

// Rotation Direction Factors for Standard CW Moves -> World Axis Rotation
// U: -Y (-1), D: +Y (1), R: -X (-1), L: +X (1), F: -Z (-1), B: +Z (1)
const FACE_ROTATION_SIGNS: Record<string, number> = {
  U: -1,
  D: 1,
  R: -1,
  L: 1,
  F: -1,
  B: 1,
};

// Smooth angle interpolation that handles wraparound
const lerpAngle = (current: number, target: number, factor: number): number => {
  let diff = target - current;

  // Handle wraparound - take the shortest path
  if (diff > Math.PI) diff -= 2 * Math.PI;
  if (diff < -Math.PI) diff += 2 * Math.PI;

  return current + diff * factor;
};

const CubeGroup = ({ facelets, orientation, axisConfig, lastMove, nextMove }: CubeGroupProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const currentRotation = useRef({ x: 0, y: 0, z: 0 });

  // State for internal cube visualization
  const [displayFacelets, setDisplayFacelets] = useState<Facelets>(facelets);
  const [animatingLayer, setAnimatingLayer] = useState<AnimatingLayer | null>(null);
  const [centerRotations, setCenterRotations] = useState<Record<string, number>>({
    U: 0, D: 0, L: 0, R: 0, F: 0, B: 0
  });

  const moveQueue = useRef<AnimatingLayer[]>([]);
  const animationProgress = useRef(0);
  const lastProcessedMoveTimestamp = useRef<number | null>(null);
  // Store a counter to force re-render when animation completes
  const [animationTick, setAnimationTick] = useState(0);

  // Sync with prop facelets when no animations are pending/active
  useEffect(() => {
    // Check if there's a new move that we haven't started animating yet
    // This prevents the "color flash" where the cube state updates before the animation starts
    const isNewMove = lastMove && lastMove.timestamp !== lastProcessedMoveTimestamp.current;

    if (!animatingLayer && moveQueue.current.length === 0 && !isNewMove) {
      setDisplayFacelets(facelets);
    }
  }, [facelets, animatingLayer, lastMove]);

  // Handle new incoming moves from props
  useEffect(() => {
    if (lastMove && lastMove.timestamp !== lastProcessedMoveTimestamp.current) {
      lastProcessedMoveTimestamp.current = lastMove.timestamp;
      moveQueue.current.push({
        face: lastMove.face,
        direction: lastMove.direction,
      });
    }
  }, [lastMove]);

  useFrame((_, delta) => {
    // Process the animation queue
    if (animatingLayer) {
      // Speed up animation if queue is building up, but keep it slower by default
      const baseSpeed = 3.5; // Reduced from 8 for smoothness
      const speedMultiplier = Math.min(1 + moveQueue.current.length * 0.5, 3);
      animationProgress.current += delta * baseSpeed * speedMultiplier;

      if (animationProgress.current >= 1) {
        // Finish current animation - apply the move to facelets
        setDisplayFacelets(prev => applyMove(prev, animatingLayer.face as any, animatingLayer.direction));
        setAnimatingLayer(null);
        animationProgress.current = 0;
        setAnimationTick(t => t + 1); // Force re-render
      }
    } else if (moveQueue.current.length > 0) {
      // Start next move in queue
      const nextMoveData = moveQueue.current.shift()!;

      // Update center rotations for visual persistence
      const sign = FACE_ROTATION_SIGNS[nextMoveData.face] || 1;
      setCenterRotations(prev => ({
        ...prev,
        [nextMoveData.face]: prev[nextMoveData.face] + (nextMoveData.direction * sign * (Math.PI / 2))
      }));

      setAnimatingLayer(nextMoveData);
      animationProgress.current = 0;
    }

    // Handle orientation updates with frame-rate independent smoothing
    if (groupRef.current) {
      // Smoothing factor - lower is smoother/more "liquid", higher is more responsive
      // 0.05 means 95% of the distance is covered in ~3 seconds (very slow)
      // 0.0001 means very responsive
      const smoothingFactor = 0.001;
      const t = 1 - Math.pow(smoothingFactor, delta);

      if (orientation.quaternion && axisConfig.gyroEnabled) {
        const { x, y, z, w } = orientation.quaternion;
        let targetQ = new THREE.Quaternion(x, z, -y, w);

        if (axisConfig.offsetQuaternion) {
          const { x: ox, y: oy, z: oz, w: ow } = axisConfig.offsetQuaternion;
          const offsetQ = new THREE.Quaternion(ox, oy, oz, ow);
          const rawQ = new THREE.Quaternion(x, y, z, w);
          const correctedRaw = offsetQ.clone().multiply(rawQ);
          targetQ.set(correctedRaw.x, correctedRaw.z, -correctedRaw.y, correctedRaw.w);
        }

        // Use frame-rate independent slerp
        groupRef.current.quaternion.slerp(targetQ, t);
      } else if (axisConfig.gyroEnabled && !orientation.quaternion) {
        const sourceValues = { x: orientation.x, y: orientation.y, z: orientation.z };
        let xVal = (sourceValues[axisConfig.xSource] + axisConfig.offsetX) * (axisConfig.xInvert ? -1 : 1);
        let yVal = (sourceValues[axisConfig.ySource] + axisConfig.offsetY) * (axisConfig.yInvert ? -1 : 1);
        let zVal = (sourceValues[axisConfig.zSource] + axisConfig.offsetZ) * (axisConfig.zInvert ? -1 : 1);

        xVal = normalizeAngle(xVal);
        yVal = normalizeAngle(yVal);
        zVal = normalizeAngle(zVal);

        const targetX = xVal * (Math.PI / 180);
        const targetY = yVal * (Math.PI / 180);
        const targetZ = zVal * (Math.PI / 180);

        // Use frame-rate independent lerp
        currentRotation.current.x = lerpAngle(currentRotation.current.x, targetX, t);
        currentRotation.current.y = lerpAngle(currentRotation.current.y, targetY, t);
        currentRotation.current.z = lerpAngle(currentRotation.current.z, targetZ, t);

        groupRef.current.rotation.set(currentRotation.current.x, currentRotation.current.y, currentRotation.current.z);
      }
    }
  });

  // Generate cubelet data from facelets
  const cubelets = useMemo(() => {
    const result: {
      position: [number, number, number];
      colors: (CubeColor | null)[];
      isCenter: boolean;
      persistentRotation: { axis: 'x' | 'y' | 'z'; angle: number } | null;
    }[] = [];

    // Position offsets for 3x3 cube
    const offsets = [-1, 0, 1];

    for (let y = 0; y < 3; y++) {
      for (let z = 0; z < 3; z++) {
        for (let x = 0; x < 3; x++) {
          // Skip center cubes (not visible)
          if (x === 1 && y === 1 && z === 1) continue;

          const position: [number, number, number] = [offsets[x], offsets[2 - y], offsets[2 - z]];
          const colors: (CubeColor | null)[] = [null, null, null, null, null, null];

          // Check if this is a face center piece
          const isCenter = (x === 1 && y === 1) || (y === 1 && z === 1) || (x === 1 && z === 1);

          let persistentRotation: { axis: 'x' | 'y' | 'z'; angle: number } | null = null;
          if (isCenter) {
            if (position[1] === 1) persistentRotation = { axis: 'y', angle: centerRotations.U };
            else if (position[1] === -1) persistentRotation = { axis: 'y', angle: centerRotations.D };
            else if (position[0] === 1) persistentRotation = { axis: 'x', angle: centerRotations.R };
            else if (position[0] === -1) persistentRotation = { axis: 'x', angle: centerRotations.L };
            else if (position[2] === 1) persistentRotation = { axis: 'z', angle: centerRotations.F };
            else if (position[2] === -1) persistentRotation = { axis: 'z', angle: centerRotations.B };
          }

          // Kociemba facelet indices:
          // U: 0-8 (White, top)
          // R: 9-17 (Red, right)
          // F: 18-26 (Green, front)
          // D: 27-35 (Yellow, bottom)
          // L: 36-44 (Orange, left)
          // B: 45-53 (Blue, back)

          // Right face (x = 1 in position) - Red
          // Kociemba 9-17: 9 (U-R-F corner), 10 (U-R edge), 11 (U-R-B corner)... row by row
          // Viewed from Right:
          // Top-Left (U-R-F) -> position[1]=1, position[2]=1
          // Top-Right (U-R-B) -> position[1]=1, position[2]=-1
          if (position[0] === 1) {
            const row = 1 - position[1]; // y=1 -> 0, y=0 -> 1, y=-1 -> 2
            const col = 1 - position[2]; // z=1 -> 0, z=0 -> 1, z=-1 -> 2
            const idx = 9 + row * 3 + col;
            colors[0] = displayFacelets[idx] || null;
            if (!displayFacelets[idx]) console.warn(`Missing facelet at R face idx ${idx} (row ${row}, col ${col})`);
          }

          // Left face (x = -1 in position) - Orange
          // Kociemba 36-44.
          // Viewed from Left:
          // Top-Left (U-L-B) -> position[1]=1, position[2]=-1
          // Top-Right (U-L-F) -> position[1]=1, position[2]=1
          if (position[0] === -1) {
            const row = 1 - position[1]; // y=1 -> 0, y=0 -> 1, y=-1 -> 2
            const col = position[2] + 1; // z=-1 -> 0, z=0 -> 1, z=1 -> 2
            const idx = 36 + row * 3 + col;
            colors[1] = displayFacelets[idx] || null;
            if (!displayFacelets[idx]) console.warn(`Missing facelet at L face idx ${idx} (row ${row}, col ${col})`);
          }

          // Up face (y = 1 in position) - White
          // Kociemba 0-8.
          // Viewed from Top:
          // Top-Left (U-B-L) -> position[0]=-1, position[2]=-1
          // Top-Right (U-B-R) -> position[0]=1, position[2]=-1
          if (position[1] === 1) {
            const row = position[2] + 1; // z=-1 -> 0, z=0 -> 1, z=1 -> 2 (Back to Front)
            const col = position[0] + 1; // x=-1 -> 0, x=0 -> 1, x=1 -> 2 (Left to Right)
            const idx = 0 + row * 3 + col;
            colors[2] = displayFacelets[idx] || null;
            if (!displayFacelets[idx]) console.warn(`Missing facelet at U face idx ${idx} (row ${row}, col ${col})`);
          }

          // Down face (y = -1 in position) - Yellow
          // Kociemba 27-35.
          // Viewed from Bottom:
          // Top-Left (D-F-L) -> position[0]=-1, position[2]=1
          // Top-Right (D-F-R) -> position[0]=1, position[2]=1
          if (position[1] === -1) {
            const row = 1 - position[2]; // z=1 -> 0, z=0 -> 1, z=-1 -> 2 (Front to Back)
            const col = position[0] + 1; // x=-1 -> 0, x=0 -> 1, x=1 -> 2 (Left to Right)
            const idx = 27 + row * 3 + col;
            colors[3] = displayFacelets[idx] || null;
            if (!displayFacelets[idx]) console.warn(`Missing facelet at D face idx ${idx} (row ${row}, col ${col})`);
          }

          // Front face (z = 1 in position) - Green
          // Kociemba 18-26.
          // Viewed from Front:
          // Top-Left (U-F-L) -> position[0]=-1, position[1]=1
          // Top-Right (U-F-R) -> position[0]=1, position[1]=1
          if (position[2] === 1) {
            const row = 1 - position[1]; // y=1 -> 0, y=0 -> 1, y=-1 -> 2 (Top to Bottom)
            const col = position[0] + 1; // x=-1 -> 0, x=0 -> 1, x=1 -> 2 (Left to Right)
            const idx = 18 + row * 3 + col;
            colors[4] = displayFacelets[idx] || null;
            if (!displayFacelets[idx]) console.warn(`Missing facelet at F face idx ${idx} (row ${row}, col ${col})`);
          }

          // Back face (z = -1 in position) - Blue
          // Kociemba 45-53.
          // Viewed from Back:
          // Top-Left (U-B-R) -> position[0]=1, position[1]=1
          // Top-Right (U-B-L) -> position[0]=-1, position[1]=1
          if (position[2] === -1) {
            const row = 1 - position[1]; // y=1 -> 0, y=0 -> 1, y=-1 -> 2 (Top to Bottom)
            const col = 1 - position[0]; // x=1 -> 0, x=0 -> 1, x=-1 -> 2 (Right to Left)
            const idx = 45 + row * 3 + col;
            colors[5] = displayFacelets[idx] || null;
            if (!displayFacelets[idx]) console.warn(`Missing facelet at B face idx ${idx} (row ${row}, col ${col})`);
          }

          result.push({ position, colors, isCenter, persistentRotation });
        }
      }
    }

    return result;
  }, [displayFacelets, centerRotations, animationTick]);

  // Calculate animation rotation for each cubelet
  const getAnimationRotation = (position: [number, number, number]) => {
    if (!animatingLayer) return null;

    const { face, direction } = animatingLayer;
    const [x, y, z] = position;

    // Check if this cubelet is part of the animating layer
    const isPartOfLayer =
      (face === 'U' && y === 1) ||
      (face === 'D' && y === -1) ||
      (face === 'R' && x === 1) ||
      (face === 'L' && x === -1) ||
      (face === 'F' && z === 1) ||
      (face === 'B' && z === -1);

    if (!isPartOfLayer) return null;

    // Calculate the rotation angle with easing
    // Animate from 0 to 90 degrees - displayFacelets shows OLD state during animation
    const progress = easeInOutCubic(Math.min(animationProgress.current, 1));
    const sign = FACE_ROTATION_SIGNS[face] || 1;

    // Start at 0, end at 90 * direction * sign
    const angle = direction * sign * (Math.PI / 2) * progress;

    // Determine rotation axis
    let axis: 'x' | 'y' | 'z' = 'y';
    if (face === 'R' || face === 'L') axis = 'x';
    else if (face === 'U' || face === 'D') axis = 'y';
    else if (face === 'F' || face === 'B') axis = 'z';

    return { axis, angle };
  };

  return (
    <group ref={groupRef}>
      {cubelets.map((cubelet) => {
        // Create stable key based on position
        const posKey = `${cubelet.position[0]}_${cubelet.position[1]}_${cubelet.position[2]}`;
        return (
          <Cubelet
            key={posKey}
            position={cubelet.position}
            colors={cubelet.colors}
            isCenter={cubelet.isCenter}
            animationRotation={getAnimationRotation(cubelet.position)}
            persistentRotation={cubelet.persistentRotation}
          />
        );
      })}
      {nextMove && <ScrambleArrow move={nextMove} />}
    </group>
  );
};

interface RubiksCube3DProps {
  facelets: Facelets;
  orientation: CubeOrientation;
  lastMove?: MoveEvent | null;
  nextMove?: string | null;
  showReflections?: boolean;
}

const RubiksCube3D = ({
  facelets,
  orientation,
  lastMove = null,
  nextMove = null,
  showReflections = true
}: RubiksCube3DProps) => {
  const [webGLSupported, setWebGLSupported] = useState(true);
  const [axisConfig, setAxisConfig] = useState<AxisConfig>(loadAxisConfig);

  useEffect(() => {
    setWebGLSupported(isWebGLAvailable());
  }, []);

  const handleAxisConfigChange = useCallback((config: AxisConfig) => {
    setAxisConfig(config);
  }, []);

  if (!webGLSupported) {
    return (
      <div className="w-full h-[400px] md:h-[500px] flex items-center justify-center bg-muted/50 rounded-lg border border-border">
        <div className="text-center p-6">
          <div className="text-6xl mb-4">🎲</div>
          <h3 className="text-lg font-semibold text-foreground mb-2">3D View Unavailable</h3>
          <p className="text-sm text-muted-foreground">
            WebGL is not supported in this browser. The cube tracking is still active.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[400px] md:h-[500px] relative">
      <AxisCalibration
        onConfigChange={handleAxisConfigChange}
        currentOrientation={orientation}
      />
      <Canvas
        shadows
        camera={{ position: [5, 4, 5], fov: 40 }}
        gl={{ antialias: true, stencil: false, depth: true, failIfMajorPerformanceCaveat: false }}
        onCreated={({ gl }) => {
          gl.setClearColor('#000000', 0);
        }}
      >
        <color attach="background" args={['#050505']} />

        <ambientLight intensity={0.4} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#44aaff" />

        <Environment preset="city" />

        <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.5}>
          <CubeGroup
            facelets={facelets}
            orientation={orientation}
            axisConfig={axisConfig}
            lastMove={lastMove}
            nextMove={nextMove}
          />
        </Float>

        {/* Contact Shadows for realism */}
        <ContactShadows
          resolution={256}
          position={[0, -2.5, 0]}
          opacity={0.4}
          scale={10}
          blur={2.5}
          far={3}
        />

        {/* Glass Floor with Reflections */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.51, 0]} receiveShadow>
          <planeGeometry args={[20, 20]} />
          {showReflections ? (
            <MeshReflectorMaterial
              mirror={0.7}
              blur={[300, 100]}
              resolution={512}
              mixBlur={1}
              mixStrength={40}
              roughness={1}
              depthScale={1.2}
              minDepthThreshold={0.4}
              maxDepthThreshold={1.4}
              color="#151515"
              metalness={0.5}
            />
          ) : (
            <meshStandardMaterial color="#101010" opacity={0.6} transparent />
          )}
        </mesh>

        <OrbitControls
          enablePan={false}
          enableZoom={true}
          minDistance={6}
          maxDistance={15}
          autoRotate={false}
          makeDefault
        />
      </Canvas>
    </div>
  );
};

export default RubiksCube3D;
