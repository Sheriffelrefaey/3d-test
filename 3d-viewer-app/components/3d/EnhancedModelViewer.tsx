'use client';

import React, { useEffect, useRef, useState, Suspense, useCallback } from 'react';
import { Canvas, useThree, useLoader } from '@react-three/fiber';
import { OrbitControls, Environment, Grid, Html } from '@react-three/drei';
import * as THREE from 'three';
import { getGLTFLoader } from '@/lib/three/loaders';
import { materialToThreeJS } from '@/lib/materials/presets';
import type { Annotation } from '@/types';
import {
  loadMaterials,
  loadTransforms,
  loadEnvironment
} from '@/lib/store/editorPersistence';
import {
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize2
} from 'lucide-react';

// Import glassmorphism styles
import '@/styles/glassmorphism.css';

interface EnhancedModelViewerProps {
  modelUrl: string;
  modelId: string;
  annotations?: Annotation[];
  onAnnotationClick?: (annotation: Annotation) => void;
  showAnnotations?: boolean;
}

function ViewerScene({
  modelUrl,
  modelId,
  annotations = [],
  onAnnotationClick,
  showAnnotations = true,
  resetViewRef,
  onControlsReady
}: EnhancedModelViewerProps & {
  resetViewRef: React.MutableRefObject<(() => void) | null>;
  onControlsReady: (controls: any) => void;
}) {
  const gltf = useLoader(getGLTFLoader, modelUrl);
  const { camera, scene } = useThree();
  const [meshes, setMeshes] = useState<THREE.Mesh[]>([]);
  const [materials, setMaterials] = useState<Map<string, any>>(new Map());
  const [transforms, setTransforms] = useState<Map<string, any>>(new Map());
  const [environment, setEnvironment] = useState<any>(null);
  const controlsRef = useRef<any>();
  const initialCameraPosition = useRef<THREE.Vector3>();
  const initialCameraTarget = useRef<THREE.Vector3>();

  // Load saved settings
  useEffect(() => {
    const loadSettings = async () => {
      const [loadedMaterials, loadedTransforms, loadedEnvironment] = await Promise.all([
        loadMaterials(modelId),
        loadTransforms(modelId),
        loadEnvironment(modelId)
      ]);

      // Convert to maps
      const materialsMap = new Map();
      loadedMaterials.forEach(m => {
        if (m.object_name) materialsMap.set(m.object_name, m);
      });
      setMaterials(materialsMap);

      const transformsMap = new Map();
      loadedTransforms.forEach(t => {
        if (t.object_name) transformsMap.set(t.object_name, t);
      });
      setTransforms(transformsMap);

      setEnvironment(loadedEnvironment);
    };

    loadSettings();
  }, [modelId]);

  // Extract and setup meshes - matching admin editor EXACTLY
  useEffect(() => {
    if (!gltf || !gltf.scene) return;

    const extractedMeshes: THREE.Mesh[] = [];
    gltf.scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        extractedMeshes.push(child);
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    setMeshes(extractedMeshes);

    // Reset any existing transformations (EXACTLY like admin)
    gltf.scene.position.set(0, 0, 0);
    gltf.scene.rotation.set(0, 0, 0);
    gltf.scene.scale.set(1, 1, 1);
    gltf.scene.updateMatrixWorld(true);

    // Calculate bounds of the unscaled model
    const box = new THREE.Box3().setFromObject(gltf.scene);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    // Calculate scale to fit the model (30 / maxDim - EXACTLY like admin)
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 30 / maxDim;  // Changed to 30 to match admin editor

    // Apply scale and center the model at origin (EXACTLY like admin)
    gltf.scene.scale.setScalar(scale);
    gltf.scene.position.x = -center.x * scale;
    gltf.scene.position.z = -center.z * scale;
    gltf.scene.position.y = -box.min.y * scale;

    const scaledHeight = size.y * scale;
    const scaledWidth = size.x * scale;
    const scaledDepth = size.z * scale;

    // Much closer view with higher angle (EXACTLY like admin)
    const distance = Math.max(scaledWidth, scaledDepth, scaledHeight) * 0.5;  // Even closer (0.5)
    const cameraHeight = scaledHeight * 0.8 + distance * 0.7;  // Higher camera angle

    // Set camera position and look at origin
    const cameraPos = new THREE.Vector3(distance * 0.7, cameraHeight, distance * 0.7);
    const targetPos = new THREE.Vector3(0, 0, 0);  // Center at origin
    camera.position.copy(cameraPos);
    camera.lookAt(targetPos);
    camera.updateProjectionMatrix();

    // Store initial camera position for reset
    initialCameraPosition.current = cameraPos.clone();
    initialCameraTarget.current = targetPos.clone();

    // Setup reset function
    resetViewRef.current = () => {
      if (controlsRef.current && initialCameraPosition.current && initialCameraTarget.current) {
        camera.position.copy(initialCameraPosition.current);
        controlsRef.current.target.copy(initialCameraTarget.current);
        controlsRef.current.update();
      }
    };
  }, [gltf, camera, resetViewRef]);

  // Apply materials to meshes with texture support
  useEffect(() => {
    meshes.forEach(mesh => {
      const material = materials.get(mesh.name);
      if (material) {
        // Check if mesh has UV coordinates - required for textures
        const geometry = mesh.geometry;
        const hasUVs = geometry.attributes.uv && geometry.attributes.uv.count > 0;

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

                if (settings.repeat) {
                  texture.repeat.set(settings.repeat.x || 1, settings.repeat.y || 1);
                }
                if (settings.offset) {
                  texture.offset.set(settings.offset.x || 0, settings.offset.y || 0);
                }
                if (settings.rotation !== undefined) {
                  texture.rotation = settings.rotation;
                }

                texture.center.set(0.5, 0.5);
                texture.wrapS = settings.wrapS === 'repeat' ? THREE.RepeatWrapping :
                              settings.wrapS === 'mirror' ? THREE.MirroredRepeatWrapping :
                              THREE.ClampToEdgeWrapping;
                texture.wrapT = settings.wrapT === 'repeat' ? THREE.RepeatWrapping :
                              settings.wrapT === 'mirror' ? THREE.MirroredRepeatWrapping :
                              THREE.ClampToEdgeWrapping;
              } else {
                texture.wrapS = THREE.RepeatWrapping;
                texture.wrapT = THREE.RepeatWrapping;
              }

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
        } else if (material.texture_url && !hasUVs) {
          console.warn(`Mesh "${mesh.name}" doesn't have UV coordinates. Texture cannot be applied.`);
        }
      }
    });
  }, [materials, meshes]);

  // Apply transforms to meshes
  useEffect(() => {
    meshes.forEach(mesh => {
      const transform = transforms.get(mesh.name);
      if (transform) {
        // Apply visibility
        mesh.visible = transform.visible !== false && !transform.deleted;
      }
    });
  }, [transforms, meshes]);

  // Apply environment settings
  useEffect(() => {
    if (!environment) return;

    // Apply background
    if (environment.background) {
      if (environment.background.type === 'solid' && environment.background.color) {
        const color = environment.background.color;
        scene.background = new THREE.Color(color.r / 255, color.g / 255, color.b / 255);
      } else if (environment.background.type === 'gradient' && environment.background.gradient) {
        // Create gradient background
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const gradient = environment.background.gradient;
          const grd = ctx.createLinearGradient(0, 0, 0, 512);
          grd.addColorStop(0, `rgb(${gradient.start.r}, ${gradient.start.g}, ${gradient.start.b})`);
          grd.addColorStop(1, `rgb(${gradient.end.r}, ${gradient.end.g}, ${gradient.end.b})`);
          ctx.fillStyle = grd;
          ctx.fillRect(0, 0, 512, 512);
          const texture = new THREE.CanvasTexture(canvas);
          scene.background = texture;
        }
      }
    }

    // Apply fog
    if (environment.fog?.enabled) {
      const fogColor = new THREE.Color(
        environment.fog.color.r / 255,
        environment.fog.color.g / 255,
        environment.fog.color.b / 255
      );
      scene.fog = new THREE.Fog(fogColor, environment.fog.near, environment.fog.far);
    } else {
      scene.fog = null;
    }
  }, [environment, scene]);

  return (
    <>
      {/* Dynamic Lighting based on environment */}
      {environment && (
        <>
          <ambientLight
            intensity={environment.lighting?.ambient?.intensity || 0.8}
            color={environment.lighting?.ambient?.color ?
              new THREE.Color(
                environment.lighting.ambient.color.r / 255,
                environment.lighting.ambient.color.g / 255,
                environment.lighting.ambient.color.b / 255
              ) : undefined}
          />
          {environment.lighting?.directional?.map((light: any, index: number) => (
            <directionalLight
              key={index}
              position={[light.position?.x || 10, light.position?.y || 10, light.position?.z || 5]}
              intensity={light.intensity || 1.5}
              color={new THREE.Color(
                light.color?.r / 255 || 1,
                light.color?.g / 255 || 1,
                light.color?.b / 255 || 1
              )}
              castShadow={light.castShadow}
            />
          ))}
        </>
      )}

      {/* Default Environment if not set */}
      {(!environment || environment?.background?.type === 'environment') && (
        <Environment preset={environment?.background?.environmentPreset as any || 'studio'} />
      )}

      {/* Grid */}
      {environment?.grid?.show !== false && (
        <Grid
          infiniteGrid
          fadeDistance={30}
          fadeStrength={1}
          cellSize={0.5}
          sectionSize={(environment?.grid?.divisions || 20) / 4}
          sectionColor={`rgb(${environment?.grid?.color?.r || 156}, ${environment?.grid?.color?.g || 163}, ${environment?.grid?.color?.b || 175})`}
          cellColor={`rgb(${environment?.grid?.color?.r || 156}, ${environment?.grid?.color?.g || 163}, ${environment?.grid?.color?.b || 175})`}
          args={[environment?.grid?.size || 20, environment?.grid?.size || 20]}
        />
      )}

      {/* Render the entire model centered, with proper transforms applied (EXACTLY like admin) */}
      <group position={[0, 0, 0]}>
        <primitive object={gltf.scene} />
      </group>

      {/* Annotations - Only show labels, no spheres (matching admin editor EXACTLY) */}
      {showAnnotations && annotations.map((annotation) => (
        <Html
          key={annotation.id}
          position={[annotation.position_x, annotation.position_y, annotation.position_z]}
          center
        >
          <div className="bg-black/80 backdrop-blur-md px-2 py-1 rounded shadow-lg text-xs text-white whitespace-nowrap border border-white/10 cursor-pointer hover:bg-black/90 transition-colors"
               onClick={() => onAnnotationClick?.(annotation)}>
            {annotation.title || 'Untitled'}
          </div>
        </Html>
      ))}

      {/* Camera Controls with increased zoom limits (matching admin editor) */}
      <OrbitControls
        ref={(ref) => {
          controlsRef.current = ref;
          if (ref) {
            ref.target.copy(initialCameraTarget.current || new THREE.Vector3(0, 0, 0));
            ref.update();
            onControlsReady(ref);
          }
        }}
        makeDefault
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={0.1}  // Much closer zoom (matching admin)
        maxDistance={500}  // Much further zoom (matching admin)
      />
    </>
  );
}

