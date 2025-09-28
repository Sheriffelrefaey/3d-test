'use client';

import React, { useState, useRef, useCallback, useEffect, Suspense } from 'react';
import { Canvas, useThree, useLoader } from '@react-three/fiber';
import {
  OrbitControls,
  Environment,
  Grid,
  GizmoHelper,
  GizmoViewport,
  Html,
  TransformControls
} from '@react-three/drei';
import * as THREE from 'three';
import { Save, Undo, Redo } from 'lucide-react';

// Components
import MaterialPanel from '@/components/editor/MaterialPanel';
import EnvironmentPanel from '@/components/editor/EnvironmentPanel';
import AnnotationPanel from '@/components/ui/AnnotationPanel';

// Store and utilities
import { useEditorStore } from '@/lib/store/editorStore';
import { materialToThreeJS } from '@/lib/materials/presets';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Types
import type {
  Annotation,
  ObjectMaterial,
} from '@/types';

interface EnhancedModelEditorProps {
  modelUrl: string;
  modelId: string;
  annotations: Annotation[];
  onAnnotationsChange: (annotations: Annotation[]) => void;
  onSave: () => void;
}

// Enhanced 3D Scene Component
function EnhancedScene({
  modelUrl,
  annotations,
  onObjectSelect,
  selectedObject
}: {
  modelUrl: string;
  annotations: Annotation[];
  onObjectSelect: (object: THREE.Object3D | null, point: THREE.Vector3 | null) => void;
  selectedObject: THREE.Object3D | null;
}) {
  const gltf = useLoader(GLTFLoader, modelUrl);
  const { camera, scene } = useThree();
  const [meshes, setMeshes] = useState<THREE.Mesh[]>([]);
  const transformControlsRef = useRef<any>(null);

  // Get store state
  const {
    materials,
    transforms,
    environment,
    selectedObject: _selectedObjectName
  } = useEditorStore();

  // Extract meshes from model
  useEffect(() => {
    const extractedMeshes: THREE.Mesh[] = [];

    gltf.scene.traverse((child: THREE.Object3D) => {
      if (child instanceof THREE.Mesh) {
        if (!child.name) {
          child.name = `Object_${extractedMeshes.length + 1}`;
        }
        extractedMeshes.push(child);

        // Store original material
        child.userData['originalMaterial'] = child.material;
      }
    });

    setMeshes(extractedMeshes);

    // Auto-center and scale the model
    const box = new THREE.Box3().setFromObject(gltf.scene);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 5 / maxDim;

    gltf.scene.position.x = -center.x * scale;
    gltf.scene.position.z = -center.z * scale;
    gltf.scene.position.y = -box.min.y * scale;
    gltf.scene.scale.setScalar(scale);

    const scaledHeight = size.y * scale;
    const scaledWidth = size.x * scale;
    const scaledDepth = size.z * scale;

    const distance = Math.max(scaledWidth, scaledDepth, scaledHeight) * 1.2;
    const cameraHeight = scaledHeight * 0.5 + 2;

    camera.position.set(distance, cameraHeight, distance);
    camera.lookAt(0, scaledHeight * 0.3, 0);
    camera.updateProjectionMatrix();
  }, [gltf, camera]);

  // Apply materials to meshes
  useEffect(() => {
    meshes.forEach(mesh => {
      const material = materials.get(mesh.name);
      if (material) {
        // Apply material properties
        const threeParams = materialToThreeJS(material);
        mesh.material = new THREE.MeshPhysicalMaterial(threeParams);
      } else {
        // Reset to original material
        mesh.material = mesh.userData['originalMaterial'] || mesh.material;
      }
    });
  }, [materials, meshes]);

  // Apply transforms to meshes
  useEffect(() => {
    meshes.forEach(mesh => {
      const transform = transforms.get(mesh.name);
      if (transform) {
        mesh.visible = transform.visible && !transform.deleted;
        if (transform.position) {
          mesh.position.set(transform.position.x, transform.position.y, transform.position.z);
        }
        if (transform.rotation) {
          mesh.rotation.set(transform.rotation.x, transform.rotation.y, transform.rotation.z);
        }
        if (transform.scale) {
          mesh.scale.set(transform.scale.x, transform.scale.y, transform.scale.z);
        }
      }
    });
  }, [transforms, meshes]);

  // Apply environment settings
  useEffect(() => {
    if (!environment) return;

    // Apply fog
    if (environment.fog.enabled) {
      scene.fog = new THREE.Fog(
        `rgb(${environment.fog.color.r}, ${environment.fog.color.g}, ${environment.fog.color.b})`,
        environment.fog.near,
        environment.fog.far
      );
    } else {
      scene.fog = null;
    }

    // Apply background
    if (environment.background.type === 'solid' && environment.background.color) {
      const color = environment.background.color;
      scene.background = new THREE.Color(`rgb(${color.r}, ${color.g}, ${color.b})`);
    } else if (environment.background.type === 'gradient' && environment.background.gradient) {
      // Create gradient texture
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d')!;

      const gradient = environment.background.gradient;
      let grd: CanvasGradient;

      if (gradient.type === 'linear') {
        const angle = (gradient.angle || 90) * Math.PI / 180;
        const x1 = 256 - Math.cos(angle) * 256;
        const y1 = 256 - Math.sin(angle) * 256;
        const x2 = 256 + Math.cos(angle) * 256;
        const y2 = 256 + Math.sin(angle) * 256;
        grd = ctx.createLinearGradient(x1, y1, x2, y2);
      } else {
        grd = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
      }

      gradient.stops.forEach(stop => {
        grd.addColorStop(
          stop.position,
          `rgba(${stop.color.r}, ${stop.color.g}, ${stop.color.b}, ${stop.color.a || 1})`
        );
      });

      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, 512, 512);

      const texture = new THREE.CanvasTexture(canvas);
      scene.background = texture;
    }
  }, [environment, scene]);

  // Handle mesh click
  const handleMeshClick = (event: any, mesh: THREE.Mesh) => {
    event.stopPropagation();
    onObjectSelect(mesh, event.point);
    useEditorStore.getState().selectObject(mesh.name);
  };

  return (
    <>
      {/* Dynamic Lighting based on environment */}
      {environment && (
        <>
          <ambientLight
            intensity={environment.lighting.ambient.intensity}
            color={new THREE.Color(
              environment.lighting.ambient.color.r / 255,
              environment.lighting.ambient.color.g / 255,
              environment.lighting.ambient.color.b / 255
            )}
          />
          {environment.lighting.directional.map((light, index) => (
            <directionalLight
              key={index}
              position={[light.position.x, light.position.y, light.position.z]}
              intensity={light.intensity}
              color={new THREE.Color(
                light.color.r / 255,
                light.color.g / 255,
                light.color.b / 255
              )}
              castShadow={light.castShadow}
            />
          ))}
        </>
      )}

      {/* Default Environment if not set */}
      {(!environment || environment.background.type === 'environment') && (
        <Environment preset={environment?.background.environmentPreset as any || 'studio'} />
      )}

      {/* Grid */}
      {environment?.grid.show && (
        <Grid
          infiniteGrid
          fadeDistance={30}
          fadeStrength={1}
          cellSize={0.5}
          sectionSize={environment.grid.divisions / 4}
          sectionColor={`rgb(${environment.grid.color.r}, ${environment.grid.color.g}, ${environment.grid.color.b})`}
          cellColor={`rgb(${environment.grid.color.r}, ${environment.grid.color.g}, ${environment.grid.color.b})`}
          args={[environment.grid.size, environment.grid.size]}
        />
      )}

      {/* Render meshes */}
      {meshes.map((mesh, index) => (
        <mesh
          key={`${mesh.name}_${index}`}
          geometry={mesh.geometry}
          material={mesh.material}
          position={mesh.position}
          rotation={mesh.rotation}
          scale={mesh.scale}
          visible={mesh.visible}
          onClick={(e) => handleMeshClick(e, mesh)}
          onPointerOver={(e) => {
            e.stopPropagation();
            document.body.style.cursor = 'pointer';
          }}
          onPointerOut={(e) => {
            e.stopPropagation();
            document.body.style.cursor = 'default';
          }}
        />
      ))}

      {/* Transform controls for selected object */}
      {selectedObject && (
        <TransformControls
          ref={transformControlsRef}
          object={selectedObject}
          mode="translate"
        />
      )}

      {/* Annotations */}
      {annotations.map((annotation, idx) => (
        <group key={annotation.id || idx}>
          <mesh position={[annotation.position_x, annotation.position_y, annotation.position_z]}>
            <sphereGeometry args={[0.1, 16, 16]} />
            <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={0.5} />
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

      {/* Controls */}
      <OrbitControls
        makeDefault
        enablePan
        enableZoom
        enableRotate
        minDistance={0.5}
        maxDistance={100}
        maxPolarAngle={Math.PI * 0.85}
        target={[0, 0.5, 0]}
      />

      <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
        <GizmoViewport />
      </GizmoHelper>
    </>
  );
}

// Main Enhanced Editor Component
export default function EnhancedModelEditor({
  modelUrl,
  modelId,
  annotations,
  onAnnotationsChange,
  onSave
}: EnhancedModelEditorProps) {
  const [selectedObject, setSelectedObject] = useState<THREE.Object3D | null>(null);
  const [selectedAnnotation, setSelectedAnnotation] = useState<Annotation | null>(null);
  const [showAnnotationPanel, setShowAnnotationPanel] = useState(false);
  const [activePanel, setActivePanel] = useState<'material' | 'environment' | 'annotations'>('material');

  // Initialize store
  const {
    setModelId,
    selectedObject: selectedObjectName,
    materials,
    environment,
    setEnvironment,
    setMaterial,
    deleteObject,
    toggleObjectVisibility,
    hasUnsavedChanges,
    saveState,
    undo,
    redo
  } = useEditorStore();

  // Initialize model in store - only run once when modelId changes
  useEffect(() => {
    setModelId(modelId);
  }, [modelId, setModelId]);

  // Initialize environment separately - only if not set
  useEffect(() => {
    // Only initialize if environment is not set or doesn't match current model
    if (!environment || environment.model_id !== modelId) {
      setEnvironment({
        model_id: modelId,
        background: {
          type: 'solid',
          color: { r: 245, g: 245, b: 245, a: 1 }
        },
        fog: {
          enabled: false,
          color: { r: 255, g: 255, b: 255, a: 1 },
          near: 10,
          far: 100,
          density: 0.01
        },
        lighting: {
          ambient: {
            color: { r: 255, g: 255, b: 255, a: 1 },
            intensity: 1.2
          },
          directional: [
            {
              color: { r: 255, g: 255, b: 255, a: 1 },
              intensity: 3,
              position: { x: 10, y: 10, z: 5 },
              castShadow: true
            },
            {
              color: { r: 255, g: 255, b: 255, a: 1 },
              intensity: 2,
              position: { x: -5, y: 5, z: -5 },
              castShadow: false
            }
          ],
          points: []
        },
        grid: {
          show: true,
          color: { r: 156, g: 163, b: 175, a: 1 },
          size: 20,
          divisions: 20,
          opacity: 0.5
        }
      });
    }
  }, [modelId, setEnvironment]); // Removed environment from dependencies to prevent loop

  // Handle object selection
  const handleObjectSelect = useCallback((object: THREE.Object3D | null, point: THREE.Vector3 | null) => {
    setSelectedObject(object);

    if (object && point) {
      // Check for existing annotation
      const existingAnnotation = annotations.find(a => a.object_name === object.name);

      if (existingAnnotation) {
        setSelectedAnnotation(existingAnnotation);
      } else {
        // Create new annotation
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

      // Initialize material if not exists
      if (object.name && !materials.get(object.name)) {
        const defaultMaterial: ObjectMaterial = {
          model_id: modelId,
          object_name: object.name,
          material_type: 'custom',
          color: { r: 255, g: 255, b: 255, a: 1 },
          properties: {
            metalness: 0,
            roughness: 0.5,
            opacity: 1,
            emissive: { r: 0, g: 0, b: 0 },
            emissiveIntensity: 0
          }
        };
        setMaterial(object.name, defaultMaterial);
      }

      setShowAnnotationPanel(true);
    } else {
      setShowAnnotationPanel(false);
      setSelectedAnnotation(null);
    }
  }, [annotations, modelId, materials, setMaterial]);

  // Handle annotation update
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

  // Handle save
  const handleSaveAll = async () => {
    try {
      await saveState();
      onSave();
      console.warn('All settings saved successfully!');
    } catch (error) {
      console.error('Failed to save:', error);
      console.error('Failed to save settings');
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        if (event.key === 's') {
          event.preventDefault();
          handleSaveAll();
        } else if (event.key === 'z') {
          event.preventDefault();
          undo();
        } else if (event.key === 'y') {
          event.preventDefault();
          redo();
        }
      } else if (event.key === 'Delete' && selectedObjectName) {
        deleteObject(selectedObjectName);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [selectedObjectName, deleteObject, undo, redo]);

  const currentMaterial = selectedObjectName ? (materials.get(selectedObjectName) || null) : null;

  return (
    <div className="relative w-full h-full flex">
      {/* 3D Canvas */}
      <div className="flex-1">
        <Canvas
          camera={{ position: [5, 4, 5], fov: 50 }}
          shadows
          className="bg-gradient-to-b from-gray-100 to-gray-300"
        >
          <Suspense fallback={null}>
            <EnhancedScene
              modelUrl={modelUrl}
              annotations={annotations}
              onObjectSelect={handleObjectSelect}
              selectedObject={selectedObject}
            />
          </Suspense>
        </Canvas>
      </div>

      {/* Control Panels */}
      <div className="w-80 bg-gray-50 border-l border-gray-200 overflow-y-auto">
        {/* Header */}
        <div className="bg-white p-4 border-b border-gray-200 sticky top-0 z-10">
          <h2 className="text-lg font-semibold mb-3">Enhanced 3D Editor</h2>

          {/* Tool Bar */}
          <div className="flex gap-2 mb-3">
            <button
              onClick={handleSaveAll}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              title="Save (Ctrl+S)"
            >
              <Save size={16} />
              Save
            </button>
            <button
              onClick={undo}
              className="p-1.5 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
              title="Undo (Ctrl+Z)"
            >
              <Undo size={16} />
            </button>
            <button
              onClick={redo}
              className="p-1.5 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
              title="Redo (Ctrl+Y)"
            >
              <Redo size={16} />
            </button>
          </div>

          {/* Panel Tabs */}
          <div className="flex gap-1">
            {(['material', 'environment', 'annotations'] as const).map(panel => (
              <button
                key={panel}
                onClick={() => setActivePanel(panel)}
                className={`flex-1 py-2 px-3 rounded text-sm font-medium transition-colors ${
                  activePanel === panel
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {panel.charAt(0).toUpperCase() + panel.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Panel Content */}
        <div className="p-4">
          {activePanel === 'material' && (
            <MaterialPanel
              material={currentMaterial}
              objectName={selectedObjectName || 'No object selected'}
              onChange={(material) => {
                if (selectedObjectName) {
                  setMaterial(selectedObjectName, material);
                }
              }}
              onDelete={() => {
                if (selectedObjectName) {
                  deleteObject(selectedObjectName);
                }
              }}
              onVisibilityToggle={() => {
                if (selectedObjectName) {
                  toggleObjectVisibility(selectedObjectName);
                }
              }}
            />
          )}

          {activePanel === 'environment' && environment && (
            <EnvironmentPanel
              environment={environment}
              onChange={setEnvironment}
            />
          )}

          {activePanel === 'annotations' && showAnnotationPanel && selectedAnnotation && (
            <AnnotationPanel
              annotation={selectedAnnotation}
              onUpdate={handleAnnotationUpdate}
              onDelete={() => {
                const newAnnotations = annotations.filter(a => a.id !== selectedAnnotation.id);
                onAnnotationsChange(newAnnotations);
                setShowAnnotationPanel(false);
                setSelectedAnnotation(null);
              }}
              onClose={() => {
                setShowAnnotationPanel(false);
                setSelectedAnnotation(null);
                setSelectedObject(null);
              }}
            />
          )}
        </div>
      </div>

      {/* Unsaved Changes Indicator */}
      {hasUnsavedChanges && (
        <div className="absolute top-4 right-96 bg-yellow-500 text-white px-3 py-1 rounded-full text-xs font-medium">
          Unsaved changes
        </div>
      )}
    </div>
  );
}