import { useRef, useMemo, useState, useEffect, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { Facelets, CubeColor, CubeOrientation } from '@/types/cube';
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
}

const Cubelet = ({ position, colors, isCenter = false }: CubeletProps) => {
  const size = 0.95;
  const stickerOffset = 0.48;
  const stickerSize = 0.82;
  const stickerThickness = 0.015;
  const stickerRadius = 0.1;

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
    <group position={position}>
      {/* Black cube body */}
      <RoundedBox args={[size, size, size]} radius={0.08} smoothness={4}>
        <meshStandardMaterial color="#1a1a1a" />
      </RoundedBox>

      {/* Stickers */}
      {colors.map((color, index) => {
        if (!color) return null;
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
                color={colorMap[color]} 
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

interface CubeGroupProps {
  facelets: Facelets;
  orientation: CubeOrientation;
  axisConfig: AxisConfig;
}

// Normalize angle to prevent sudden jumps (keeps angle in -180 to 180 range)
const normalizeAngle = (angle: number): number => {
  while (angle > 180) angle -= 360;
  while (angle < -180) angle += 360;
  return angle;
};

// Smooth angle interpolation that handles wraparound
const lerpAngle = (current: number, target: number, factor: number): number => {
  let diff = target - current;
  
  // Handle wraparound - take the shortest path
  if (diff > Math.PI) diff -= 2 * Math.PI;
  if (diff < -Math.PI) diff += 2 * Math.PI;
  
  return current + diff * factor;
};

const CubeGroup = ({ facelets, orientation, axisConfig }: CubeGroupProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const currentRotation = useRef({ x: 0, y: 0, z: 0 });

  // Smoothly interpolate orientation with configurable axis mapping
  useFrame(() => {
    if (groupRef.current) {
      if (!axisConfig.gyroEnabled) {
        // When gyro is disabled, don't update rotation from orientation
        return;
      }

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

          const position: [number, number, number] = [offsets[x], offsets[2-y], offsets[2-z]];
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
          
          // Right face (x = 2) - Red (R face: indices 9-17)
          if (x === 2) {
            const idx = 9 + (2-y) * 3 + (2-z);
            colors[0] = facelets[idx] || 'red';
          }
          // Left face (x = 0) - Orange (L face: indices 36-44)
          if (x === 0) {
            const idx = 36 + (2-y) * 3 + z;
            colors[1] = facelets[idx] || 'orange';
          }
          // Up face (y = 0) - White (U face: indices 0-8)
          if (y === 0) {
            const idx = 0 + (2-z) * 3 + x;
            colors[2] = facelets[idx] || 'white';
          }
          // Down face (y = 2) - Yellow (D face: indices 27-35)
          if (y === 2) {
            const idx = 27 + z * 3 + x;
            colors[3] = facelets[idx] || 'yellow';
          }
          // Front face (z = 0) - Green (F face: indices 18-26)
          if (z === 0) {
            const idx = 18 + (2-y) * 3 + x;
            colors[4] = facelets[idx] || 'green';
          }
          // Back face (z = 2) - Blue (B face: indices 45-53)
          if (z === 2) {
            const idx = 45 + (2-y) * 3 + (2-x);
            colors[5] = facelets[idx] || 'blue';
          }

          result.push({ position, colors, isCenter });
        }
      }
    }

    return result;
  }, [facelets]);

  return (
    <group ref={groupRef}>
      {cubelets.map((cubelet, index) => (
        <Cubelet 
          key={index} 
          position={cubelet.position} 
          colors={cubelet.colors}
          isCenter={cubelet.isCenter}
        />
      ))}
    </group>
  );
};

interface RubiksCube3DProps {
  facelets: Facelets;
  orientation: CubeOrientation;
}

const RubiksCube3D = ({ facelets, orientation }: RubiksCube3DProps) => {
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
        
        <CubeGroup facelets={facelets} orientation={orientation} axisConfig={axisConfig} />
        
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
