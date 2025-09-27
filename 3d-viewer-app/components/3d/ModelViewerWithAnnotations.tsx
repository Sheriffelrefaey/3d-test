'use client';

import React, { Suspense, useState, useEffect } from 'react';
import { Canvas, useThree, useLoader } from '@react-three/fiber';
import {
  OrbitControls,
  Environment,
  Grid,
  Html,
  Bounds,
  Center
} from '@react-three/drei';
import * as THREE from 'three';
import type { Annotation } from '@/types';
import { getGLTFLoader } from '@/lib/three/loaders';

interface ModelViewerWithAnnotationsProps {
  modelUrl: string;
  annotations: Annotation[];
}

// Interactive Annotation Marker Component
function AnnotationMarker({ annotation, onClick }: { annotation: Annotation; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);

  return (
    <group position={[annotation.position_x, annotation.position_y, annotation.position_z]}>
      {/* Clickable sphere marker */}
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setHovered(false);
          document.body.style.cursor = 'default';
        }}
      >
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshStandardMaterial
          color={hovered ? "#00ff00" : "#ff0000"}
          emissive={hovered ? "#00ff00" : "#ff0000"}
          emissiveIntensity={0.5}
          opacity={0.9}
          transparent
        />
      </mesh>

      {/* Label that shows on hover */}
      {hovered && (
        <Html center>
          <div className="bg-white/95 px-3 py-2 rounded-lg shadow-lg text-sm whitespace-nowrap pointer-events-none">
            <div className="font-semibold text-gray-900">{annotation.title || 'Untitled'}</div>
            {annotation.object_name && (
              <div className="text-xs text-gray-600">{annotation.object_name}</div>
            )}
          </div>
        </Html>
      )}
    </group>
  );
}

// 3D Model Component with Annotations
function ModelWithAnnotations({
  modelUrl,
  annotations,
  onAnnotationClick
}: {
  modelUrl: string;
  annotations: Annotation[];
  onAnnotationClick: (annotation: Annotation) => void;
}) {
  const gltf = useLoader(getGLTFLoader, modelUrl);
  const { camera } = useThree();
  const [_meshes, setMeshes] = useState<THREE.Mesh[]>([]);

  useEffect(() => {
    // Extract meshes and auto-fit model
    const extractedMeshes: THREE.Mesh[] = [];

    gltf.scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        extractedMeshes.push(child);

        // Highlight objects that have annotations
        const hasAnnotation = annotations.some(a => a.object_name === child.name);
        if (hasAnnotation && child.material) {
          const material = child.material as THREE.MeshStandardMaterial;
          material.emissive = new THREE.Color(0x0066ff);
          material.emissiveIntensity = 0.1;
        }
      }
    });

    setMeshes(extractedMeshes);

    // Auto-center and scale
    const box = new THREE.Box3().setFromObject(gltf.scene);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 10 / maxDim; // Increased scale for better visibility

    // Center the model on X and Z, but place it on the grid (Y=0)
    gltf.scene.position.x = -center.x * scale;
    gltf.scene.position.z = -center.z * scale;
    gltf.scene.position.y = -box.min.y * scale; // Place bottom of model on grid
    gltf.scene.scale.setScalar(scale);

    // Position camera for better initial view
    const dist = Math.max(size.x, size.z) * scale;
    camera.position.set(dist, dist * 0.7, dist);
    camera.lookAt(0, size.y * scale / 2, 0); // Look at center height of model
  }, [gltf, camera, annotations]);

  return (
    <>
      <primitive object={gltf.scene} />
      {annotations.map((annotation, idx) => (
        <AnnotationMarker
          key={annotation.id || idx}
          annotation={annotation}
          onClick={() => onAnnotationClick(annotation)}
        />
      ))}
    </>
  );
}

