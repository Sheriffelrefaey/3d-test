'use client';

import { Suspense, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, Grid, useGLTF, Center, Bounds } from '@react-three/drei';
import type { Group } from 'three';

interface ModelViewerProps {
  modelUrl?: string;
  children?: React.ReactNode;
}

// Component to load and display GLTF/GLB models
function Model({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  return <primitive object={scene} />;
}

export default function ModelViewer({ modelUrl, children }: ModelViewerProps) {
  const groupRef = useRef<Group>(null);
  const [_loading, _setLoading] = useState(false);
  const [_error, _setError] = useState<string | null>(null);

  return (
    <div className="w-full h-full relative bg-gradient-to-b from-gray-300 to-gray-500">
      <Canvas
        shadows
        gl={{
          antialias: true,
          toneMapping: 2, // ACESFilmicToneMapping
          toneMappingExposure: 1.8
        }}>
        <Suspense
          fallback={
            <mesh>
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial color="#8B5CF6" wireframe />
            </mesh>
          }
        >
          {/* Add white fog for better depth perception */}
          <fog attach="fog" args={['#f5f5f5', 15, 60]} />

          <PerspectiveCamera makeDefault position={[15, 10, 15]} fov={50} />
          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minDistance={0.5}
            maxDistance={100}
            maxPolarAngle={Math.PI * 0.85}
            target={[0, 2, 0]}
          />

          {/* Enhanced lighting setup for better visibility */}
          <ambientLight intensity={3.5} />

          {/* Main key light */}
          <directionalLight
            position={[10, 10, 5]}
            intensity={5}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
            color="#ffffff"
          />

          {/* Fill light from opposite side */}
          <directionalLight
            position={[-5, 5, -5]}
            intensity={3}
            color="#ffffff"
          />

          {/* Rim light for edge highlighting */}
          <directionalLight
            position={[0, 5, -10]}
            intensity={2.5}
            color="#ffffff"
          />

          {/* Bottom fill light to illuminate underside */}
          <directionalLight
            position={[0, -5, 0]}
            intensity={2}
            color="#ffffff"
          />

          {/* Point lights for additional illumination */}
          <pointLight position={[5, 5, 5]} intensity={2} color="#ffffff" />
          <pointLight position={[-5, 5, -5]} intensity={2} color="#ffffff" />
          <pointLight position={[0, 10, 0]} intensity={3} color="#ffffff" />

          <group ref={groupRef}>
            {modelUrl ? (
              <Bounds fit clip observe margin={1.2}>
                <Center>
                  <Model url={modelUrl} />
                </Center>
              </Bounds>
            ) : (
              children
            )}
          </group>

          <Grid
            args={[20, 20]}
            cellSize={1}
            cellThickness={0.5}
            cellColor="#9ca3af"
            sectionSize={5}
            sectionThickness={1}
            sectionColor="#d1d5db"
            fadeDistance={30}
            fadeStrength={1}
            followCamera={false}
            infiniteGrid={true}
          />

          <Environment preset="city" background={false} />
        </Suspense>
      </Canvas>

      {_loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="text-white">Loading model...</div>
        </div>
      )}

      {_error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="text-red-400 text-center">
            <p className="text-lg font-semibold mb-2">Failed to load model</p>
            <p className="text-sm">{_error}</p>
          </div>
        </div>
      )}
    </div>
  );
}