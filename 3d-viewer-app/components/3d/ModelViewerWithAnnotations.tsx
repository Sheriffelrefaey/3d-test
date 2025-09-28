'use client';

import React, { Suspense, useState, useEffect, useRef } from 'react';
import { Canvas, useThree, useLoader, useFrame } from '@react-three/fiber';
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
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

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
  onAnnotationClick,
  onObjectClick,
  targetPosition,
  clickedMesh
}: {
  modelUrl: string;
  annotations: Annotation[];
  onAnnotationClick: (annotation: Annotation) => void;
  onObjectClick: (mesh: THREE.Mesh, point: THREE.Vector3) => void;
  targetPosition: THREE.Vector3 | null;
  clickedMesh: THREE.Mesh | null;
}) {
  const gltf = useLoader(GLTFLoader, modelUrl);
  const { camera } = useThree();
  const [meshes, setMeshes] = useState<THREE.Mesh[]>([]);
  const [hoveredMesh, setHoveredMesh] = useState<THREE.Mesh | null>(null);
  const controlsRef = useRef<any>(null);
  const [modelScale, setModelScale] = useState(1);

  // Smooth camera animation to target position
  useFrame(() => {
    if (targetPosition && controlsRef.current) {
      // Smoothly move camera target to the clicked point
      controlsRef.current.target.lerp(targetPosition, 0.1);
      controlsRef.current.update();

      // Calculate distance based on object size for better framing
      const zoomDistance = modelScale * 2; // Closer zoom based on model scale

      // Position camera to look at the target from a nice angle
      const idealCameraPos = targetPosition.clone();
      idealCameraPos.x += zoomDistance;
      idealCameraPos.y += zoomDistance * 0.7;
      idealCameraPos.z += zoomDistance;

      camera.position.lerp(idealCameraPos, 0.05);
    }
  });

  useEffect(() => {
    // Extract meshes and auto-fit model
    const extractedMeshes: THREE.Mesh[] = [];

    gltf.scene.traverse((child: THREE.Object3D) => {
      if (child instanceof THREE.Mesh) {
        // Give each mesh a name if it doesn't have one
        if (!child.name) {
          child.name = `Object_${extractedMeshes.length + 1}`;
        }
        extractedMeshes.push(child);

        // Store original material
        child.userData['originalMaterial'] = child.material;
      }
    });

    setMeshes(extractedMeshes);

    // Auto-center and scale
    const box = new THREE.Box3().setFromObject(gltf.scene);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    // Calculate optimal scale to fit model nicely in view
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 5 / maxDim; // Reduced scale for closer view

    // Center the model at origin
    gltf.scene.position.x = -center.x * scale;
    gltf.scene.position.z = -center.z * scale;
    gltf.scene.position.y = -box.min.y * scale; // Place bottom of model on grid
    gltf.scene.scale.setScalar(scale);

    // Store scale for camera calculations
    setModelScale(scale);

    // Calculate scaled dimensions
    const scaledHeight = size.y * scale;
    const scaledWidth = size.x * scale;
    const scaledDepth = size.z * scale;

    // Position camera to frame the model properly - closer view
    const distance = Math.max(scaledWidth, scaledDepth, scaledHeight) * 1.2; // Reduced multiplier
    const cameraHeight = scaledHeight * 0.5 + 2; // Simpler height calculation

    camera.position.set(distance, cameraHeight, distance);
    camera.lookAt(0, scaledHeight * 0.3, 0); // Look slightly lower on the model
    camera.updateProjectionMatrix();
  }, [gltf, camera, annotations]);

  // Handle mesh click
  const handleMeshClick = (event: any, mesh: THREE.Mesh) => {
    event.stopPropagation();
    const point = event.point;
    onObjectClick(mesh, point);
  };

  // Handle mesh hover
  const handleMeshHover = (mesh: THREE.Mesh | null) => {
    // Reset previous hovered mesh if it's not the clicked mesh
    if (hoveredMesh && hoveredMesh !== mesh && hoveredMesh !== clickedMesh) {
      hoveredMesh.material = hoveredMesh.userData['originalMaterial'];
    }

    // Highlight new hovered mesh
    if (mesh && mesh !== clickedMesh) {
      const highlightMaterial = new THREE.MeshStandardMaterial({
        color: 0xffff00,
        emissive: 0xffff00,
        emissiveIntensity: 0.2
      });
      mesh.material = highlightMaterial;
    }

    setHoveredMesh(mesh);
  };

  // Get material for mesh based on state
  const getMeshMaterial = (mesh: THREE.Mesh) => {
    if (clickedMesh === mesh) {
      // Clicked mesh - green highlight
      return new THREE.MeshStandardMaterial({
        color: 0x00ff00,
        emissive: 0x00ff00,
        emissiveIntensity: 0.3
      });
    } else if (hoveredMesh === mesh) {
      // Hovered mesh - yellow highlight
      return new THREE.MeshStandardMaterial({
        color: 0xffff00,
        emissive: 0xffff00,
        emissiveIntensity: 0.2
      });
    } else {
      // Default material
      return mesh.userData['originalMaterial'];
    }
  };

  return (
    <>
      {/* Render meshes with click handlers */}
      {meshes.map((mesh, index) => (
        <mesh
          key={`${mesh.name}_${index}`}
          geometry={mesh.geometry}
          material={getMeshMaterial(mesh)}
          position={mesh.position}
          rotation={mesh.rotation}
          scale={mesh.scale}
          onClick={(e) => handleMeshClick(e, mesh)}
          onPointerOver={(e) => {
            e.stopPropagation();
            handleMeshHover(mesh);
            document.body.style.cursor = 'pointer';
          }}
          onPointerOut={(e) => {
            e.stopPropagation();
            if (mesh !== clickedMesh) {
              handleMeshHover(null);
            }
            document.body.style.cursor = 'default';
          }}
        />
      ))}

      {/* Show annotation marker on clicked object */}
      {clickedMesh && targetPosition && (
        <mesh position={targetPosition}>
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshStandardMaterial
            color="#00ff00"
            emissive="#00ff00"
            emissiveIntensity={0.5}
            transparent
            opacity={0.8}
          />
        </mesh>
      )}

      {/* Annotation markers */}
      {annotations.map((annotation, idx) => (
        <AnnotationMarker
          key={annotation.id || idx}
          annotation={annotation}
          onClick={() => onAnnotationClick(annotation)}
        />
      ))}

      {/* OrbitControls with ref */}
      <OrbitControls
        ref={controlsRef}
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={0.5}
        maxDistance={100}
        maxPolarAngle={Math.PI * 0.85}
        makeDefault
      />
    </>
  );
}

