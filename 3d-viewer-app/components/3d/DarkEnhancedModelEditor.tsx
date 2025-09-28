'use client';

import React, { useState, useRef, useCallback, useEffect, Suspense } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Canvas, useThree, useLoader, useFrame } from '@react-three/fiber';
import { createPortal } from 'react-dom';
import toast, { Toaster } from 'react-hot-toast';
import {
  Environment,
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
  ChevronRight,
  Plane,
  Maximize,
  Minimize
} from 'lucide-react';

// Components
import MaterialPanel from '@/components/editor/MaterialPanel';
import EnvironmentPanel from '@/components/editor/EnvironmentPanel';
import AnnotationPanel from '@/components/ui/AnnotationPanel';
import ObjectHierarchyPanel from '@/components/editor/ObjectHierarchyPanel';
import { HUDAnnotationCard } from './HUDAnnotation';
import CinematicCameraController from './CinematicCameraController';
import InfiniteGroundPlane from './InfiniteGroundPlane';

// Global texture cache to prevent reloading
const textureCache = new Map<string, THREE.Texture>();

// Store and utilities
import { useEditorStore } from '@/lib/store/editorStore';
import { materialToThreeJS } from '@/lib/materials/presets';
import { getGLTFLoader } from '@/lib/three/loaders';
import { autoGenerateUVs } from '@/lib/three/uvGenerator';
import { saveGroups, loadGroups, updateGroup, deleteGroup } from '@/lib/store/groupPersistence';

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

// Optimized Screen position updater component
function ScreenPositionUpdater({ clickPosition, onScreenPositionUpdate }: {
  clickPosition: THREE.Vector3 | null;
  onScreenPositionUpdate: (pos: { x: number; y: number } | null) => void;
}) {
  const { camera, gl } = useThree();
  const vectorRef = useRef(new THREE.Vector3());

  useFrame(() => {
    if (clickPosition) {
      // Reuse vector to avoid creating new objects
      vectorRef.current.copy(clickPosition);
      vectorRef.current.y += 0.5; // Small offset upward
      vectorRef.current.project(camera);

      const x = (vectorRef.current.x * 0.5 + 0.5) * gl.domElement.clientWidth;
      const y = (-vectorRef.current.y * 0.5 + 0.5) * gl.domElement.clientHeight;
      onScreenPositionUpdate({ x, y });
    } else {
      onScreenPositionUpdate(null);
    }
  });

  return null;
}

// Animated Blue Glow Overlay - Quick flash then fade
function HUDGlowMaterial({ isSelected }: { isSelected: boolean }) {
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const startTimeRef = useRef(Date.now());
  const [opacity, setOpacity] = useState(0.6);

  useEffect(() => {
    if (isSelected) {
      // Reset animation when selection changes
      startTimeRef.current = Date.now();
      setOpacity(0.6);
    }
  }, [isSelected]);

  useFrame(() => {
    if (materialRef.current && isSelected) {
      const elapsed = (Date.now() - startTimeRef.current) / 1000; // Convert to seconds

      if (elapsed <= 3) {
        // Slower fade from 0.6 to 0.2 over 3 seconds
        const newOpacity = 0.6 - (0.4 * (elapsed / 3));
        materialRef.current.opacity = newOpacity;
        materialRef.current.emissiveIntensity = newOpacity * 0.8;
      } else {
        // After 3 seconds, maintain low opacity
        materialRef.current.opacity = 0.2;
        materialRef.current.emissiveIntensity = 0.16;
      }
    }
  });

  if (!isSelected) return null;

  return (
    <meshStandardMaterial
      ref={materialRef}
      color="#004080"  // Dark ocean blue
      emissive="#0066cc"  // Ocean blue emission for glow
      emissiveIntensity={0.5}
      transparent
      opacity={0.6}  // 60% opacity for stronger effect
      side={THREE.DoubleSide}
      depthWrite={false}
      depthTest={true}
      blending={THREE.NormalBlending}  // Normal blending to preserve original colors
      polygonOffset={true}
      polygonOffsetFactor={-1}  // Render slightly in front to avoid z-fighting
      polygonOffsetUnits={-1}
    />
  );
}

