'use client';

import React, { useRef, useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { useEditorStore } from '@/lib/store/editorStore';
import type { ObjectMaterial } from '@/types';

type GroundPlaneEventHandler = (event: any, mesh: THREE.Mesh) => void;

interface InfiniteGroundPlaneProps {
  color?: string;
  gridColor?: string;
  readOnly?: boolean;
  showGrid?: boolean;
  onSelect?: GroundPlaneEventHandler;
  onPointerOver?: GroundPlaneEventHandler;
  onPointerOut?: GroundPlaneEventHandler;
  onContextMenu?: GroundPlaneEventHandler;
}

// Global texture cache to prevent reloading
const textureCache = new Map<string, THREE.Texture>();

const wrapModeMap = {
  repeat: THREE.RepeatWrapping,
  mirror: THREE.MirroredRepeatWrapping,
  clamp: THREE.ClampToEdgeWrapping
} as const;

const applyTextureSettings = (
  texture: THREE.Texture,
  settings: ObjectMaterial['texture_settings']
) => {
  if (!texture) return;

  const repeat = settings?.repeat ?? settings?.scale;
  const offset = settings?.offset;
  const rotation = settings?.rotation ?? 0;

  texture.repeat.set(repeat?.x ?? 1, repeat?.y ?? 1);
  texture.offset.set(offset?.x ?? 0, offset?.y ?? 0);
  texture.center.set(0.5, 0.5);
  texture.rotation = rotation;
  texture.colorSpace = THREE.SRGBColorSpace;

  const wrapS = settings?.wrapS ? wrapModeMap[settings.wrapS] : THREE.RepeatWrapping;
  const wrapT = settings?.wrapT ? wrapModeMap[settings.wrapT] : THREE.RepeatWrapping;
  texture.wrapS = wrapS;
  texture.wrapT = wrapT;

  texture.needsUpdate = true;
};

// Create infinite ground plane
export default function InfiniteGroundPlane({
  color = '#0a0a0a',
  gridColor = '#1a1a1a',
  readOnly = false,
  showGrid = true,
  onSelect,
  onPointerOver,
  onPointerOut,
  onContextMenu
}: InfiniteGroundPlaneProps) {
  const materials = useEditorStore(state => state.materials);
  const transforms = useEditorStore(state => state.transforms);
  const groundMaterial = materials.get('Plane12847');
  const groundTransform = transforms.get('Plane12847');
  const meshRef = useRef<THREE.Mesh>(null);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [isLoadingTexture, setIsLoadingTexture] = useState(false);

  // Load texture when URL changes
  useEffect(() => {
    if (groundMaterial?.texture_url) {
      // Check cache first
      const cached = textureCache.get(groundMaterial.texture_url);
      if (cached) {
        const configuredTexture = cached.clone();
        configuredTexture.image = cached.image;
        configuredTexture.anisotropy = cached.anisotropy;
        applyTextureSettings(configuredTexture, groundMaterial.texture_settings);
        setTexture(configuredTexture);
        setIsLoadingTexture(false);
        return;
      }

      // Set loading state to prevent color flashing
      setIsLoadingTexture(true);

      // Load new texture
      const loader = new THREE.TextureLoader();
      loader.load(
        groundMaterial.texture_url,
        (loadedTexture) => {
          loadedTexture.anisotropy = 16;
          textureCache.set(groundMaterial.texture_url!, loadedTexture);

          const configuredTexture = loadedTexture.clone();
          configuredTexture.image = loadedTexture.image;
          configuredTexture.anisotropy = loadedTexture.anisotropy;
          applyTextureSettings(configuredTexture, groundMaterial.texture_settings);

          setTexture(configuredTexture);
          setIsLoadingTexture(false);
          console.log('Ground texture loaded:', groundMaterial.texture_url);
        },
        undefined,
        (error) => {
          console.error('Error loading ground texture:', error);
          setTexture(null);
          setIsLoadingTexture(false);
        }
      );
    } else {
      // Only clear texture if we explicitly don't have a URL
      if (!isLoadingTexture) {
        setTexture(null);
      }
    }
  }, [groundMaterial?.texture_url, groundMaterial?.texture_settings]);

  useEffect(() => {
    if (texture && groundMaterial?.texture_settings) {
      applyTextureSettings(texture, groundMaterial.texture_settings);
      if (meshRef.current?.material instanceof THREE.MeshStandardMaterial) {
        meshRef.current.material.needsUpdate = true;
      }
    }
  }, [texture, groundMaterial?.texture_settings]);

  // Create material - use previous material while loading
  const material = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      color: groundMaterial ? new THREE.Color(
        groundMaterial.color.r / 255,
        groundMaterial.color.g / 255,
        groundMaterial.color.b / 255
      ) : new THREE.Color(color),
      metalness: groundMaterial?.properties?.metalness ?? 0.1,
      roughness: groundMaterial?.properties?.roughness ?? 0.9,
      opacity: groundMaterial?.properties?.opacity ?? 1,
      transparent: (groundMaterial?.properties?.opacity ?? 1) < 1,
      side: THREE.DoubleSide
    });

    // Apply texture if available and not loading
    if (texture && !isLoadingTexture) {
      mat.map = texture;
      mat.needsUpdate = true;
    } else if (groundMaterial?.texture_url && isLoadingTexture) {
      // Keep previous texture while loading new one
      if (meshRef.current?.material instanceof THREE.MeshStandardMaterial) {
        mat.map = meshRef.current.material.map;
      }
    }

    // Apply emissive if available
    if (groundMaterial?.properties?.emissive) {
      mat.emissive = new THREE.Color(
        groundMaterial.properties.emissive.r / 255,
        groundMaterial.properties.emissive.g / 255,
        groundMaterial.properties.emissive.b / 255
      );
      mat.emissiveIntensity = groundMaterial.properties.emissiveIntensity ?? 0;
    }

    return mat;
  }, [groundMaterial, texture, color, isLoadingTexture]);

  // Get scale from transform or use default
  const scale = groundTransform?.scale || { x: 100, y: 100, z: 1 };
  const visible = groundTransform?.visible !== false;

  if (!visible) return null;

  return (
    <>
      {/* The actual ground plane with the Plane12847 name */}
      <mesh
        ref={meshRef}
        name="Plane12847"
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.01, 0]}
        scale={[scale.x, scale.y, scale.z]}
        material={material}
        userData={{ isGroundPlane: true, isSelectable: true, isModelPlane: true }}
        onClick={(event) => {
          event.stopPropagation();
          if (readOnly) return;
          if (meshRef.current) {
            onSelect?.(event, meshRef.current);
          }
        }}
        onContextMenu={(event) => {
          event.stopPropagation();
          if (readOnly) return;
          if (meshRef.current) {
            onContextMenu?.(event, meshRef.current);
          }
        }}
        onPointerOver={(event) => {
          event.stopPropagation();
          if (readOnly) return;
          if (meshRef.current) {
            onPointerOver?.(event, meshRef.current);
          }
        }}
        onPointerOut={(event) => {
          event.stopPropagation();
          if (readOnly) return;
          if (meshRef.current) {
            onPointerOut?.(event, meshRef.current);
          }
        }}
        receiveShadow
      >
        <planeGeometry args={[100, 100, 1, 1]} />
      </mesh>

      {/* Optional grid overlay */}
      {showGrid && !texture && !isLoadingTexture && (
        <gridHelper
          args={[200, 200, gridColor, gridColor]}
          position={[0, 0.001, 0]}
          material-opacity={0.15}
          material-transparent={true}
        />
      )}
    </>
  );
}