// Main Viewer Component
export default function ModelViewerWithAnnotations({
  modelUrl,
  annotations
}: ModelViewerWithAnnotationsProps) {
  const [selectedAnnotation, setSelectedAnnotation] = useState<Annotation | null>(null);
  const [showAnnotationInfo, setShowAnnotationInfo] = useState(false);
  const [targetPosition, setTargetPosition] = useState<THREE.Vector3 | null>(null);
  const [clickedMesh, setClickedMesh] = useState<THREE.Mesh | null>(null);

  const handleAnnotationClick = (annotation: Annotation) => {
    setSelectedAnnotation(annotation);
    setShowAnnotationInfo(true);
    // Set camera target to annotation position
    setTargetPosition(new THREE.Vector3(
      annotation.position_x,
      annotation.position_y,
      annotation.position_z
    ));
  };

  const handleObjectClick = (mesh: THREE.Mesh, point: THREE.Vector3) => {
    // Set the clicked mesh and target position
    setClickedMesh(mesh);
    setTargetPosition(point.clone());

    // Check if there's an annotation for this object
    const annotation = annotations.find(a => a.object_name === mesh.name);
    if (annotation) {
      setSelectedAnnotation(annotation);
      setShowAnnotationInfo(true);
    } else {
      // Show object info even without annotation
      setSelectedAnnotation({
        id: 'temp_' + Date.now(),
        model_id: '',
        object_name: mesh.name || 'Unnamed Object',
        title: mesh.name || 'Unnamed Object',
        description: 'Click location on ' + (mesh.name || 'object'),
        position_x: point.x,
        position_y: point.y,
        position_z: point.z,
        created_at: new Date().toISOString()
      });
      setShowAnnotationInfo(true);
    }
  };

  const handleClosePanel = () => {
    setSelectedAnnotation(null);
    setShowAnnotationInfo(false);
    setClickedMesh(null);
    setTargetPosition(null);
  };

  return (
    <div className="relative w-full h-full">
      <Canvas
        shadows
        camera={{ position: [5, 4, 5], fov: 50 }} // Closer initial position
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
          {/* Removed fog - was making models appear white */}

          {/* Lighting */}
          <ambientLight intensity={1.2} />
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
                onObjectClick={handleObjectClick}
                targetPosition={targetPosition}
                clickedMesh={clickedMesh}
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

          {/* Controls are now inside ModelWithAnnotations component */}

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
      {selectedAnnotation && showAnnotationInfo && (
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
                onClick={() => handleAnnotationClick(ann)}
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