// Connection line component removed - using HUD card's built-in line

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
  readOnly = false,
  setCameraTarget,
  cameraTarget,
  autoRotate
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
  setCameraTarget: (target: { position: THREE.Vector3; object: THREE.Object3D; } | null) => void;
  cameraTarget: { position: THREE.Vector3; object: THREE.Object3D; } | null;
  autoRotate: boolean;
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
    selectedObject: selectedObjectName,
    setTransform
  } = useEditorStore();

  // Reset view function
  const resetView = useCallback(() => {
    // Clear camera target to reset view
    setCameraTarget(null);
    // Reset camera to initial position
    if (initialCameraPosition.current && initialCameraTarget.current) {
      camera.position.copy(initialCameraPosition.current);
      camera.lookAt(initialCameraTarget.current);
      camera.updateProjectionMatrix();
    }
  }, [camera]);

  // Expose reset view to parent
  useEffect(() => {
    resetViewRef.current = resetView;
  }, [resetView, resetViewRef]);

  // Extract meshes from model - including ALL planes
  useEffect(() => {
    const extractedMeshes: THREE.Mesh[] = [];
    const nameCount: Map<string, number> = new Map();
    let planeCounter = 1;

    gltf.scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        // Skip ONLY our special infinite ground plane
        if (child.name === 'Plane12847' || child.userData?.isGroundPlane) {
          console.log('Skipping infinite ground plane:', child.name);
          return;
        }

        // Detect plane-like objects based on geometry
        const geometry = child.geometry;
        let isPlane = false;
        let planeInfo = { isFlat: false, dimension: '' };

        if (geometry) {
          geometry.computeBoundingBox();
          const box = geometry.boundingBox;
          if (box) {
            const size = new THREE.Vector3();
            box.getSize(size);

            // Check if it's flat in any dimension - be more generous for planes
            const threshold = 1.0; // More generous threshold for planes
            if (size.y < threshold) {
              isPlane = true;
              planeInfo = { isFlat: true, dimension: 'Y' };
            } else if (size.x < threshold) {
              isPlane = true;
              planeInfo = { isFlat: true, dimension: 'X' };
            } else if (size.z < threshold) {
              isPlane = true;
              planeInfo = { isFlat: true, dimension: 'Z' };
            }
          }
        }

        // Also check by name patterns
        const nameIndicatesPlane = child.name && (
          child.name.toLowerCase().includes('plane') ||
          child.name.toLowerCase().includes('floor') ||
          child.name.toLowerCase().includes('ground')
        );

        // Ensure unique names - especially for unnamed planes
        if (!child.name || child.name === '') {
          if (isPlane || nameIndicatesPlane) {
            child.name = `ModelPlane_${planeCounter++}`;
            console.log('Found unnamed plane, naming it:', child.name);
          } else {
            child.name = `Mesh_${extractedMeshes.length + 1}`;
          }
        } else {
          // Check for duplicate names and make them unique
          const baseName = child.name;
          const count = nameCount.get(baseName) || 0;
          if (count > 0) {
            child.name = `${baseName}_${count}`;
          }
          nameCount.set(baseName, count + 1);
        }

        // Add metadata
        child.userData.uniqueId = `${child.name}_${child.uuid}`;
        child.userData.originalMaterial = child.material;
        child.userData.isModelPlane = isPlane || nameIndicatesPlane;
        // IMPORTANT: Mark model planes as always selectable
        child.userData.isSelectable = true;

        if (isPlane || nameIndicatesPlane) {
          console.log('Detected plane:', child.name, planeInfo, 'Making it selectable');
          // Force generate UV coordinates for planes if they don't have them
          if (!child.geometry.attributes.uv) {
            console.log(`Generating UV coordinates for plane: ${child.name}`);
            autoGenerateUVs(child.geometry, child.name);
          }
        }

        extractedMeshes.push(child);
      }
    });

    console.log('Total meshes extracted:', extractedMeshes.length);
    console.log('Planes found:', extractedMeshes.filter(m => m.userData.isModelPlane).map(m => m.name));

    // IMPORTANT: Reset any deleted/hidden flags for model planes
    extractedMeshes.forEach(mesh => {
      if (mesh.userData.isModelPlane) {
        const transform = transforms.get(mesh.name);
        if (transform?.deleted || transform?.visible === false) {
          console.log(`Resetting visibility for plane: ${mesh.name}`);
          // Note: setTransform will be called from parent component if needed
        }
      }
    });

    setMeshes(extractedMeshes);
    onMeshesLoaded(extractedMeshes);

    // Reset any existing transformations
    gltf.scene.position.set(0, 0, 0);
    gltf.scene.rotation.set(0, 0, 0);
    gltf.scene.scale.set(1, 1, 1);
    gltf.scene.updateMatrixWorld(true);

    // Simple bounds calculation for non-plane objects
    const box = new THREE.Box3();
    const nonPlaneMeshes = extractedMeshes.filter(m => m.name !== 'Plane12847');

    if (nonPlaneMeshes.length > 0) {
      // Calculate bounds from non-plane meshes only
      nonPlaneMeshes.forEach((mesh, index) => {
        if (index === 0) {
          box.setFromObject(mesh);
        } else {
          box.expandByObject(mesh);
        }
      });
    } else {
      // Fallback if no meshes
      box.setFromCenterAndSize(new THREE.Vector3(0, 1, 0), new THREE.Vector3(2, 2, 2));
    }

    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    // Simple scaling
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 10 / maxDim;  // Standard scale

    // Center the model
    gltf.scene.scale.setScalar(scale);
    gltf.scene.position.set(
      -center.x * scale,
      -box.min.y * scale,
      -center.z * scale
    );

    // Let SimpleCameraController handle initial camera setup
    // Just store the model center for reset functionality
    const targetPos = new THREE.Vector3(0, size.y * scale * 0.3, 0);

    // Store initial positions for reset
    initialCameraPosition.current = new THREE.Vector3(10.5, 7.5, 10.5);
    initialCameraTarget.current = targetPos.clone();
  }, [gltf, camera, onMeshesLoaded]);

  // Apply materials to meshes with texture support and handle visibility
  useEffect(() => {
    meshes.forEach(mesh => {
      // Skip the infinite ground plane
      if (mesh.name === 'Plane12847') {
        return;
      }

      // Handle visibility based on transform state
      const transform = transforms.get(mesh.name);
      if (transform) {
        // Hide mesh if deleted, show if not
        mesh.visible = !transform.deleted && (transform.visible !== false);

        // Log when objects are restored via undo
        if (mesh.userData.wasDeleted && !transform.deleted) {
          console.log(`Object restored via undo: ${mesh.name}`);
          mesh.userData.wasDeleted = false;
        } else if (!mesh.userData.wasDeleted && transform.deleted) {
          mesh.userData.wasDeleted = true;
        }
      } else {
        // Default to visible if no transform exists
        mesh.visible = true;
      }

      const material = materials.get(mesh.name);
      if (material) {
        // Check if mesh has UV coordinates - required for textures
        const geometry = mesh.geometry;
        let hasUVs = geometry.attributes.uv && geometry.attributes.uv.count > 0;

        // Always generate UVs for planes if they don't have them
        if (!hasUVs && (material.texture_url || mesh.userData.isModelPlane)) {
          console.log(`No UV coordinates found for "${mesh.name}". Generating UVs...`);
          autoGenerateUVs(geometry, mesh.name);
          hasUVs = geometry.attributes.uv && geometry.attributes.uv.count > 0;
          // Force geometry update
          geometry.attributes.uv.needsUpdate = true;
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

        // Store reference for texture application
        mesh.material = newMaterial;
        mesh.userData.hasMaterialApplied = true; // Mark that this mesh has a custom material

        // For planes, ensure material updates are forced
        if (mesh.userData.isModelPlane) {
          newMaterial.needsUpdate = true;
          console.log(`Applied material to plane: ${mesh.name}`);
        }

        // If there's a texture URL and the mesh has UVs, load and apply texture
        if (material.texture_url && hasUVs) {
          // Check if texture is already cached
          const cacheKey = `${mesh.name}-${material.texture_url}`;
          let texture = textureCache.get(cacheKey);

          if (texture) {
            // Use cached texture
            console.log(`Using cached texture for "${mesh.name}"`);
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

              // Set texture rotation
              if (settings.rotation !== undefined) {
                texture.rotation = settings.rotation;
              }

              // Set texture wrap mode
              texture.wrapS = settings.wrapS === 'repeat' ? THREE.RepeatWrapping :
                            settings.wrapS === 'mirror' ? THREE.MirroredRepeatWrapping :
                            THREE.ClampToEdgeWrapping;
              texture.wrapT = settings.wrapT === 'repeat' ? THREE.RepeatWrapping :
                            settings.wrapT === 'mirror' ? THREE.MirroredRepeatWrapping :
                            THREE.ClampToEdgeWrapping;
            }

            // Apply the cached texture immediately
            newMaterial.map = texture;
            newMaterial.needsUpdate = true;
          } else {
            // Load new texture
            console.log(`Loading texture for "${mesh.name}" from: ${material.texture_url}`);

            const textureLoader = new THREE.TextureLoader();
            textureLoader.load(
              material.texture_url,
              (texture) => {
                console.log(`Texture loaded successfully for "${mesh.name}"`);

                // Cache the texture
                textureCache.set(cacheKey, texture);

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

                // For planes, force additional updates to ensure texture sticks
                if (mesh.userData.isModelPlane) {
                  mesh.geometry.attributes.uv.needsUpdate = true;
                  mesh.material.map.needsUpdate = true;
                  // Force a render update
                  mesh.material.version++;
                }

                console.log(`Texture applied to "${mesh.name}"`, {
                  hasMap: !!mesh.material.map,
                  textureUrl: material.texture_url,
                  isPlane: mesh.userData.isModelPlane,
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
          }
        }
      } else {
        // Only reset to original if no custom material has been applied
        // This prevents reverting when materials update
        if (!mesh.userData?.hasMaterialApplied) {
          mesh.material = mesh.userData.originalMaterial || mesh.material;
        }
      }
    });
  }, [materials, meshes.length, transforms]); // Re-run when materials, mesh count, or transforms change

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
    console.log('Click detected on mesh:', mesh.name, 'isPlane:', mesh.userData?.isModelPlane);

    // Log plane selection
    if (mesh.userData?.isModelPlane) {
      console.log('✅ Selecting model plane:', mesh.name);
    }

    // Check if mesh is deleted - but allow planes regardless
    const transform = transforms.get(mesh.name);
    if (transform?.deleted && !mesh.userData?.isModelPlane) {
      console.log(`Blocking deleted non-plane: ${mesh.name}`);
      return; // Don't select deleted objects (unless they're planes)
    }

    // Log plane selection attempts
    if (mesh.userData?.isModelPlane) {
      console.log(`Plane click detected: ${mesh.name}, deleted: ${transform?.deleted}, visible: ${transform?.visible}`);
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

      // Trigger camera animation to focus on selected object
      // Add a small delay to ensure selection state is updated first
      setTimeout(() => {
        setCameraTarget({
          position: event.point || event.intersections?.[0]?.point || mesh.position,
          object: mesh
        });
      }, 50);
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

      {/* Infinite Ground Plane - Always visible */}
      <InfiniteGroundPlane
        color="#0a0a0a"
        gridColor={`rgb(${environment?.grid.color.r || 100}, ${environment?.grid.color.g || 100}, ${environment?.grid.color.b || 100})`}
        readOnly={readOnly}
        showGrid={environment?.grid.show || false}
        onSelect={(event, mesh) => {
          handleMeshClick(event, mesh);
        }}
        onContextMenu={(event, mesh) => {
          if (window.handleMeshRightClick) {
            window.handleMeshRightClick(event, mesh);
          }
        }}
        onPointerOver={(event, _mesh) => {
          const evt = event.nativeEvent || event;
          if (evt.shiftKey || evt.metaKey || evt.ctrlKey) {
            document.body.style.cursor = 'copy';
          } else {
            document.body.style.cursor = 'pointer';
          }
        }}
        onPointerOut={(_event, _mesh) => {
          document.body.style.cursor = 'default';
        }}
      />

      {/* Removed the invisible plane - no longer needed */}

      {/* Render the entire model centered, with proper transforms applied */}
      <group position={[0, 0, 0]}>
        <primitive object={gltf.scene} />
      </group>

      {/* Invisible click targets for each mesh */}
      {meshes.map((mesh) => {
        // Skip only our special infinite ground plane from click targets
        if (mesh.name === 'Plane12847' || mesh.userData?.isGroundPlane) {
          return null;
        }

        // Log every mesh that gets a click target
        if (mesh.userData?.isModelPlane) {
          console.log(`Creating click target for plane: ${mesh.name}`);
        }

        const transform = transforms.get(mesh.name);
        const isDeleted = transform?.deleted === true;
        const isVisible = transform ? (transform.visible !== false && !isDeleted) : true;

        // Don't skip planes even if marked as deleted/invisible
        if (mesh.userData?.isModelPlane) {
          console.log(`Creating click target for plane: ${mesh.name} (even if deleted: ${isDeleted})`);
        } else if (isDeleted || !isVisible) {
          return null;
        }

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

            {/* Simple 40% blue overlay for selected objects */}
            {isSelected && (
              <mesh
                geometry={mesh.geometry}
                position={worldPosition}
                quaternion={worldQuaternion}
                scale={worldScale}
              >
                <HUDGlowMaterial isSelected={true} />
              </mesh>
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

      {/* Connection line removed - HUD card has its own line */}

      {/* Annotations are only shown when objects are clicked - no always-visible markers */}

      {/* Cinematic camera controller with creative movements */}
      <CinematicCameraController
        targetPosition={cameraTarget?.position || null}
        targetObject={cameraTarget?.object || null}
        autoRotate={autoRotate}
        onAnimationComplete={() => {
          // Animation complete callback
        }}
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
  const [groupsSaved, setGroupsSaved] = useState(true);
  const resetViewRef = useRef<(() => void) | null>(null);

  // HUD annotation system states
  const [clickPosition, setClickPosition] = useState<THREE.Vector3 | null>(null);
  const [screenPosition, setScreenPosition] = useState<{ x: number; y: number } | null>(null);
  const [showHUD, setShowHUD] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Camera control states
  const [cameraTarget, setCameraTarget] = useState<{
    position: THREE.Vector3;
    object: THREE.Object3D;
  } | null>(null);
  const [autoRotate, setAutoRotate] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showGroundSettings, setShowGroundSettings] = useState(false);
  const lastLoadedModelIdRef = useRef<string | null>(null);

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
    setTransform,
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

    if (lastLoadedModelIdRef.current === modelId) {
      return;
    }

    lastLoadedModelIdRef.current = modelId;

    loadState(modelId);

    loadGroups(modelId).then((groups) => {
      setMeshGroups(groups);
    });
  }, [modelId, setModelId, loadState]);

  useEffect(() => {
    const timer = setTimeout(() => {
      meshes.forEach(mesh => {
        if (mesh.userData?.isModelPlane && mesh.name !== 'Plane12847') {
          const transform = transforms.get(mesh.name);
          if (transform?.deleted || transform?.visible === false) {
            console.log(`Auto-resetting incorrectly hidden plane: ${mesh.name}`);
            setTransform(mesh.name, {
              ...transform,
              visible: true,
              deleted: false
            });
          }
        }
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [meshes, transforms, setTransform]);

  useEffect(() => {
    if (!materials.has('Plane12847')) {
      setMaterial('Plane12847', {
        model_id: modelId,
        object_name: 'Plane12847',
        material_type: 'custom',
        color: { r: 40, g: 40, b: 45, a: 1 }, // Slightly blue-grey
        properties: {
          metalness: 0.2,
          roughness: 0.8,
          opacity: 1,
          emissive: { r: 5, g: 5, b: 10, a: 1 },
          emissiveIntensity: 0.1
        }
      });
      setTransform('Plane12847', {
        scale: { x: 100, y: 100, z: 1 },
        visible: true
      });
    }
  }, [materials, modelId, setMaterial, setTransform]);

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

  // Apply group associations when meshes or groups change
  useEffect(() => {
    if (meshes.length > 0 && meshGroups.size > 0) {
      meshes.forEach(mesh => {
        meshGroups.forEach((members, groupName) => {
          if (members.includes(mesh.name)) {
            mesh.userData = { ...mesh.userData, group: groupName };
          }
        });
      });
    }
  }, [meshes, meshGroups]);

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
  const handleGroupMeshes = useCallback(async (meshNames: string[], groupName: string) => {
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

    // Save to database
    try {
      await updateGroup(modelId, groupName, meshNames);
      setGroupsSaved(true);
      console.log('Group saved to database:', groupName);
    } catch (error) {
      console.error('Failed to save group:', error);
      setGroupsSaved(false);
    }

    // Force re-render
    setMeshes([...meshes]);
  }, [meshes, modelId]);

  // Handle ungrouping
  const handleUngroupMeshes = useCallback(async (groupName: string) => {
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

    // Delete from database
    try {
      await deleteGroup(modelId, groupName);
      setGroupsSaved(true);
      console.log('Group deleted from database:', groupName);
    } catch (error) {
      console.error('Failed to delete group:', error);
      setGroupsSaved(false);
    }

    // Force re-render
    setMeshes([...meshes]);
  }, [meshes, modelId]);

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
      // Check for annotation - first by object name, then by group name
      const groupName = object.userData?.group;

      let existingAnnotation = annotations.find(a => a.object_name === object.name);

      // If no annotation found for object, check for group annotation
      if (!existingAnnotation && groupName) {
        existingAnnotation = annotations.find(a => a.object_name === groupName);
      }

      if (existingAnnotation) {
        setSelectedAnnotation(existingAnnotation);
        // Only show HUD if there's actual annotation content (title or description)
        if (existingAnnotation.title || existingAnnotation.description) {
          setShowHUD(true);
        } else {
          setShowHUD(false);
        }
      } else {
        // No annotation exists - create placeholder for editing but don't show HUD
        let annotationObjectName = object.name || 'Unnamed Object';

        if (groupName) {
          const groupMembers = meshGroups.get(groupName) || [];
          if (groupMembers.length > 0) {
            annotationObjectName = groupName;
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
        setShowHUD(false); // Don't show HUD for empty annotations
      }

      setShowAnnotationPanel(true);
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
      // Save editor state
      await saveState();

      // Save groups
      await saveGroups(modelId, meshGroups);
      setGroupsSaved(true);

      onSave();
      toast.success('All settings and groups saved successfully!', {
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

  // Toggle fullscreen
  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await canvasRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
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
              onMultiSelect={updateMultiSelection} // Allow multi-select for group selection
              selectedObject={selectedObject}
              selectedObjects={selectedObjects} // Pass actual selected objects for groups
              selectedMeshNames={selectedMeshNames} // Pass actual selected names for groups
              onSceneClick={handleSceneClick}
              resetViewRef={resetViewRef}
              onMeshesLoaded={handleMeshesLoaded}
              clickPosition={clickPosition}
              selectedAnnotation={selectedAnnotation}
              readOnly={true}
              setCameraTarget={setCameraTarget}
              cameraTarget={cameraTarget}
              autoRotate={autoRotate}
            />
            <ScreenPositionUpdater
              clickPosition={clickPosition}
              onScreenPositionUpdate={setScreenPosition}
            />
            {/* Cinematic camera controller for viewer */}
            <CinematicCameraController
              targetPosition={cameraTarget?.position || null}
              targetObject={cameraTarget?.object || null}
              autoRotate={autoRotate}
              onAnimationComplete={() => {
                // Animation complete callback
              }}
            />
          </Suspense>
        </Canvas>

        {/* Floating Controls for Viewer */}
        {readOnly && (
          <>
            <div className="absolute top-4 left-4 flex flex-col gap-2">
              {/* Reset View Button */}
              <button
                onClick={handleResetView}
                className="glass-button p-2 rounded-lg text-white hover:text-blue-400 transition-colors"
                title="Reset View"
              >
                <RotateCcw size={20} />
              </button>

              {/* Drone Mode Toggle - Cinematic Auto-Rotate */}
              <button
                onClick={() => setAutoRotate(!autoRotate)}
                className={`glass-button p-2 rounded-lg transition-all duration-300 ${
                  autoRotate
                    ? 'text-blue-400 bg-blue-500/20 shadow-lg shadow-blue-500/30 animate-pulse'
                    : 'text-white hover:text-blue-400'
                }`}
                title={autoRotate ? 'Stop Drone Mode' : 'Start Drone Mode (Auto-Rotate)'}
              >
                <Plane
                  size={20}
                  className={`transition-transform duration-500 ${
                    autoRotate ? 'rotate-45' : ''
                  }`}
                />
              </button>

              {/* Fullscreen Toggle */}
              <button
                onClick={toggleFullscreen}
                className="glass-button p-2 rounded-lg text-white hover:text-blue-400 transition-colors"
                title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
              >
                {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
              </button>
            </div>

            {/* Logo in top right corner */}
            <div className="absolute top-4 right-4">
              <img
                src="/logo.png"
                alt="Logo"
                className="h-16 w-auto object-contain opacity-90 hover:opacity-100 transition-opacity duration-300"
                style={{
                  filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5))'
                }}
              />
            </div>
          </>
        )}

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
              setCameraTarget={setCameraTarget}
              cameraTarget={cameraTarget}
              autoRotate={autoRotate}
            />
            <ScreenPositionUpdater
              clickPosition={clickPosition}
              onScreenPositionUpdate={setScreenPosition}
            />
            {/* Cinematic camera controller for editor */}
            <CinematicCameraController
              targetPosition={cameraTarget?.position || null}
              targetObject={cameraTarget?.object || null}
              autoRotate={autoRotate}
              onAnimationComplete={() => {
                // Animation complete callback
              }}
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

          {/* Drone Mode Toggle - Cinematic Auto-Rotate */}
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`glass-button p-2 rounded-lg transition-all duration-300 ${
              autoRotate
                ? 'text-blue-400 bg-blue-500/20 shadow-lg shadow-blue-500/30'
                : 'text-white hover:text-blue-400'
            }`}
            title={autoRotate ? 'Disable Drone Mode' : 'Enable Drone Mode'}
          >
            <Plane
              size={20}
              className={`transition-transform duration-300 ${
                autoRotate ? 'rotate-45' : ''
              }`}
            />
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

              {/* Ground Settings Button */}
              <button
                onClick={() => setShowGroundSettings(!showGroundSettings)}
                className={`w-full mt-3 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                  showGroundSettings
                    ? 'glass-button-primary text-white'
                    : 'glass-button text-gray-400 hover:text-white'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Ground Settings
              </button>

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
            {/* Ground Settings Panel */}
            {showGroundSettings && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Ground Plane Settings</h3>
                  <button
                    onClick={() => setShowGroundSettings(false)}
                    className="p-1 hover:bg-white/10 rounded transition-colors"
                  >
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Material Settings for Ground */}
                <MaterialPanel
                  objectName="Plane12847"
                  material={materials.get("Plane12847") || {
                    model_id: modelId,
                    object_name: 'Plane12847',
                    material_type: 'custom',
                    color: { r: 40, g: 40, b: 45, a: 1 },
                    properties: {
                      metalness: 0.2,
                      roughness: 0.8,
                      opacity: 1,
                      emissive: { r: 5, g: 5, b: 10, a: 1 },
                      emissiveIntensity: 0.1
                    }
                  }}
                  onChange={(newMaterial) => {
                    setMaterial("Plane12847", newMaterial);
                    toast.success('Ground plane updated', {
                      position: 'bottom-left',
                      duration: 2000,
                    });
                  }}
                />

                {/* Visibility Toggle */}
                <div className="glass-panel-light rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">Ground Visibility</span>
                    <button
                      onClick={() => toggleObjectVisibility("Plane12847")}
                      className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                        transforms.get("Plane12847")?.visible !== false
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-gray-600/20 text-gray-400'
                      }`}
                    >
                      {transforms.get("Plane12847")?.visible !== false ? 'Visible' : 'Hidden'}
                    </button>
                  </div>
                </div>

                {/* Scale Adjustment */}
                <div className="glass-panel-light rounded-lg p-4">
                  <label className="text-sm text-gray-300 mb-2 block">Ground Scale</label>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={transforms.get("Plane12847")?.scale?.x || 50}
                    onChange={(e) => {
                      const scale = parseFloat(e.target.value);
                      setTransform("Plane12847", {
                        scale: { x: scale, y: scale, z: 1 }
                      });
                    }}
                    className="w-full"
                  />
                  <div className="text-xs text-gray-400 mt-1">
                    Scale: {transforms.get("Plane12847")?.scale?.x || 50}x
                  </div>
                </div>

                {/* Reset Ground */}
                <button
                  onClick={() => {
                    // Reset ground to defaults
                    setMaterial("Plane12847", {
                      model_id: modelId,
                      object_name: 'Plane12847',
                      material_type: 'custom',
                      color: { r: 40, g: 40, b: 45, a: 1 },
                      properties: {
                        metalness: 0.2,
                        roughness: 0.8,
                        opacity: 1,
                        emissive: { r: 5, g: 5, b: 10, a: 1 },
                        emissiveIntensity: 0.1
                      },
                      texture_url: undefined
                    });
                    setTransform("Plane12847", {
                      scale: { x: 50, y: 50, z: 1 },
                      visible: true
                    });
                    toast.success('Ground plane reset to defaults', {
                      position: 'bottom-left',
                      duration: 2000,
                    });
                  }}
                  className="w-full py-2 glass-button rounded-lg text-gray-400 hover:text-white transition-colors"
                >
                  Reset to Defaults
                </button>
              </div>
            )}

            {activePanel === 'material' && selectedObjectName && !showGroundSettings && (
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

            {activePanel === 'environment' && environment && !showGroundSettings && (
              <EnvironmentPanel
                environment={environment}
                onChange={(updatedEnvironment) => {
                  setEnvironment(updatedEnvironment);
                }}
              />
            )}

            {activePanel === 'annotations' && !showGroundSettings && (
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
