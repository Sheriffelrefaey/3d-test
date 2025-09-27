'use client';

import React, { useState, useRef, useCallback, useEffect, Suspense } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Canvas, useThree, useLoader, useFrame } from '@react-three/fiber';
import { createPortal } from 'react-dom';
import toast, { Toaster } from 'react-hot-toast';
import {
  OrbitControls,
  Environment,
  Grid,
  GizmoHelper,
  GizmoViewport,
  Html,
  TransformControls,
  PerspectiveCamera,
  Line
} from '@react-three/drei';
import * as THREE from 'three';
import {
  Save,
  Undo,
  Redo,
  Download,
  Upload,
  Settings2,
  Eye,
  EyeOff,
  Trash2,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Palette,
  Lightbulb,
  Layers,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

// Components
import MaterialPanel from '@/components/editor/MaterialPanel';
import EnvironmentPanel from '@/components/editor/EnvironmentPanel';
import AnnotationPanel from '@/components/ui/AnnotationPanel';
import ObjectHierarchyPanel from '@/components/editor/ObjectHierarchyPanel';
import { HUDAnnotationCard } from './HUDAnnotation';

// Store and utilities
import { useEditorStore } from '@/lib/store/editorStore';
import { materialToThreeJS } from '@/lib/materials/presets';
import { getGLTFLoader } from '@/lib/three/loaders';
import { autoGenerateUVs } from '@/lib/three/uvGenerator';

// Types
import type {
  Annotation,
  ObjectMaterial,
  ModelEnvironment
} from '@/types';

// Import glassmorphism styles
import '@/styles/glassmorphism.css';

interface DarkEnhancedModelEditorProps {
  modelUrl: string;
  modelId: string;
  annotations: Annotation[];
  onAnnotationsChange: (annotations: Annotation[]) => void;
  onSave: () => void;
  readOnly?: boolean;  // Optional prop to make it read-only for viewer
}

// Screen position updater component - Projects 3D position above object
function ScreenPositionUpdater({ clickPosition, onScreenPositionUpdate }: {
  clickPosition: THREE.Vector3 | null;
  onScreenPositionUpdate: (pos: { x: number; y: number } | null) => void;
}) {
  const { camera, gl } = useThree();

  useFrame(() => {
    if (clickPosition) {
      // Project a point above the clicked position for the HUD card
      const vector = clickPosition.clone();
      vector.y += 1; // Offset upward in 3D space
      vector.project(camera);
      const x = (vector.x * 0.5 + 0.5) * gl.domElement.clientWidth;
      const y = (-vector.y * 0.5 + 0.5) * gl.domElement.clientHeight;
      onScreenPositionUpdate({ x, y });
    } else {
      onScreenPositionUpdate(null);
    }
  });

  return null;
}

// HUD Glow Material Component
function HUDGlowMaterial({ isSelected }: { isSelected: boolean }) {
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);

  useFrame(({ clock }) => {
    if (materialRef.current && isSelected) {
      const pulse = Math.sin(clock.getElapsedTime() * 2) * 0.5 + 0.5;
      materialRef.current.emissiveIntensity = 0.3 + pulse * 0.3;
      materialRef.current.opacity = 0.3 + pulse * 0.2;
    }
  });

  return (
    <meshStandardMaterial
      ref={materialRef}
      color="#3b82f6"
      emissive="#3b82f6"
      emissiveIntensity={0.5}
      transparent
      opacity={0.4}
      side={THREE.FrontSide}
    />
  );
}

// Animated Connection Line Component - Grows upward from object
function AnimatedConnectionLine({ startPos, endPos, isVisible }: {
  startPos: THREE.Vector3 | null;
  endPos: THREE.Vector3 | null;
  isVisible: boolean;
}) {
  const [lineProgress, setLineProgress] = useState(0);
  const lineRef = useRef<any>();

  useFrame(() => {
    if (isVisible && lineProgress < 1) {
      setLineProgress(prev => Math.min(prev + 0.08, 1));
    } else if (!isVisible && lineProgress > 0) {
      setLineProgress(prev => Math.max(prev - 0.08, 0));
    }
  });

  if (!startPos || lineProgress === 0) return null;

  // Create an upward line from the object position
  const lineStart = startPos.clone();
  const lineEnd = startPos.clone();
  lineEnd.y += 2 * lineProgress; // Grow upward

  // Create control points for a slight curve
  const midPoint = lineStart.clone();
  midPoint.y += 1 * lineProgress;
  midPoint.x += 0.1 * Math.sin(lineProgress * Math.PI);

  return (
    <>
      <Line
        ref={lineRef}
        points={[lineStart, midPoint, lineEnd]}
        color="#3b82f6"
        lineWidth={3}
        transparent
        opacity={0.8 * lineProgress}
      />
      {/* Glowing end point */}
      {lineProgress > 0.5 && (
        <mesh position={lineEnd}>
          <sphereGeometry args={[0.06, 16, 16]} />
          <meshStandardMaterial
            color="#60a5fa"
            emissive="#3b82f6"
            emissiveIntensity={2}
            transparent
            opacity={lineProgress}
          />
        </mesh>
      )}
      {/* Pulse effect at base */}
      <mesh position={lineStart}>
        <ringGeometry args={[0.1 * lineProgress, 0.15 * lineProgress, 32]} />
        <meshBasicMaterial
          color="#3b82f6"
          transparent
          opacity={0.5 * (1 - lineProgress)}
          side={THREE.DoubleSide}
        />
      </mesh>
    </>
  );
}

