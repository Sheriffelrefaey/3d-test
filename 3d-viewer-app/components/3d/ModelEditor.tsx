'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Canvas, useThree, useLoader, useFrame } from '@react-three/fiber';
import {
  OrbitControls,
  Environment,
  Grid,
  GizmoHelper,
  GizmoViewport,
  Line
} from '@react-three/drei';
import * as THREE from 'three';
import type { Annotation } from '@/types';
// import AnnotationPanel from '@/components/ui/AnnotationPanel';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { HUDAnnotationCard } from './HUDAnnotation';
import { createPortal } from 'react-dom';

interface ModelEditorProps {
  modelUrl: string;
  modelId: string;
  annotations: Annotation[];
  onAnnotationsChange: (annotations: Annotation[]) => void;
  onSave: (annotations: Annotation[]) => void;
}

interface ClickableObjectProps {
  object: THREE.Object3D;
  onSelect: (object: THREE.Object3D, point: THREE.Vector3) => void;
  isSelected: boolean;
}

// Component for making objects clickable with HUD glow effect
function ClickableObject({ object, onSelect, isSelected }: ClickableObjectProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const glowRef = useRef<THREE.Mesh>(null);

  useEffect(() => {
    if (object instanceof THREE.Mesh && meshRef.current) {
      meshRef.current.geometry = object.geometry;
      meshRef.current.material = object.material;
      meshRef.current.position.copy(object.position);
      meshRef.current.rotation.copy(object.rotation);
      meshRef.current.scale.copy(object.scale);
    }
  }, [object]);

  // Pulsing glow animation
  useFrame(({ clock }) => {
    if (glowRef.current && isSelected) {
      const pulse = Math.sin(clock.getElapsedTime() * 2) * 0.5 + 0.5;
      const material = glowRef.current.material;
      if (material && !Array.isArray(material) && 'emissiveIntensity' in material) {
        (material as any).emissiveIntensity = 0.3 + pulse * 0.3;
      }
      if (material && !Array.isArray(material) && 'opacity' in material) {
        (material as any).opacity = 0.3 + pulse * 0.2;
      }
    }
  });

  const handleClick = (event: { stopPropagation: () => void; point: THREE.Vector3 }) => {
    event.stopPropagation();
    onSelect(object, event.point);
  };

  if (!(object instanceof THREE.Mesh)) {
    return null;
  }

  return (
    <>
      <mesh
        ref={meshRef}
        onClick={handleClick}
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
        geometry={object.geometry}
        material={object.material}
        position={object.position}
        rotation={object.rotation}
        scale={object.scale}
        name={object.name}
      />
      {/* Glow overlay for selected objects */}
      {isSelected && (
        <mesh
          ref={glowRef}
          geometry={object.geometry}
          position={object.position}
          rotation={object.rotation}
          scale={object.scale}
        >
          <meshStandardMaterial
            color="#3b82f6"
            emissive="#3b82f6"
            emissiveIntensity={0.5}
            transparent
            opacity={0.4}
            side={THREE.FrontSide}
          />
        </mesh>
      )}
      {/* Hover highlight */}
      {hovered && !isSelected && (
        <mesh
          geometry={object.geometry}
          position={object.position}
          rotation={object.rotation}
          scale={object.scale}
        >
          <meshStandardMaterial
            color="#60a5fa"
            emissive="#60a5fa"
            emissiveIntensity={0.2}
            transparent
            opacity={0.2}
            side={THREE.FrontSide}
          />
        </mesh>
      )}
    </>
  );
}

// Animated connection line component
function AnimatedConnectionLine({ startPos, endPos, isVisible }: {
  startPos: THREE.Vector3 | null;
  endPos: THREE.Vector3 | null;
  isVisible: boolean;
}) {
  const [lineProgress, setLineProgress] = useState(0);
  const lineRef = useRef<any>(null);

  useFrame(() => {
    if (isVisible && lineProgress < 1) {
      setLineProgress(prev => Math.min(prev + 0.08, 1));
    } else if (!isVisible && lineProgress > 0) {
      setLineProgress(prev => Math.max(prev - 0.08, 0));
    }
  });

  if (!startPos || !endPos || lineProgress === 0) return null;

  const currentEnd = new THREE.Vector3().lerpVectors(startPos, endPos, lineProgress);

  return (
    <>
      <Line
        ref={lineRef}
        points={[startPos, currentEnd]}
        color="#3b82f6"
        lineWidth={3}
        transparent
        opacity={0.8 * lineProgress}
      />
      {lineProgress > 0.9 && (
        <mesh position={endPos}>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshStandardMaterial
            color="#3b82f6"
            emissive="#3b82f6"
            emissiveIntensity={1.5}
            transparent
            opacity={0.9}
          />
        </mesh>
      )}
    </>
  );
}