// Main Viewer Component
export default function ModelViewerWithAnnotations({
  modelUrl,
  annotations
}: ModelViewerWithAnnotationsProps) {
  const [selectedAnnotation, setSelectedAnnotation] = useState<Annotation | null>(null);

  const handleAnnotationClick = (annotation: Annotation) => {
    setSelectedAnnotation(annotation);
  };

  const handleClosePanel = () => {
    setSelectedAnnotation(null);
  };

  return (
    <div className="relative w-full h-full">
      <Canvas
        shadows
        camera={{ position: [8, 8, 8], fov: 50 }}
        gl={{
          antialias: true,
          toneMapping: 2,
          toneMappingExposure: 1.8
        }}
      >
        <Suspense fallback={
          <mesh>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="#8B5CF6" wireframe />
          </mesh>
        }>
          {/* Fog for depth */}
          <fog attach="fog" args={['#f5f5f5', 15, 60]} />

          {/* Lighting */}
          <ambientLight intensity={2} />
          <directionalLight
            position={[10, 10, 5]}
            intensity={3}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
          />
          <directionalLight position={[-5, 5, -5]} intensity={2} />
          <directionalLight position={[0, -5, 0]} intensity={1.5} />
          <pointLight position={[0, 10, 0]} intensity={2} />

          {/* Model with annotations */}
          <Bounds fit clip observe margin={1.2}>
            <Center>
              <ModelWithAnnotations
                modelUrl={modelUrl}
                annotations={annotations}
                onAnnotationClick={handleAnnotationClick}
              />
            </Center>
          </Bounds>

          {/* Grid */}
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
            infiniteGrid={true}
          />

          {/* Controls */}
          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minDistance={0.5}
            maxDistance={100}
            maxPolarAngle={Math.PI * 0.85}
            target={[0, 2, 0]}
          />

          {/* Environment */}
          <Environment preset="city" background={false} />
        </Suspense>
      </Canvas>

      {/* Instructions */}
      <div className="absolute top-4 left-4 bg-white/90 p-3 rounded-lg shadow-lg max-w-xs">
        <h3 className="font-semibold text-sm mb-1">How to interact:</h3>
        <ul className="text-xs space-y-1 text-gray-600">
          <li>• Click red markers to view annotations</li>
          <li>• Drag to rotate the model</li>
          <li>• Scroll to zoom in/out</li>
          <li>• Right-click drag to pan</li>
        </ul>
      </div>

      {/* Annotation Details Panel */}
      {selectedAnnotation && (
        <div className="absolute top-1/2 right-4 transform -translate-y-1/2 w-80 bg-white rounded-lg shadow-2xl border border-gray-200 z-50">
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-3 rounded-t-lg">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-white">
                Annotation Details
              </h3>
              <button
                onClick={handleClosePanel}
                className="text-white/80 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="p-4 space-y-3">
            {selectedAnnotation.object_name && (
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Object</label>
                <p className="text-sm text-gray-900 mt-1">{selectedAnnotation.object_name}</p>
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Title</label>
              <p className="text-sm font-semibold text-gray-900 mt-1">
                {selectedAnnotation.title || 'Untitled Annotation'}
              </p>
            </div>

            {selectedAnnotation.description && (
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Description</label>
                <p className="text-sm text-gray-700 mt-1 leading-relaxed">
                  {selectedAnnotation.description}
                </p>
              </div>
            )}

            <div className="pt-2 border-t border-gray-200">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Position</label>
              <p className="text-xs font-mono text-gray-600 mt-1">
                X: {selectedAnnotation.position_x.toFixed(2)},
                Y: {selectedAnnotation.position_y.toFixed(2)},
                Z: {selectedAnnotation.position_z.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Annotations List */}
      {annotations.length > 0 && (
        <div className="absolute bottom-4 left-4 bg-white/90 p-3 rounded-lg shadow-lg max-w-xs max-h-48 overflow-y-auto">
          <h3 className="font-semibold text-sm mb-2">Annotations ({annotations.length})</h3>
          <ul className="text-xs space-y-1">
            {annotations.map((ann, idx) => (
              <li
                key={ann.id || idx}
                className="flex items-center gap-2 p-1 hover:bg-gray-100 rounded cursor-pointer"
                onClick={() => setSelectedAnnotation(ann)}
              >
                <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0" />
                <span className="truncate">{ann.title || ann.object_name || 'Untitled'}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}