// Enhanced 3D Scene Component
function EnhancedScene({
  modelUrl,
  annotations,
  onObjectSelect,
  onMultiSelect,
  selectedObject,
  selectedObjects = [],
  selectedMeshNames = [],
  onSceneClick,
  resetViewRef,
  onMeshesLoaded,
  clickPosition,
  selectedAnnotation,
  readOnly = false
}: {
  modelUrl: string;
  annotations: Annotation[];
  onObjectSelect: (object: THREE.Object3D | null, point: THREE.Vector3 | null) => void;
  onMultiSelect?: (objects: THREE.Object3D[], names: string[]) => void;
  selectedObject: THREE.Object3D | null;
  selectedObjects?: THREE.Object3D[];
  selectedMeshNames?: string[];
  onSceneClick: () => void;
  resetViewRef: React.MutableRefObject<(() => void) | null>;
  onMeshesLoaded: (meshes: THREE.Mesh[]) => void;
  clickPosition?: THREE.Vector3 | null;
  selectedAnnotation?: Annotation | null;
  readOnly?: boolean;
}) {
  const gltf = useLoader(getGLTFLoader, modelUrl);
  const { camera, scene } = useThree();
  const [meshes, setMeshes] = useState<THREE.Mesh[]>([]);
  const controlsRef = useRef<any>();
  const initialCameraPosition = useRef<THREE.Vector3>();
  const initialCameraTarget = useRef<THREE.Vector3>();

  // Get store state
  const {
    materials,
    transforms,
    environment,
    selectedObject: selectedObjectName
  } = useEditorStore();

  // Reset view function
  const resetView = useCallback(() => {
    if (controlsRef.current && initialCameraPosition.current && initialCameraTarget.current) {
      camera.position.copy(initialCameraPosition.current);
      controlsRef.current.target.copy(initialCameraTarget.current);
      controlsRef.current.update();
    }
  }, [camera]);

  // Expose reset view to parent
  useEffect(() => {
    resetViewRef.current = resetView;
  }, [resetView, resetViewRef]);

  // Extract meshes from model
  useEffect(() => {
    const extractedMeshes: THREE.Mesh[] = [];
    const nameCount: Map<string, number> = new Map();

    gltf.scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        // Ensure unique names
        if (!child.name || child.name === '') {
          child.name = `Mesh_${extractedMeshes.length + 1}`;
        } else {
          // Check for duplicate names and make them unique
          const baseName = child.name;
          const count = nameCount.get(baseName) || 0;
          if (count > 0) {
            child.name = `${baseName}_${count}`;
          }
          nameCount.set(baseName, count + 1);
        }

        // Add unique ID to userData for key generation
        child.userData.uniqueId = `${child.name}_${child.uuid}`;
        child.userData.originalMaterial = child.material;
        extractedMeshes.push(child);
      }
    });

    setMeshes(extractedMeshes);
    onMeshesLoaded(extractedMeshes);

    // Reset any existing transformations
    gltf.scene.position.set(0, 0, 0);
    gltf.scene.rotation.set(0, 0, 0);
    gltf.scene.scale.set(1, 1, 1);
    gltf.scene.updateMatrixWorld(true);

    // Calculate bounds of the unscaled model
    const box = new THREE.Box3().setFromObject(gltf.scene);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    // Calculate scale to fit the model (6x larger)
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 30 / maxDim;  // Changed from 10 to 30 for 6x size

    // Apply scale and center the model at origin
    gltf.scene.scale.setScalar(scale);
    gltf.scene.position.x = -center.x * scale;
    gltf.scene.position.z = -center.z * scale;
    gltf.scene.position.y = -box.min.y * scale;

    const scaledHeight = size.y * scale;
    const scaledWidth = size.x * scale;
    const scaledDepth = size.z * scale;

    // Much closer view with higher angle
    const distance = Math.max(scaledWidth, scaledDepth, scaledHeight) * 0.5;  // Even closer (0.5)
    const cameraHeight = scaledHeight * 0.8 + distance * 0.7;  // Higher camera angle

    // Set camera position and look at origin
    const cameraPos = new THREE.Vector3(distance * 0.7, cameraHeight, distance * 0.7);
    const targetPos = new THREE.Vector3(0, 0, 0);  // Center at origin

    camera.position.copy(cameraPos);
    camera.lookAt(targetPos);
    camera.updateProjectionMatrix();

    // Store initial positions
    initialCameraPosition.current = cameraPos.clone();
    initialCameraTarget.current = targetPos.clone();

    if (controlsRef.current) {
      controlsRef.current.target.copy(targetPos);
      controlsRef.current.update();
    }
  }, [gltf, camera, onMeshesLoaded]);

  // Apply materials to meshes with texture support
  useEffect(() => {
    meshes.forEach(mesh => {
      const material = materials.get(mesh.name);
      if (material) {
        // Check if mesh has UV coordinates - required for textures
        const geometry = mesh.geometry;
        let hasUVs = geometry.attributes.uv && geometry.attributes.uv.count > 0;

        // If no UVs exist and we need to apply a texture, generate them
        if (!hasUVs && material.texture_url) {
          console.log(`No UV coordinates found for "${mesh.name}". Generating UVs...`);
          autoGenerateUVs(geometry, mesh.name);
          hasUVs = geometry.attributes.uv && geometry.attributes.uv.count > 0;
        }

        console.log(`Applying material to mesh "${mesh.name}":`, {
          hasTexture: !!material.texture_url,
          hasUVs: hasUVs,
          textureUrl: material.texture_url ? material.texture_url.substring(0, 50) + '...' : 'none'
        });

        // Create base material parameters
        // If there's a texture, set color to white so texture shows properly
        const hasTexture = material.texture_url && hasUVs;
        const baseParams = {
          color: hasTexture
            ? new THREE.Color(1, 1, 1) // White color to show texture without tinting
            : new THREE.Color(material.color.r / 255, material.color.g / 255, material.color.b / 255),
          metalness: material.properties.metalness,
          roughness: material.properties.roughness,
          opacity: material.properties.opacity,
          transparent: material.properties.opacity < 1,
          emissive: new THREE.Color(
            material.properties.emissive.r / 255,
            material.properties.emissive.g / 255,
            material.properties.emissive.b / 255
          ),
          emissiveIntensity: material.properties.emissiveIntensity,
        };

        // Add optional properties
        if (material.properties.clearcoat !== undefined) {
          baseParams.clearcoat = material.properties.clearcoat;
        }
        if (material.properties.clearcoatRoughness !== undefined) {
          baseParams.clearcoatRoughness = material.properties.clearcoatRoughness;
        }
        if (material.properties.ior !== undefined) {
          baseParams.ior = material.properties.ior;
        }
        if (material.properties.transmission !== undefined) {
          baseParams.transmission = material.properties.transmission;
        }
        if (material.properties.thickness !== undefined) {
          baseParams.thickness = material.properties.thickness;
        }
        if (material.properties.reflectivity !== undefined) {
          baseParams.reflectivity = material.properties.reflectivity;
        }

        // Create the material
        const newMaterial = new THREE.MeshPhysicalMaterial(baseParams);

        // Apply the material immediately
        mesh.material = newMaterial;

        // If there's a texture URL and the mesh has UVs, load and apply texture
        if (material.texture_url && hasUVs) {
          console.log(`Loading texture for "${mesh.name}" from: ${material.texture_url}`);

          const textureLoader = new THREE.TextureLoader();
          textureLoader.load(
            material.texture_url,
            (texture) => {
              console.log(`Texture loaded successfully for "${mesh.name}"`);

              // Apply texture settings if they exist
              if (material.texture_settings) {
                const settings = material.texture_settings;

                // Set texture repeat
                if (settings.repeat) {
                  texture.repeat.set(settings.repeat.x || 1, settings.repeat.y || 1);
                }

                // Set texture offset
                if (settings.offset) {
                  texture.offset.set(settings.offset.x || 0, settings.offset.y || 0);
                }

                // Set texture rotation (in radians)
                if (settings.rotation !== undefined) {
                  texture.rotation = settings.rotation;
                }

                // Set texture center point for rotation
                texture.center.set(0.5, 0.5);

                // Set wrapping mode
                texture.wrapS = settings.wrapS === 'repeat' ? THREE.RepeatWrapping :
                              settings.wrapS === 'mirror' ? THREE.MirroredRepeatWrapping :
                              THREE.ClampToEdgeWrapping;
                texture.wrapT = settings.wrapT === 'repeat' ? THREE.RepeatWrapping :
                              settings.wrapT === 'mirror' ? THREE.MirroredRepeatWrapping :
                              THREE.ClampToEdgeWrapping;
              } else {
                // Default texture settings
                texture.wrapS = THREE.RepeatWrapping;
                texture.wrapT = THREE.RepeatWrapping;
              }

              // Set texture color space for proper rendering
              texture.colorSpace = THREE.SRGBColorSpace;

              // Apply the texture to the existing material on the mesh
              if (mesh.material instanceof THREE.MeshPhysicalMaterial) {
                mesh.material.map = texture;
                mesh.material.needsUpdate = true;

                // Ensure the material color doesn't tint the texture
                mesh.material.color = new THREE.Color(1, 1, 1);

                console.log(`Texture applied to "${mesh.name}"`, {
                  hasMap: !!mesh.material.map,
                  textureUrl: material.texture_url,
                  material: mesh.material
                });
              }
            },
            undefined,
            (error) => {
              console.error(`Failed to load texture for "${mesh.name}":`, error);
              console.error('Texture URL:', material.texture_url);
            }
          );
      } else {
        // No material override, use original
        mesh.material = mesh.userData.originalMaterial || mesh.material;
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

  // Handle mesh click with proper closure
  const handleMeshClick = useCallback((event: any, mesh: THREE.Mesh) => {
    // Check if mesh is deleted
    const transform = transforms.get(mesh.name);
    if (transform?.deleted) {
      return; // Don't select deleted objects
    }

    // Get the actual event object
    const evt = event.nativeEvent || event;
    const isMultiSelect = evt.shiftKey || evt.metaKey || evt.ctrlKey;

    if (isMultiSelect && onMultiSelect) {
      // Multi-select mode
      let newSelectedNames = [...selectedMeshNames];
      let newSelectedObjects = [...selectedObjects];

      // Check if mesh is part of a group
      const groupName = mesh.userData?.group;
      if (groupName) {
        // Get all meshes in the group
        const groupMeshes = meshes.filter(m => m.userData?.group === groupName);
        const groupMeshNames = groupMeshes.map(m => m.name);

        // Toggle group selection
        const allSelected = groupMeshNames.every(name => newSelectedNames.includes(name));
        if (allSelected) {
          // Remove group from selection
          newSelectedNames = newSelectedNames.filter(name => !groupMeshNames.includes(name));
          newSelectedObjects = newSelectedObjects.filter(obj => !groupMeshNames.includes(obj.name || ''));
        } else {
          // Add group to selection
          groupMeshNames.forEach(name => {
            if (!newSelectedNames.includes(name)) {
              newSelectedNames.push(name);
              const meshObj = meshes.find(m => m.name === name);
              if (meshObj && !newSelectedObjects.find(o => o.name === meshObj.name)) {
                newSelectedObjects.push(meshObj);
              }
            }
          });
        }
      } else {
        // Toggle individual mesh
        if (newSelectedNames.includes(mesh.name)) {
          newSelectedNames = newSelectedNames.filter(name => name !== mesh.name);
          newSelectedObjects = newSelectedObjects.filter(obj => obj.name !== mesh.name);
        } else {
          newSelectedNames.push(mesh.name);
          if (!newSelectedObjects.find(o => o.name === mesh.name)) {
            newSelectedObjects.push(mesh);
          }
        }
      }

      // Update parent component
      onMultiSelect(newSelectedObjects, newSelectedNames);
    } else {
      // Single select - notify parent
      onObjectSelect(mesh, event.point || event.intersections?.[0]?.point);
    }
  }, [selectedMeshNames, selectedObjects, meshes, transforms, onMultiSelect, onObjectSelect]);

  // Handle scene click (deselect)
  const handleSceneClick = useCallback((event: any) => {
    // Only deselect if we clicked on empty space (not on any mesh)
    if (event.object === undefined || event.object === null) {
      onSceneClick();
    }
  }, [onSceneClick]);

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

      {/* Invisible plane for detecting clicks on empty space */}
      <mesh
        position={[0, -0.01, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={handleSceneClick}
        visible={false}
      >
        <planeGeometry args={[1000, 1000]} />
        <meshBasicMaterial />
      </mesh>

      {/* Render the entire model centered, with proper transforms applied */}
      <group position={[0, 0, 0]}>
        <primitive object={gltf.scene} />
      </group>

      {/* Invisible click targets for each mesh */}
      {meshes.map((mesh) => {
        const transform = transforms.get(mesh.name);
        const isDeleted = transform?.deleted === true;
        const isVisible = transform ? (transform.visible !== false && !isDeleted) : true;

        if (isDeleted || !isVisible) return null;

        const uniqueKey = mesh.userData.uniqueId || `${mesh.name}_${mesh.uuid}`;

        // Check if mesh is selected directly or as part of a group
        let isSelected = selectedObjectName === mesh.name || selectedMeshNames.includes(mesh.name);

        // Also highlight if any mesh in the same group is selected
        const groupName = mesh.userData?.group;
        if (groupName && selectedMeshNames.length > 0) {
          const groupMeshes = meshes.filter(m => m.userData?.group === groupName);
          isSelected = isSelected || groupMeshes.some(m => selectedMeshNames.includes(m.name));
        }

        // Get world position and transform of the mesh
        mesh.updateMatrixWorld(true);
        const worldPosition = new THREE.Vector3();
        const worldQuaternion = new THREE.Quaternion();
        const worldScale = new THREE.Vector3();
        mesh.getWorldPosition(worldPosition);
        mesh.getWorldQuaternion(worldQuaternion);
        mesh.getWorldScale(worldScale);

        return (
          <group key={uniqueKey}>
            {/* Invisible click target */}
            <mesh
              geometry={mesh.geometry}
              position={worldPosition}
              quaternion={worldQuaternion}
              scale={worldScale}
              visible={false}
              onClick={(e) => {
                e.stopPropagation();
                handleMeshClick(e, mesh);
              }}
              onContextMenu={(e) => {
                e.stopPropagation();
                // Handle right-click
                if (window.handleMeshRightClick) {
                  window.handleMeshRightClick(e, mesh);
                }
              }}
              onPointerOver={(e) => {
                e.stopPropagation();
                // Show different cursor for multi-select mode
                const evt = e.nativeEvent || e;
                if (evt.shiftKey || evt.metaKey || evt.ctrlKey) {
                  document.body.style.cursor = 'copy';
                } else {
                  document.body.style.cursor = 'pointer';
                }
              }}
              onPointerOut={(e) => {
                e.stopPropagation();
                document.body.style.cursor = 'default';
              }}
              onPointerMove={(e) => {
                // Update cursor when modifier keys change
                const evt = e.nativeEvent || e;
                if (evt.shiftKey || evt.metaKey || evt.ctrlKey) {
                  document.body.style.cursor = 'copy';
                } else {
                  document.body.style.cursor = 'pointer';
                }
              }}
            >
              <meshBasicMaterial transparent opacity={0} />
            </mesh>

            {/* HUD-style selection highlight with glow */}
            {isSelected && (
              <>
                {/* Blue glow effect */}
                <mesh
                  geometry={mesh.geometry}
                  position={worldPosition}
                  quaternion={worldQuaternion}
                  scale={worldScale}
                >
                  <HUDGlowMaterial isSelected={true} />
                </mesh>
                {/* Wireframe overlay */}
                <mesh
                  geometry={mesh.geometry}
                  position={worldPosition}
                  quaternion={worldQuaternion}
                  scale={worldScale}
                >
                  <meshBasicMaterial
                    color={0x60a5fa}
                    wireframe
                    transparent
                    opacity={0.2}
                    depthTest={false}
                  />
                </mesh>
              </>
            )}
          </group>
        );
      })}

      {/* Transform controls for selected object - only in edit mode */}
      {!readOnly && selectedObject && (() => {
        const selectedMesh = selectedObject as THREE.Mesh;
        const transform = transforms.get(selectedMesh.name);
        if (transform?.deleted) return null;

        return (
          <TransformControls
            object={selectedObject}
            mode="translate"
          />
        );
      })()}

      {/* Animated connection line growing upward from click point */}
      {selectedAnnotation && clickPosition && (
        <AnimatedConnectionLine
          startPos={clickPosition}
          endPos={null} // Line grows upward, no specific end point needed
          isVisible={true}
        />
      )}

      {/* Annotations are only shown when objects are clicked - no always-visible markers */}

      {/* Controls with increased zoom limits */}
      <OrbitControls
        ref={controlsRef}
        makeDefault
        enablePan
        enableZoom
        enableRotate
        minDistance={0.1}  // Much closer zoom
        maxDistance={500}  // Much further zoom
        maxPolarAngle={Math.PI * 0.85}
        target={[0, 0.5, 0]}
        zoomSpeed={1.5}
      />

      {/* Gizmo helper - only in edit mode */}
      {!readOnly && (
        <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
          <GizmoViewport />
        </GizmoHelper>
      )}
    </>
  );
}

// Main Dark Enhanced Editor Component
export default function DarkEnhancedModelEditor({
  modelUrl,
  modelId,
  annotations,
  onAnnotationsChange,
  onSave,
  readOnly = false
}: DarkEnhancedModelEditorProps) {
  const [selectedObject, setSelectedObject] = useState<THREE.Object3D | null>(null);
  const [selectedObjects, setSelectedObjects] = useState<THREE.Object3D[]>([]);
  const [selectedMeshNames, setSelectedMeshNames] = useState<string[]>([]);
  const [selectedAnnotation, setSelectedAnnotation] = useState<Annotation | null>(null);
  const [showAnnotationPanel, setShowAnnotationPanel] = useState(false);
  const [activePanel, setActivePanel] = useState<'material' | 'environment' | 'annotations'>('material');
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
  const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState(false);
  const [meshes, setMeshes] = useState<THREE.Mesh[]>([]);
  const [meshGroups, setMeshGroups] = useState<Map<string, string[]>>(new Map());
  const resetViewRef = useRef<(() => void) | null>(null);

  // HUD annotation system states
  const [clickPosition, setClickPosition] = useState<THREE.Vector3 | null>(null);
  const [screenPosition, setScreenPosition] = useState<{ x: number; y: number } | null>(null);
  const [showHUD, setShowHUD] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Debug logging
  useEffect(() => {
    console.log('HUD State:', {
      showHUD,
      hasClickPosition: !!clickPosition,
      hasScreenPosition: !!screenPosition,
      hasSelectedAnnotation: !!selectedAnnotation,
      hasCanvasRef: !!canvasRef.current
    });
  }, [showHUD, clickPosition, screenPosition, selectedAnnotation]);

  // Initialize store
  const {
    setModelId,
    selectedObject: selectedObjectName,
    selectObject,
    materials,
    transforms,
    environment,
    setEnvironment,
    setMaterial,
    deleteObject,
    toggleObjectVisibility,
    updateBackground,
    updateFog,
    updateLighting,
    updateGrid,
    hasUnsavedChanges,
    saveState,
    loadState,
    undo,
    redo
  } = useEditorStore();

  // Initialize model in store and load saved state
  useEffect(() => {
    setModelId(modelId);
    // Load saved state from database
    loadState(modelId);
  }, [modelId, setModelId, loadState]);

  // Initialize environment separately - only if not set
  useEffect(() => {
    if (!environment || environment.model_id !== modelId) {
      setEnvironment({
        model_id: modelId,
        background: {
          type: 'solid',
          color: { r: 20, g: 20, b: 20, a: 1 } // Dark background
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
          color: { r: 100, g: 100, b: 100, a: 1 },
          size: 20,
          divisions: 20,
          opacity: 0.3
        }
      });
    }
  }, [modelId, setEnvironment]);

  // Handle meshes loaded from scene
  const handleMeshesLoaded = useCallback((loadedMeshes: THREE.Mesh[]) => {
    setMeshes(loadedMeshes);
  }, []);

  // Handle mesh selection from hierarchy panel
  const handleSelectMesh = useCallback((meshName: string) => {
    const mesh = meshes.find(m => m.name === meshName);
    if (mesh) {
      selectObject(meshName);
      setSelectedObject(mesh);
      setSelectedObjects([mesh]);
      setSelectedMeshNames([meshName]);
    }
  }, [meshes, selectObject]);

  // Handle multiple mesh selection
  const handleSelectMultipleMeshes = useCallback((meshNames: string[]) => {
    const selectedMeshObjects = meshNames
      .map(name => meshes.find(m => m.name === name))
      .filter(Boolean) as THREE.Mesh[];

    setSelectedObjects(selectedMeshObjects);
    setSelectedMeshNames(meshNames);
    if (meshNames.length === 1) {
      selectObject(meshNames[0]);
      setSelectedObject(selectedMeshObjects[0]);
    } else if (meshNames.length > 0) {
      // For multiple selection, select the first one in the store
      selectObject(meshNames[0]);
      setSelectedObject(selectedMeshObjects[0]);
    }
  }, [meshes, selectObject]);

  // Handle grouping meshes
  const handleGroupMeshes = useCallback((meshNames: string[], groupName: string) => {
    const newGroups = new Map(meshGroups);
    newGroups.set(groupName, meshNames);
    setMeshGroups(newGroups);

    // Update mesh userData to reflect grouping
    meshNames.forEach(name => {
      const mesh = meshes.find(m => m.name === name);
      if (mesh) {
        mesh.userData = { ...mesh.userData, group: groupName };
      }
    });

    // Force re-render
    setMeshes([...meshes]);
  }, [meshes]);

  // Handle ungrouping
  const handleUngroupMeshes = useCallback((groupName: string) => {
    const newGroups = new Map(meshGroups);
    const meshNames = newGroups.get(groupName) || [];

    // Also check meshes that have this group in userData
    meshes.forEach(mesh => {
      if (mesh.userData?.group === groupName) {
        delete mesh.userData.group;
      }
    });

    newGroups.delete(groupName);
    setMeshGroups(newGroups);

    // Force re-render
    setMeshes([...meshes]);
  }, [meshes]);

  // Handle renaming
  const handleRenameMesh = useCallback((oldName: string, newName: string) => {
    const mesh = meshes.find(m => m.name === oldName);
    if (mesh) {
      mesh.name = newName;
      // Update any references in groups
      const newGroups = new Map(meshGroups);
      newGroups.forEach((members, groupName) => {
        const index = members.indexOf(oldName);
        if (index !== -1) {
          members[index] = newName;
        }
      });
      setMeshGroups(newGroups);

      // Update selection if needed
      if (selectedObjectName === oldName) {
        selectObject(newName);
      }
    }
  }, [meshes, meshGroups, selectedObjectName, selectObject]);

  // Handle object selection
  const handleObjectSelect = useCallback((object: THREE.Object3D | null, point: THREE.Vector3 | null) => {
    setSelectedObject(object);
    setClickPosition(point);

    // Check if object is part of a group
    if (object) {
      const groupName = object.userData?.group;
      if (groupName) {
        // Select all meshes in the group
        const groupMeshes = meshes.filter(m => m.userData?.group === groupName);
        const groupMeshNames = groupMeshes.map(m => m.name);
        setSelectedObjects(groupMeshes);
        setSelectedMeshNames(groupMeshNames);

        // Select first mesh in store for UI purposes
        if (groupMeshNames.length > 0) {
          selectObject(groupMeshNames[0]);
        }
      } else {
        // Single object selection
        setSelectedObjects([object]);
        setSelectedMeshNames([object.name || '']);
        selectObject(object.name);
      }
    } else {
      setSelectedObjects([]);
      setSelectedMeshNames([]);
      selectObject(null);
    }

    if (object && point) {
      const existingAnnotation = annotations.find(a => a.object_name === object.name);

      if (existingAnnotation) {
        setSelectedAnnotation(existingAnnotation);
      } else {
        // Support group annotations
        const groupName = object.userData?.group;
        let annotationObjectName = object.name || 'Unnamed Object';

        if (groupName) {
          const groupMembers = meshGroups.get(groupName) || [];
          if (groupMembers.length > 0) {
            annotationObjectName = groupName; // Use group name for annotation
          }
        }

        const newAnnotation: Annotation = {
          id: Date.now().toString(),
          model_id: modelId,
          object_name: annotationObjectName,
          title: '',
          description: '',
          position_x: point.x,
          position_y: point.y,
          position_z: point.z,
          created_at: new Date().toISOString(),
        };
        setSelectedAnnotation(newAnnotation);
      }

      // Don't create a default material - preserve the original
      // The material panel will handle creating materials when user wants to edit

      setShowAnnotationPanel(true);
      setShowHUD(true);
    } else {
      setShowAnnotationPanel(false);
      setSelectedAnnotation(null);
      setShowHUD(false);
      setClickPosition(null);
      setScreenPosition(null);
    }
  }, [annotations, modelId, materials, setMaterial, selectObject, meshGroups, meshes]);

  // Handle multi-selection update from 3D view
  const updateMultiSelection = useCallback((objects: THREE.Object3D[], names: string[]) => {
    setSelectedObjects(objects);
    setSelectedMeshNames(names);

    // Select first item for UI purposes
    if (names.length > 0) {
      selectObject(names[0]);
      setSelectedObject(objects[0]);
    } else {
      selectObject(null);
      setSelectedObject(null);
    }
  }, [selectObject]);

  // Handle right-click on mesh in 3D view
  const handleMeshRightClick = useCallback((event: any, mesh: THREE.Mesh) => {
    event.preventDefault?.();

    // Select the mesh if not already selected
    if (!selectedMeshNames.includes(mesh.name)) {
      setSelectedObjects([mesh]);
      setSelectedMeshNames([mesh.name]);
      selectObject(mesh.name);
    }

    // We'll need to trigger the context menu somehow
    // For now, just select the item
  }, [selectedMeshNames, selectObject]);

  // Make functions available globally for EnhancedScene
  useEffect(() => {
    (window as any).updateMultiSelection = updateMultiSelection;
    (window as any).handleMeshRightClick = handleMeshRightClick;
    return () => {
      delete (window as any).updateMultiSelection;
      delete (window as any).handleMeshRightClick;
    };
  }, [updateMultiSelection, handleMeshRightClick]);

  // Handle scene click (deselect)
  const handleSceneClick = useCallback(() => {
    setSelectedObject(null);
    setSelectedObjects([]);
    setSelectedMeshNames([]);
    setSelectedAnnotation(null);
    setShowAnnotationPanel(false);
    selectObject(null);
    setShowHUD(false);
    setClickPosition(null);
    setScreenPosition(null);
  }, [selectObject]);

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

  // Handle annotation delete
  const handleAnnotationDelete = useCallback((annotationToDelete: Annotation) => {
    const newAnnotations = annotations.filter(a =>
      a.id !== annotationToDelete.id && a.object_name !== annotationToDelete.object_name
    );
    onAnnotationsChange(newAnnotations);
    setSelectedAnnotation(null);
    setShowAnnotationPanel(false);
  }, [annotations, onAnnotationsChange]);

  // Delete annotation from database
  const deleteAnnotation = async (annotationId: string) => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { error } = await supabase
      .from('annotations')
      .delete()
      .eq('id', annotationId);

    if (error) {
      throw error;
    }
  };

  // Fetch annotations from database
  const fetchAnnotations = async () => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data, error } = await supabase
      .from('annotations')
      .select('*')
      .eq('model_id', modelId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      onAnnotationsChange(data);
    }
  };

  // Handle save
  const handleSaveAll = async () => {
    try {
      await saveState();
      onSave();
      toast.success('All settings saved successfully!', {
        position: 'bottom-left',
        duration: 3000,
      });
    } catch (error) {
      console.error('Failed to save:', error);
      toast.error('Failed to save settings', {
        position: 'bottom-left',
        duration: 4000,
      });
    }
  };

  // Reset view
  const handleResetView = () => {
    if (resetViewRef.current) {
      resetViewRef.current();
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
        } else if (event.key === 'g' && !event.shiftKey) {
          // Group selected items
          event.preventDefault();
          if (selectedMeshNames.length > 1) {
            const groupName = prompt('Enter group name:');
            if (groupName) {
              handleGroupMeshes(selectedMeshNames, groupName);
              toast.success(`Created group "${groupName}"`, {
                position: 'bottom-left'
              });
            }
          } else {
            toast.error('Select multiple objects to group', {
              position: 'bottom-left'
            });
          }
        }
      } else if ((event.key === 'Delete' || event.key === 'Backspace') && selectedMeshNames.length > 0) {
        event.preventDefault();
        selectedMeshNames.forEach(name => {
          deleteObject(name);
        });
        toast.success(`Deleted ${selectedMeshNames.length} object(s)`, {
          position: 'bottom-left',
          duration: 3000,
        });
        handleSceneClick();
      } else if (event.key === 'Escape') {
        handleSceneClick();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [selectedMeshNames, deleteObject, undo, redo, handleSceneClick, handleSaveAll, handleGroupMeshes]);

  const currentMaterial = selectedObjectName ? materials.get(selectedObjectName) : null;

  // If readOnly mode, render just the canvas with clickability for viewing annotations
  if (readOnly) {
    return (
      <div className="relative w-full h-full bg-black" ref={canvasRef}>
        <Canvas
          camera={{ position: [5, 4, 5], fov: 50 }}
          shadows
          className="dark-gradient-bg"
          onPointerMissed={handleSceneClick}
        >
          <Suspense fallback={null}>
            <EnhancedScene
              modelUrl={modelUrl}
              annotations={annotations}
              onObjectSelect={handleObjectSelect} // Allow selection for viewing
              onMultiSelect={() => {}} // No multi-select in read-only
              selectedObject={selectedObject}
              selectedObjects={[]}
              selectedMeshNames={[]}
              onSceneClick={handleSceneClick}
              resetViewRef={resetViewRef}
              onMeshesLoaded={handleMeshesLoaded}
              clickPosition={clickPosition}
              selectedAnnotation={selectedAnnotation}
              readOnly={true}
            />
            <ScreenPositionUpdater
              clickPosition={clickPosition}
              onScreenPositionUpdate={setScreenPosition}
            />
          </Suspense>
        </Canvas>

        {/* HUD Annotation Card for read-only viewer */}
        {showHUD && screenPosition && selectedAnnotation && canvasRef.current && (
          createPortal(
            <HUDAnnotationCard
              annotation={selectedAnnotation}
              screenPosition={(() => {
                const rect = canvasRef.current!.getBoundingClientRect();
                return {
                  x: rect.left + screenPosition.x,
                  y: rect.top + screenPosition.y
                };
              })()}
              onClose={() => {
                setShowHUD(false);
                setSelectedAnnotation(null);
                setSelectedObject(null);
                setClickPosition(null);
                setScreenPosition(null);
                selectObject(null);
              }}
              isVisible={true}
            />,
            document.body
          )
        )}
      </div>
    );
  }

  // Normal editing mode
  return (
    <>
      <div className="relative w-full h-full flex bg-black">
      {/* 3D Canvas */}
      <div className="flex-1 relative" ref={canvasRef}>
        <Canvas
          camera={{ position: [5, 4, 5], fov: 50 }}
          shadows
          className="dark-gradient-bg"
          onPointerMissed={handleSceneClick}
        >
          <Suspense fallback={null}>
            <EnhancedScene
              modelUrl={modelUrl}
              annotations={annotations}
              onObjectSelect={handleObjectSelect}
              onMultiSelect={updateMultiSelection}
              selectedObject={selectedObject}
              selectedObjects={selectedObjects}
              selectedMeshNames={selectedMeshNames}
              onSceneClick={handleSceneClick}
              resetViewRef={resetViewRef}
              onMeshesLoaded={handleMeshesLoaded}
              clickPosition={clickPosition}
              selectedAnnotation={selectedAnnotation}
              readOnly={false}
            />
            <ScreenPositionUpdater
              clickPosition={clickPosition}
              onScreenPositionUpdate={setScreenPosition}
            />
          </Suspense>
        </Canvas>

        {/* Floating Controls */}
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          {/* Reset View Button */}
          <button
            onClick={handleResetView}
            className="glass-button p-2 rounded-lg text-white hover:text-blue-400 transition-colors"
            title="Reset View (Home)"
          >
            <RotateCcw size={20} />
          </button>

          {/* Zoom Controls */}
          <div className="glass-panel-light rounded-lg p-1 flex flex-col gap-1">
            <button
              className="glass-button p-1.5 rounded text-white hover:text-blue-400 transition-colors"
              title="Zoom In"
            >
              <ZoomIn size={18} />
            </button>
            <button
              className="glass-button p-1.5 rounded text-white hover:text-blue-400 transition-colors"
              title="Zoom Out"
            >
              <ZoomOut size={18} />
            </button>
            <button
              className="glass-button p-1.5 rounded text-white hover:text-blue-400 transition-colors"
              title="Fit to Screen"
            >
              <Maximize2 size={18} />
            </button>
          </div>
        </div>

        {/* Viewer Info */}
        <div className="absolute bottom-4 left-4 glass-panel rounded-lg px-3 py-2">
          <div className="text-xs text-gray-400">
            <div>Left Click: Select Object</div>
            <div>Right Click: Rotate View</div>
            <div>Scroll: Zoom</div>
            <div>Middle Click: Pan</div>
            <div>ESC: Deselect</div>
            <div className="text-blue-400 mt-1">HUD Mode Active</div>
          </div>
        </div>

        {/* HUD Annotation Card - Fixed condition */}
        {showHUD && screenPosition && selectedAnnotation && canvasRef.current && (
          createPortal(
            <HUDAnnotationCard
              annotation={selectedAnnotation}
              screenPosition={(() => {
                const rect = canvasRef.current!.getBoundingClientRect();
                return {
                  x: rect.left + screenPosition.x,
                  y: rect.top + screenPosition.y
                };
              })()}
              onClose={() => {
                setShowHUD(false);
                setSelectedAnnotation(null);
                setSelectedObject(null);
                setClickPosition(null);
                setScreenPosition(null);
                setShowAnnotationPanel(false);
                setSelectedObjects([]);
                setSelectedMeshNames([]);
                selectObject(null);
              }}
              isVisible={true}
            />,
            document.body
          )
        )}
      </div>

      {/* Control Panel */}
      <div className={`${isPanelCollapsed ? 'w-12' : 'w-96'} transition-all duration-300 glass-panel border-l border-white/10 overflow-hidden flex flex-col`}>
        {/* Header */}
        <div className="glass-panel-light p-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className={`${isPanelCollapsed ? 'hidden' : 'block'}`}>
              <h2 className="text-lg font-bold text-white">Enhanced Editor</h2>
              <p className="text-xs text-gray-400 mt-1">Professional 3D Editing Suite</p>
            </div>

            <button
              onClick={() => setIsPanelCollapsed(!isPanelCollapsed)}
              className="glass-button p-1.5 rounded-lg text-white"
            >
              {isPanelCollapsed ? <ChevronRight size={20} /> : <ChevronDown size={20} />}
            </button>
          </div>

          {!isPanelCollapsed && (
            <>
              {/* Tool Bar */}
              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleSaveAll}
                  className="flex items-center gap-1 px-3 py-1.5 glass-button-primary rounded-lg text-white hover:scale-105 transition-transform"
                  title="Save (Ctrl+S)"
                >
                  <Save size={16} />
                  {hasUnsavedChanges && <span className="text-xs">Save*</span>}
                </button>
                <button
                  onClick={() => window.open(`/viewer/${modelId}`, '_blank')}
                  className="flex items-center gap-1 px-3 py-1.5 glass-button rounded-lg text-blue-400 hover:text-blue-300 transition-colors"
                  title="Preview in new tab"
                >
                  <Eye size={16} />
                  <span className="text-xs">Preview</span>
                </button>
                <button
                  onClick={undo}
                  className="glass-button p-1.5 rounded-lg text-white hover:text-blue-400 transition-colors"
                  title="Undo (Ctrl+Z)"
                >
                  <Undo size={16} />
                </button>
                <button
                  onClick={redo}
                  className="glass-button p-1.5 rounded-lg text-white hover:text-blue-400 transition-colors"
                  title="Redo (Ctrl+Y)"
                >
                  <Redo size={16} />
                </button>
              </div>

              {/* Panel Tabs */}
              <div className="flex gap-1 mt-4">
                {[
                  { id: 'material', label: 'Material', icon: Palette },
                  { id: 'environment', label: 'Environment', icon: Lightbulb },
                  { id: 'annotations', label: 'Annotations', icon: Layers }
                ].map(panel => {
                  const Icon = panel.icon;
                  return (
                    <button
                      key={panel.id}
                      onClick={() => setActivePanel(panel.id as any)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                        activePanel === panel.id
                          ? 'glass-button-primary text-white'
                          : 'glass-button text-gray-400 hover:text-white'
                      }`}
                    >
                      <Icon size={14} />
                      <span>{panel.label}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Panel Content */}
        {!isPanelCollapsed && (
          <div className="flex-1 overflow-y-auto p-4 dark-scrollbar">
            {activePanel === 'material' && selectedObjectName && (
              <div>
                {/* Action buttons for selected object */}
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => {
                      toggleObjectVisibility(selectedObjectName);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 glass-button rounded-lg text-white hover:text-blue-400 transition-colors"
                  >
                    {transforms.get(selectedObjectName)?.visible !== false ? (
                      <><Eye size={14} /> Hide</>
                    ) : (
                      <><EyeOff size={14} /> Show</>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      const objectName = selectedObjectName;
                      deleteObject(selectedObjectName);
                      toast.success(`Object "${objectName}" has been deleted`, {
                        position: 'bottom-left',
                        duration: 3000,
                      });
                      handleSceneClick();
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 glass-button rounded-lg text-red-400 hover:text-red-300 transition-colors"
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
                <MaterialPanel
                  objectName={selectedObjectName}
                  material={materials.get(selectedObjectName) || {
                    model_id: modelId,
                    object_name: selectedObjectName,
                    material_type: 'physical',
                    color: { r: 200, g: 200, b: 200, a: 1 },
                    properties: {
                      metalness: 0,
                      roughness: 0.5,
                      clearcoat: 0,
                      clearcoatRoughness: 0,
                      sheen: 0,
                      sheenRoughness: 0,
                      sheenColor: { r: 255, g: 255, b: 255, a: 1 },
                      emissive: { r: 0, g: 0, b: 0, a: 1 },
                      emissiveIntensity: 0,
                      opacity: 1,
                      transmission: 0,
                      thickness: 0,
                      ior: 1.5,
                      reflectivity: 0.5,
                      specularIntensity: 1,
                      specularColor: { r: 255, g: 255, b: 255, a: 1 },
                    }
                  }}
                  onChange={(material) => setMaterial(selectedObjectName, material)}
                />
              </div>
            )}

            {activePanel === 'environment' && environment && (
              <EnvironmentPanel
                environment={environment}
                onChange={(updatedEnvironment) => {
                  setEnvironment(updatedEnvironment);
                }}
              />
            )}

            {activePanel === 'annotations' && (
              <div>
                {showAnnotationPanel && selectedAnnotation ? (
                  <AnnotationPanel
                    annotation={selectedAnnotation}
                    onUpdate={handleAnnotationUpdate}
                    onDelete={handleAnnotationDelete}
                    onClose={() => setShowAnnotationPanel(false)}
                  />
                ) : (
                  <div className="glass-panel-light rounded-lg p-3">
                    <p className="text-xs text-gray-400">Select an object to add annotations</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Status Bar */}
        {!isPanelCollapsed && (
          <div className="glass-panel-light p-2 border-t border-white/10">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <div className="flex items-center gap-2">
                {selectedMeshNames.length > 0 && (
                  <span className="text-blue-400">
                    Selected: {selectedMeshNames.length === 1
                      ? selectedObjectName
                      : `${selectedMeshNames.length} objects`}
                  </span>
                )}
                {selectedMeshNames.length > 1 && (
                  <span className="text-gray-500">
                    (Press Cmd+G to group)
                  </span>
                )}
              </div>
              {hasUnsavedChanges && (
                <span className="text-yellow-400">Unsaved changes</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Right Panel - Object Hierarchy */}
      <div className={`${isRightPanelCollapsed ? 'w-12' : 'w-80'} transition-all duration-300 glass-panel border-l border-white/10 overflow-hidden flex flex-col`}>
        {/* Header */}
        <div className="glass-panel-light p-3 border-b border-white/10">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setIsRightPanelCollapsed(!isRightPanelCollapsed)}
              className="glass-button p-1.5 rounded-lg text-white"
            >
              {isRightPanelCollapsed ? <ChevronRight size={20} /> : <ChevronDown size={20} />}
            </button>
            {!isRightPanelCollapsed && (
              <div className="flex items-center gap-2">
                <Layers size={16} className="text-blue-400" />
                <h3 className="text-sm font-semibold text-white">Object Hierarchy</h3>
              </div>
            )}
          </div>
        </div>

        {/* Object Hierarchy Panel Content */}
        {!isRightPanelCollapsed && (
          <div className="flex-1">
            <ObjectHierarchyPanel
              meshes={meshes}
              onSelectMesh={handleSelectMesh}
              onSelectMultipleMeshes={handleSelectMultipleMeshes}
              selectedMesh={selectedObjectName}
              selectedMeshes={selectedMeshNames}
              annotations={annotations}
              onSelectAnnotation={(annotation) => {
                setSelectedAnnotation(annotation);
                setShowAnnotationPanel(true);
              }}
              onDeleteAnnotation={async (annotation) => {
                try {
                  await deleteAnnotation(annotation.id);
                  await fetchAnnotations();
                  toast.success('Annotation deleted');
                } catch (error) {
                  console.error('Failed to delete annotation:', error);
                  toast.error('Failed to delete annotation');
                }
              }}
              selectedAnnotation={selectedAnnotation}
              onGroupMeshes={handleGroupMeshes}
              onUngroupMeshes={handleUngroupMeshes}
              onRenameMesh={handleRenameMesh}
            />
          </div>
        )}
      </div>
    </div>

    {/* Toast Notifications */}
    <Toaster
      toastOptions={{
          className: '',
          style: {
            background: 'rgba(17, 24, 39, 0.95)',
            color: '#fff',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </>
  );
}