export default function EnhancedModelViewer(props: EnhancedModelViewerProps) {
  const resetViewRef = useRef<(() => void) | null>(null);
  const controlsRef = useRef<any>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const handleZoomIn = useCallback(() => {
    if (controlsRef.current) {
      const camera = controlsRef.current.object;
      const direction = new THREE.Vector3();
      camera.getWorldDirection(direction);
      camera.position.addScaledVector(direction, 1);
      controlsRef.current.update();
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    if (controlsRef.current) {
      const camera = controlsRef.current.object;
      const direction = new THREE.Vector3();
      camera.getWorldDirection(direction);
      camera.position.addScaledVector(direction, -1);
      controlsRef.current.update();
    }
  }, []);

  const handleFullscreen = useCallback(() => {
    if (canvasRef.current) {
      if (!document.fullscreenElement) {
        canvasRef.current.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
    }
  }, []);

  const handleResetView = useCallback(() => {
    if (resetViewRef.current) {
      resetViewRef.current();
    }
  }, []);

  return (
    <div ref={canvasRef} className="w-full h-full relative">
      {/* Control Buttons */}
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <button
          onClick={handleResetView}
          className="glass-button p-2 rounded-lg text-white hover:text-blue-400 transition-colors"
          title="Reset View"
        >
          <RotateCcw size={20} />
        </button>
        <button
          onClick={handleZoomIn}
          className="glass-button p-2 rounded-lg text-white hover:text-blue-400 transition-colors"
          title="Zoom In"
        >
          <ZoomIn size={20} />
        </button>
        <button
          onClick={handleZoomOut}
          className="glass-button p-2 rounded-lg text-white hover:text-blue-400 transition-colors"
          title="Zoom Out"
        >
          <ZoomOut size={20} />
        </button>
        <button
          onClick={handleFullscreen}
          className="glass-button p-2 rounded-lg text-white hover:text-blue-400 transition-colors"
          title="Fullscreen"
        >
          <Maximize2 size={20} />
        </button>
      </div>

      {/* 3D Canvas */}
      <Canvas camera={{ position: [5, 4, 5], fov: 50 }} shadows>
        <Suspense fallback={null}>
          <ViewerScene
            {...props}
            resetViewRef={resetViewRef}
            onControlsReady={(controls) => { controlsRef.current = controls; }}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}