// Main 3D Scene Component
function Scene({
  modelUrl,
  annotations: _annotations,
  onObjectSelect,
  selectedObject,
  selectedAnnotation,
  clickPosition
}: {
  modelUrl: string;
  annotations: Annotation[];
  onObjectSelect: (object: THREE.Object3D | null, point: THREE.Vector3 | null) => void;
  selectedObject: THREE.Object3D | null;
  selectedAnnotation: Annotation | null;
  clickPosition: THREE.Vector3 | null;
}) {
  const gltf = useLoader(GLTFLoader, modelUrl);
  const { camera } = useThree();
  const [meshes, setMeshes] = useState<THREE.Object3D[]>([]);

  useEffect(() => {
    // Extract all meshes from the model
    const extractedMeshes: THREE.Object3D[] = [];

    gltf.scene.traverse((child: THREE.Object3D) => {
      if (child instanceof THREE.Mesh) {
        // Set a name if it doesn't have one
        if (!child.name) {
          child.name = `Object_${extractedMeshes.length + 1}`;
        }
        extractedMeshes.push(child);
      }
    });

    setMeshes(extractedMeshes);

    // Auto-center and scale the model
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
  }, [gltf, camera]);

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={1.2} />
      <directionalLight position={[10, 10, 5]} intensity={3} castShadow />
      <directionalLight position={[-5, 5, -5]} intensity={2} />
      <directionalLight position={[0, -5, 0]} intensity={1.5} />
      <pointLight position={[0, 10, 0]} intensity={2} />
      <Environment preset="studio" background={false} />

      {/* Grid */}
      <Grid
        infiniteGrid
        fadeDistance={30}
        fadeStrength={1}
        cellSize={0.5}
        sectionSize={5}
        sectionColor="#888"
      />

      {/* Render clickable meshes */}
      <group>
        {meshes.map((mesh, index) => (
          <ClickableObject
            key={`${mesh.name}_${index}`}
            object={mesh}
            onSelect={onObjectSelect}
            isSelected={selectedObject === mesh}
          />
        ))}
      </group>

      {/* Annotations are now only visible when objects are selected - no always-visible markers */}

      {/* Connection line from object to annotation point */}
      {selectedAnnotation && clickPosition && (
        <AnimatedConnectionLine
          startPos={clickPosition}
          endPos={new THREE.Vector3(
            selectedAnnotation.position_x,
            selectedAnnotation.position_y,
            selectedAnnotation.position_z
          )}
          isVisible={true}
        />
      )}

      {/* Controls */}
      <OrbitControls
        makeDefault
        enablePan
        enableZoom
        enableRotate
        minDistance={0.5}
        maxDistance={100}
        maxPolarAngle={Math.PI * 0.85}
        target={[0, 0.5, 0]} // Lower target for better centering
      />
      <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
        <GizmoViewport />
      </GizmoHelper>
    </>
  );
}

