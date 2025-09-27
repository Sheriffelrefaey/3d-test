'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Canvas, useThree, useLoader } from '@react-three/fiber';
import {
  OrbitControls,
  Environment,
  Grid,
  GizmoHelper,
  GizmoViewport,
  Html
} from '@react-three/drei';
import * as THREE from 'three';
import type { Annotation } from '@/types';
import AnnotationPanel from '@/components/ui/AnnotationPanel';
import { getGLTFLoader } from '@/lib/three/loaders';

interface ModelEditorProps {
  modelUrl: string;
  annotations: Annotation[];
  onAnnotationsChange: (annotations: Annotation[]) => void;
  onSave: (annotations: Annotation[]) => void;
}

interface ClickableObjectProps {
  object: THREE.Object3D;
  onSelect: (object: THREE.Object3D, point: THREE.Vector3) => void;
  isSelected: boolean;
}

// Component for making objects clickable
function ClickableObject({ object, onSelect, isSelected }: ClickableObjectProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (object instanceof THREE.Mesh && meshRef.current) {
      meshRef.current.geometry = object.geometry;
      meshRef.current.material = object.material;
      meshRef.current.position.copy(object.position);
      meshRef.current.rotation.copy(object.rotation);
      meshRef.current.scale.copy(object.scale);
    }
  }, [object]);

  const handleClick = (event: { stopPropagation: () => void; point: THREE.Vector3 }) => {
    event.stopPropagation();
    onSelect(object, event.point);
  };

  // Create highlight material
  const highlightMaterial = new THREE.MeshStandardMaterial({
    color: isSelected ? 0x00ff00 : (hovered ? 0xffff00 : 0xffffff),
    emissive: isSelected ? 0x00ff00 : (hovered ? 0xffff00 : 0x000000),
    emissiveIntensity: isSelected ? 0.3 : (hovered ? 0.1 : 0),
  });

  if (!(object instanceof THREE.Mesh)) {
    return null;
  }

  return (
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
      material={isSelected || hovered ? highlightMaterial : object.material}
      position={object.position}
      rotation={object.rotation}
      scale={object.scale}
      name={object.name}
    />
  );
}

// Main 3D Scene Component
function Scene({
  modelUrl,
  annotations,
  onObjectSelect,
  selectedObject,
  selectedAnnotation
}: {
  modelUrl: string;
  annotations: Annotation[];
  onObjectSelect: (object: THREE.Object3D | null, point: THREE.Vector3 | null) => void;
  selectedObject: THREE.Object3D | null;
  selectedAnnotation: Annotation | null;
}) {
  const gltf = useLoader(getGLTFLoader, modelUrl);
  const { camera } = useThree();
  const [meshes, setMeshes] = useState<THREE.Object3D[]>([]);

  useEffect(() => {
    // Extract all meshes from the model
    const extractedMeshes: THREE.Object3D[] = [];

    gltf.scene.traverse((child) => {
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
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 5 / maxDim;

    gltf.scene.position.sub(center.multiplyScalar(scale));
    gltf.scene.scale.setScalar(scale);

    // Adjust camera
    camera.position.set(5, 5, 5);
    camera.lookAt(0, 0, 0);
  }, [gltf, camera]);

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <Environment preset="studio" />

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

      {/* Render annotation markers */}
      {annotations.map((annotation, index) => (
        <group key={annotation.id || index}>
          <mesh
            position={[annotation.position_x, annotation.position_y, annotation.position_z]}
            onClick={(e) => {
              e.stopPropagation();
              // Select this annotation when clicked
              const existingAnnotation = annotations.find(a => a.id === annotation.id);
              if (existingAnnotation && onObjectSelect) {
                onObjectSelect(null, new THREE.Vector3(annotation.position_x, annotation.position_y, annotation.position_z));
              }
            }}
            onPointerOver={(e) => {
              e.stopPropagation();
              document.body.style.cursor = 'pointer';
            }}
            onPointerOut={(e) => {
              e.stopPropagation();
              document.body.style.cursor = 'default';
            }}
          >
            <sphereGeometry args={[0.1, 16, 16]} />
            <meshStandardMaterial
              color={selectedAnnotation?.id === annotation.id ? "#00ff00" : "#ff0000"}
              emissive={selectedAnnotation?.id === annotation.id ? "#00ff00" : "#ff0000"}
              emissiveIntensity={0.5}
            />
          </mesh>
          <Html
            position={[annotation.position_x, annotation.position_y + 0.2, annotation.position_z]}
            center
          >
            <div className="bg-white px-2 py-1 rounded shadow-lg text-xs whitespace-nowrap pointer-events-none">
              {annotation.title || 'Untitled'}
            </div>
          </Html>
        </group>
      ))}

      {/* Transform controls for selected annotation */}
      {selectedAnnotation && (
        <group>
          <mesh
            position={[
              selectedAnnotation.position_x,
              selectedAnnotation.position_y,
              selectedAnnotation.position_z
            ]}
            visible={false}
          >
            <boxGeometry args={[0.1, 0.1, 0.1]} />
            <meshBasicMaterial />
          </mesh>
        </group>
      )}

      {/* Controls */}
      <OrbitControls makeDefault enablePan enableZoom enableRotate />
      <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
        <GizmoViewport />
      </GizmoHelper>
    </>
  );
}

// Main Editor Component
export default function ModelEditor({
  modelUrl,
  annotations,
  onAnnotationsChange,
  onSave: _onSave
}: ModelEditorProps) {
  const [selectedObject, setSelectedObject] = useState<THREE.Object3D | null>(null);
  const [selectedAnnotation, setSelectedAnnotation] = useState<Annotation | null>(null);
  const [_clickPosition, setClickPosition] = useState<THREE.Vector3 | null>(null);
  const [showPanel, setShowPanel] = useState(false);

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
          model_id: '',
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
      setShowPanel(true);
    } else {
      setShowPanel(false);
      setSelectedAnnotation(null);
    }
  }, [annotations]);

  const handleAnnotationUpdate = useCallback((updatedAnnotation: Annotation) => {
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
    setShowPanel(false);
  }, [annotations, onAnnotationsChange]);

  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      setSelectedObject(null);
      setSelectedAnnotation(null);
      setShowPanel(false);
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
        camera={{ position: [5, 5, 5], fov: 50 }}
        shadows
        className="bg-gradient-to-b from-gray-100 to-gray-300"
      >
        <Scene
          modelUrl={modelUrl}
          annotations={annotations}
          onObjectSelect={handleObjectSelect}
          selectedObject={selectedObject}
          selectedAnnotation={selectedAnnotation}
        />
      </Canvas>

      {/* Annotation Panel */}
      {showPanel && selectedAnnotation && (
        <AnnotationPanel
          annotation={selectedAnnotation}
          onUpdate={handleAnnotationUpdate}
          onDelete={handleAnnotationDelete}
          onClose={() => {
            setShowPanel(false);
            setSelectedAnnotation(null);
            setSelectedObject(null);
          }}
        />
      )}

      {/* Instructions */}
      <div className="absolute top-4 left-4 bg-white/90 p-4 rounded-lg shadow-lg max-w-sm">
        <h3 className="font-semibold mb-2">Instructions:</h3>
        <ul className="text-sm space-y-1">
          <li>• Click on any object to add/edit annotation</li>
          <li>• Use mouse to rotate, zoom, and pan the view</li>
          <li>• Drag annotation markers to reposition them</li>
          <li>• Press ESC to deselect</li>
          <li>• Press Delete to remove selected annotation</li>
          <li>• Click Save to persist all changes</li>
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
                  setShowPanel(true);
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