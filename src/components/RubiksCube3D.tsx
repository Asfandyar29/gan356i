import { useRef, useMemo, useState, useEffect, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { Facelets, CubeColor, CubeOrientation, MoveEvent } from '@/types/cube';
import AxisCalibration, { AxisConfig, loadAxisConfig } from './AxisCalibration';

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

interface CubeletProps {
  position: [number, number, number];
  colors: (CubeColor | null)[];
  isCenter?: boolean;
  animationRotation?: { axis: 'x' | 'y' | 'z'; angle: number } | null;
}

const Cubelet = ({ position, colors, isCenter = false, animationRotation }: CubeletProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const size = 0.95;
  const stickerOffset = 0.48;
  const stickerSize = 0.82;
  const stickerThickness = 0.015;
  const stickerRadius = 0.1;

  // Apply animation rotation
  useFrame(() => {
    if (groupRef.current && animationRotation) {
      const { axis, angle } = animationRotation;

      const axisVec = new THREE.Vector3(
        axis === 'x' ? 1 : 0,
        axis === 'y' ? 1 : 0,
        axis === 'z' ? 1 : 0
      );

      // Rotate around world origin (0,0,0)
      // 1. Create rotation quaternion
      const q = new THREE.Quaternion().setFromAxisAngle(axisVec, angle);

      // 2. Apply orbit rotation to position
      const pos = new THREE.Vector3(...position);
      pos.applyQuaternion(q);

      // 3. Apply rotation to orientation
      groupRef.current.position.copy(pos);
      groupRef.current.quaternion.copy(q);
    } else if (groupRef.current) {
      // Reset to rest state
      groupRef.current.position.set(...position);
      groupRef.current.rotation.set(0, 0, 0);
    }
  });

  // Face directions: +X, -X, +Y, -Y, +Z, -Z (R, L, U, D, F, B)
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

  return (
    <group ref={groupRef} position={position}>
      {/* Black cube body */}
      <RoundedBox args={[size, size, size]} radius={0.08} smoothness={4}>
        <meshStandardMaterial color="#1a1a1a" />
      </RoundedBox>

      {/* Stickers */}
      {colors.map((color, index) => {
        if (!color) return null; // Don't render internal faces

        const displayColor = colorMap[color];
        const dir = faceDirections[index];
        const rot = faceRotations[index];
        const stickerPos: [number, number, number] = [
          dir[0] * stickerOffset,
          dir[1] * stickerOffset,
          dir[2] * stickerOffset,
        ];

        // Check if this is the white center (for GAN logo)
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
            {/* GAN Logo on white center */}
            {isWhiteCenter && (
              <mesh position={[0, 0, 0.02]}>
                <planeGeometry args={[0.4, 0.25]} />
                <meshBasicMaterial color="#0046AD" transparent opacity={0.9} />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
};

interface AnimatingLayer {
  face: string;
  direction: 1 | -1;
  progress: number;
}

interface CubeGroupProps {
  facelets: Facelets;
  orientation: CubeOrientation;
  axisConfig: AxisConfig;
  lastMove: MoveEvent | null;
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

// Get which cubelets belong to which face for animation
const getCubeletsForFace = (face: string): { x: number; y: number; z: number }[] => {
  const cubelets: { x: number; y: number; z: number }[] = [];
  const offsets = [-1, 0, 1];

  for (let y = 0; y < 3; y++) {
    for (let z = 0; z < 3; z++) {
      for (let x = 0; x < 3; x++) {
        if (x === 1 && y === 1 && z === 1) continue;

        const pos = { x: offsets[x], y: offsets[2 - y], z: offsets[2 - z] };

        switch (face) {
          case 'U': if (pos.y === 1) cubelets.push(pos); break;
          case 'D': if (pos.y === -1) cubelets.push(pos); break;
          case 'R': if (pos.x === 1) cubelets.push(pos); break;
          case 'L': if (pos.x === -1) cubelets.push(pos); break;
          case 'F': if (pos.z === 1) cubelets.push(pos); break;
          case 'B': if (pos.z === -1) cubelets.push(pos); break;
        }
      }
    }
  }
  return cubelets;
};

const CubeGroup = ({ facelets, orientation, axisConfig, lastMove }: CubeGroupProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const currentRotation = useRef({ x: 0, y: 0, z: 0 });
  const [animatingLayer, setAnimatingLayer] = useState<AnimatingLayer | null>(null);
  const animationProgress = useRef(0);
  const lastMoveTimestamp = useRef<number | null>(null);

  // Trigger animation when a new move occurs
  useEffect(() => {
    if (lastMove && lastMove.timestamp !== lastMoveTimestamp.current) {
      lastMoveTimestamp.current = lastMove.timestamp;
      setAnimatingLayer({
        face: lastMove.face,
        direction: lastMove.direction,
        progress: 0,
      });
      animationProgress.current = 0;
    }
  }, [lastMove]);

  // Smoothly interpolate orientation with configurable axis mapping
  useFrame((_, delta) => {
    // Handle layer animation
    if (animatingLayer) {
      animationProgress.current += delta * 8; // Animation speed
      if (animationProgress.current >= 1) {
        setAnimatingLayer(null);
        animationProgress.current = 0;
      }
    }

    if (groupRef.current) {
      if (orientation.quaternion && axisConfig.gyroEnabled) {
        // use quaternion SLERP for smooth accurate rotation
        const { x, y, z, w } = orientation.quaternion;

        // Standard GAN coordinate system to Three.js mapping
        // GAN: X=Roll, Y=Pitch, Z=Yaw (usually)
        // We stick to the raw quaternion and let calibration handle re-orientation if possible.
        // However, we need to respect the "Calibration" offsets.
        // Since we are using Quaternions, Euler offsets are tricky. 
        // We will implement a simple "Tare" mechanism that creates a correction quaternion.

        // Apply calibration: expected that the user hits "Set Neutral"
        // If we have calibration quaternion, apply it.
        // We calculate: MappedQ = rawQ * offsetQ (or vice versa? Rotations combine)
        // Usually: Corrected = Offset * Raw
        let targetQ = new THREE.Quaternion(x, z, -y, w);

        // Let's create the ThreeJS quaternion from raw
        const currentQ = new THREE.Quaternion(x, z, -y, w);

        if (axisConfig.offsetQuaternion) {
          const { x: ox, y: oy, z: oz, w: ow } = axisConfig.offsetQuaternion;

          // The calibration was captured in RAW format (inverse of raw), so we need to construct it carefully.
          // Our capture logic was: updates.offsetQuaternion = { x: -x, y: -y, z: -z, w: w }; (Inverse of RAW)

          // If we want the FINAL view to be neutral, we need to multiply.
          // But we already swizzled the raw values to (x, z, -y, w).

          // Let's assume the user holds the cube in "neutral" position and clicks "Set Neutral".
          // We want that position to show as identity on screen.
          // Screen Identity = Swizzle(Raw_Neutral * Offset_Raw) ? 

          // Let's try to apply the offset in the original space first, THEN swizzle.
          // Raw_Neutral = (rx, ry, rz, rw)
          // Offset = Inverse(Raw_Neutral)
          // Corrected_Raw = Raw_Current * Offset
          // Screen_Q = Swizzle(Corrected_Raw)

          const offsetQ = new THREE.Quaternion(ox, oy, oz, ow);
          const rawQ = new THREE.Quaternion(x, y, z, w);

          // Standard multiplication order in Three.js: a.multiply(b) means a = a * b (local rotation b)
          // Quaternion multiplication is non-commutative.
          // Typically: global_rot = rot * global_offset ?? 
          // We want the offset to be applied "Before" the rotation or "After"?
          // If offset is the "zeroing", then Corrected = Offset * Current.

          const correctedRaw = offsetQ.clone().multiply(rawQ);

          // Now swizzle to Three.js coords (x, z, -y)
          // Warning: Swizzling after multiplication might behave differently.
          // Swizzle Mapping: X->X, Y->Z, Z->-Y

          targetQ.set(correctedRaw.x, correctedRaw.z, -correctedRaw.y, correctedRaw.w);
        }

        groupRef.current.quaternion.slerp(targetQ, 0.2);

        // Sync euler for backup/debug
        const euler = new THREE.Euler().setFromQuaternion(groupRef.current.quaternion);
        currentRotation.current.x = euler.x;
        currentRotation.current.y = euler.y;
        currentRotation.current.z = euler.z;

      } else if (axisConfig.gyroEnabled && !orientation.quaternion) {
        // Fallback to Euler logic if no quaternion
        // Get source values based on config
        const sourceValues = { x: orientation.x, y: orientation.y, z: orientation.z };

        // Apply axis mapping, offsets, and inversion
        let xVal = (sourceValues[axisConfig.xSource] + axisConfig.offsetX) * (axisConfig.xInvert ? -1 : 1);
        let yVal = (sourceValues[axisConfig.ySource] + axisConfig.offsetY) * (axisConfig.yInvert ? -1 : 1);
        let zVal = (sourceValues[axisConfig.zSource] + axisConfig.offsetZ) * (axisConfig.zInvert ? -1 : 1);

        // Normalize angles to prevent sudden jumps
        xVal = normalizeAngle(xVal);
        yVal = normalizeAngle(yVal);
        zVal = normalizeAngle(zVal);

        const targetX = xVal * (Math.PI / 180);
        const targetY = yVal * (Math.PI / 180);
        const targetZ = zVal * (Math.PI / 180);

        // Smooth interpolation with angle wraparound handling
        currentRotation.current.x = lerpAngle(currentRotation.current.x, targetX, 0.15);
        currentRotation.current.y = lerpAngle(currentRotation.current.y, targetY, 0.15);
        currentRotation.current.z = lerpAngle(currentRotation.current.z, targetZ, 0.15);

        groupRef.current.rotation.x = currentRotation.current.x;
        groupRef.current.rotation.y = currentRotation.current.y;
        groupRef.current.rotation.z = currentRotation.current.z;
      }
    }
  });

  // Generate cubelet data from facelets
  const cubelets = useMemo(() => {
    const result: { position: [number, number, number]; colors: (CubeColor | null)[]; isCenter: boolean }[] = [];

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
            colors[0] = facelets[idx] || null;
            if (!facelets[idx]) console.warn(`Missing facelet at R face idx ${idx} (row ${row}, col ${col})`);
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
            colors[1] = facelets[idx] || null;
            if (!facelets[idx]) console.warn(`Missing facelet at L face idx ${idx} (row ${row}, col ${col})`);
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
            colors[2] = facelets[idx] || null;
            if (!facelets[idx]) console.warn(`Missing facelet at U face idx ${idx} (row ${row}, col ${col})`);
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
            colors[3] = facelets[idx] || null;
            if (!facelets[idx]) console.warn(`Missing facelet at D face idx ${idx} (row ${row}, col ${col})`);
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
            colors[4] = facelets[idx] || null;
            if (!facelets[idx]) console.warn(`Missing facelet at F face idx ${idx} (row ${row}, col ${col})`);
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
            colors[5] = facelets[idx] || null;
            if (!facelets[idx]) console.warn(`Missing facelet at B face idx ${idx} (row ${row}, col ${col})`);
          }

          result.push({ position, colors, isCenter });
        }
      }
    }

    return result;
  }, [facelets]);

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
    // Calculate the rotation angle with easing (animate from previous state to current state)
    const progress = Math.min(animationProgress.current, 1);
    const easeOut = 1 - Math.pow(1 - progress, 3);

    // We receive the new state immediately, so pieces are already at the destination.
    // We want to visually start them from the previous position.
    // Standard move is 'direction' (1=CW, -1=CCW).
    // Rotation required = direction * sign_factor * 90.
    // Start Angle should be negative of that (undoing the move).
    // startAngle = -(direction * sign * pi/2).

    const sign = FACE_ROTATION_SIGNS[face] || 1;
    const startAngle = -direction * sign * (Math.PI / 2);
    const angle = startAngle * (1 - easeOut);

    // Determine rotation axis
    let axis: 'x' | 'y' | 'z' = 'y';
    if (face === 'R' || face === 'L') axis = 'x';
    else if (face === 'U' || face === 'D') axis = 'y';
    else if (face === 'F' || face === 'B') axis = 'z';

    return { axis, angle };
  };

  return (
    <group ref={groupRef}>
      {cubelets.map((cubelet, index) => (
        <Cubelet
          key={index}
          position={cubelet.position}
          colors={cubelet.colors}
          isCenter={cubelet.isCenter}
          animationRotation={getAnimationRotation(cubelet.position)}
        />
      ))}
    </group>
  );
};

interface RubiksCube3DProps {
  facelets: Facelets;
  orientation: CubeOrientation;
  lastMove?: MoveEvent | null;
}

const RubiksCube3D = ({ facelets, orientation, lastMove = null }: RubiksCube3DProps) => {
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
        camera={{ position: [4, 3, 4], fov: 45 }}
        gl={{ antialias: true, failIfMajorPerformanceCaveat: false }}
        onCreated={({ gl }) => {
          gl.setClearColor('#000000', 0);
        }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <directionalLight position={[-10, -10, -5]} intensity={0.3} />
        <pointLight position={[0, 10, 0]} intensity={0.5} />

        <CubeGroup facelets={facelets} orientation={orientation} axisConfig={axisConfig} lastMove={lastMove} />

        <OrbitControls
          enablePan={false}
          enableZoom={true}
          minDistance={5}
          maxDistance={12}
          autoRotate={false}
        />
      </Canvas>
    </div>
  );
};

export default RubiksCube3D;