// Main Editor Component
export default function ModelEditor({
  modelUrl,
  modelId,
  annotations,
  onAnnotationsChange,
  onSave: _onSave
}: ModelEditorProps) {
  const [selectedObject, setSelectedObject] = useState<THREE.Object3D | null>(null);
  const [selectedAnnotation, setSelectedAnnotation] = useState<Annotation | null>(null);
  const [clickPosition, setClickPosition] = useState<THREE.Vector3 | null>(null);
  const [_showPanel, _setShowPanel] = useState(false);
  const [screenPosition, setScreenPosition] = useState<{ x: number; y: number } | null>(null);
  const [showHUD, setShowHUD] = useState(false);

  const handleObjectSelect = useCallback((object: THREE.Object3D | null, point: THREE.Vector3 | null) => {
    setSelectedObject(object);
    setClickPosition(point);

    if (object && point) {
      // Check if there's an existing annotation for this object
      const existingAnnotation = annotations.find(a => a.object_name === object.name);

      if (existingAnnotation) {
        setSelectedAnnotation(existingAnnotation);
      } else {
        // Create a new annotation
        const newAnnotation: Annotation = {
          id: Date.now().toString(),
          model_id: modelId,
          object_name: object.name || 'Unnamed Object',
          title: '',
          description: '',
          position_x: point.x,
          position_y: point.y,
          position_z: point.z,
          created_at: new Date().toISOString(),
        };
        setSelectedAnnotation(newAnnotation);
      }
      _setShowPanel(true);
      setShowHUD(true);
    } else {
      _setShowPanel(false);
      setSelectedAnnotation(null);
      setShowHUD(false);
      setScreenPosition(null);
    }
  }, [annotations, modelId]);

  // @ts-expect-error - Unused but kept for reference
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _handleAnnotationUpdate = useCallback((updatedAnnotation: Annotation) => {
    const existingIndex = annotations.findIndex(a =>
      a.id === updatedAnnotation.id || a.object_name === updatedAnnotation.object_name
    );

    let newAnnotations: Annotation[];
    if (existingIndex >= 0) {
      newAnnotations = [...annotations];
      newAnnotations[existingIndex] = updatedAnnotation;
    } else {
      newAnnotations = [...annotations, updatedAnnotation];
    }

    onAnnotationsChange(newAnnotations);
    setSelectedAnnotation(updatedAnnotation);
  }, [annotations, onAnnotationsChange]);

  const handleAnnotationDelete = useCallback((annotation: Annotation) => {
    const newAnnotations = annotations.filter(a =>
      a.id !== annotation.id && a.object_name !== annotation.object_name
    );
    onAnnotationsChange(newAnnotations);
    setSelectedAnnotation(null);
    _setShowPanel(false);
  }, [annotations, onAnnotationsChange]);

  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      setSelectedObject(null);
      setSelectedAnnotation(null);
      _setShowPanel(false);
    } else if (event.key === 'Delete' && selectedAnnotation) {
      handleAnnotationDelete(selectedAnnotation);
    }
  }, [selectedAnnotation, handleAnnotationDelete]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  return (
    <div className="relative w-full h-full">
      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [5, 4, 5], fov: 50 }} // Closer initial position
        shadows
        className="bg-gradient-to-b from-gray-100 to-gray-300"
        onCreated={({ gl, camera }) => {
          // Update screen position when camera moves
          const updateScreenPos = () => {
            if (clickPosition) {
              const vector = clickPosition.clone();
              vector.project(camera);
              const x = (vector.x * 0.5 + 0.5) * gl.domElement.clientWidth;
              const y = (-vector.y * 0.5 + 0.5) * gl.domElement.clientHeight;
              setScreenPosition({ x, y });
            }
          };
          gl.domElement.addEventListener('mousemove', updateScreenPos);
          gl.domElement.addEventListener('wheel', updateScreenPos);
        }}
      >
        <Scene
          modelUrl={modelUrl}
          annotations={annotations}
          onObjectSelect={handleObjectSelect}
          selectedObject={selectedObject}
          selectedAnnotation={selectedAnnotation}
          clickPosition={clickPosition}
        />
      </Canvas>

      {/* HUD Annotation Card */}
      {typeof window !== 'undefined' && document.body && screenPosition && (
        createPortal(
          <HUDAnnotationCard
            annotation={selectedAnnotation}
            screenPosition={screenPosition}
            onClose={() => {
              setShowHUD(false);
              setSelectedAnnotation(null);
              setSelectedObject(null);
              setClickPosition(null);
              _setShowPanel(false);
            }}
            isVisible={showHUD}
          />,
          document.body
        )
      )}

      {/* Keep the traditional annotation panel hidden but available for editing */}
      {/* {showPanel && selectedAnnotation && false && (
        <AnnotationPanel
          annotation={selectedAnnotation}
          onUpdate={handleAnnotationUpdate}
          onDelete={handleAnnotationDelete}
          onClose={() => {
            _setShowPanel(false);
            setSelectedAnnotation(null);
            setSelectedObject(null);
            setClickPosition(null);
          }}
        />
      )} */}

      {/* Updated Instructions */}
      <div className="absolute top-4 left-4 bg-gray-900/90 backdrop-blur-md p-4 rounded-lg shadow-lg max-w-sm border border-blue-500/30"
        style={{ boxShadow: '0 0 20px rgba(59, 130, 246, 0.2)' }}
      >
        <h3 className="font-semibold mb-2 text-blue-100">HUD Mode Instructions:</h3>
        <ul className="text-sm space-y-1 text-gray-300">
          <li className="flex items-center gap-2">
            <span className="text-blue-400">•</span>
            Click any object to view its annotation
          </li>
          <li className="flex items-center gap-2">
            <span className="text-blue-400">•</span>
            Selected objects glow with blue highlight
          </li>
          <li className="flex items-center gap-2">
            <span className="text-blue-400">•</span>
            HUD displays annotation details
          </li>
          <li className="flex items-center gap-2">
            <span className="text-blue-400">•</span>
            Press ESC to deselect
          </li>
          <li className="flex items-center gap-2">
            <span className="text-blue-400">•</span>
            Use mouse to navigate the 3D view
          </li>
        </ul>
      </div>

      {/* Annotation List */}
      <div className="absolute bottom-4 right-4 bg-white/90 p-4 rounded-lg shadow-lg max-w-sm max-h-64 overflow-y-auto">
        <h3 className="font-semibold mb-2">Annotations ({annotations.length}):</h3>
        {annotations.length === 0 ? (
          <p className="text-sm text-gray-500">No annotations yet</p>
        ) : (
          <ul className="text-sm space-y-1">
            {annotations.map((ann, idx) => (
              <li
                key={ann.id || idx}
                className="flex justify-between items-center hover:bg-gray-100 p-1 rounded cursor-pointer"
                onClick={() => {
                  setSelectedAnnotation(ann);
                  _setShowPanel(true);
                }}
              >
                <span className="font-medium">{ann.object_name}</span>
                <span className="text-gray-600">{ann.title || 'Untitled'}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}