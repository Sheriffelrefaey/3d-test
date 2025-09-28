'use client';

import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitControls } from '@react-three/drei';

interface CameraAnimatorProps {
  targetPosition: THREE.Vector3 | null;
  targetObject: any | null;  // Allow any type to properly check
  onAnimationComplete?: () => void;
  enabled?: boolean;
}

// Cinematic movement patterns - closer angles
const CAMERA_PATTERNS = [
  // Right corner approach
  {
    name: 'rightCorner',
    offset: new THREE.Vector3(0.7, 0.6, 0.7),
    lookAtOffset: new THREE.Vector3(0, 0.05, 0),
    duration: 1800
  },
  // Left corner approach
  {
    name: 'leftCorner',
    offset: new THREE.Vector3(-0.7, 0.5, 0.7),
    lookAtOffset: new THREE.Vector3(0, 0, 0),
    duration: 2000
  },
  // Front elevated
  {
    name: 'frontElevated',
    offset: new THREE.Vector3(0, 0.8, 0.9),
    lookAtOffset: new THREE.Vector3(0, -0.1, 0),
    duration: 2200
  },
  // Dramatic overhead
  {
    name: 'overhead',
    offset: new THREE.Vector3(-0.3, 1.2, 0.3),
    lookAtOffset: new THREE.Vector3(0, 0, 0),
    duration: 2500
  },
  // Dynamic side sweep
  {
    name: 'sideSweep',
    offset: new THREE.Vector3(0.9, 0.4, 0),
    lookAtOffset: new THREE.Vector3(0, 0.05, 0),
    duration: 1800
  }
];

export default function CameraAnimator({
  targetPosition,
  targetObject,
  onAnimationComplete,
  enabled = true
}: CameraAnimatorProps) {
  const { camera, gl, scene } = useThree();
  const controlsRef = useRef<any>(null);
  const animationRef = useRef<{
    isAnimating: boolean;
    startTime: number;
    duration: number;
    startPos: THREE.Vector3;
    endPos: THREE.Vector3;
    startTarget: THREE.Vector3;
    endTarget: THREE.Vector3;
    pattern: typeof CAMERA_PATTERNS[0];
    progress: number;
  } | null>(null);
  const lastPatternIndex = useRef(0);
  const modelBoundsRef = useRef<{ size: number; center: THREE.Vector3 }>();

  // Calculate overall model bounds on mount (excluding ground plane)
  useEffect(() => {
    const box = new THREE.Box3();
    let hasObjects = false;

    scene.traverse((child) => {
      if (child instanceof THREE.Mesh && child.name !== 'Plane12847') {
        // Use geometry bounds instead of object bounds to avoid including children
        child.geometry.computeBoundingBox();
        const meshBox = child.geometry.boundingBox!.clone();
        meshBox.applyMatrix4(child.matrixWorld);

        if (!hasObjects) {
          box.copy(meshBox);
          hasObjects = true;
        } else {
          box.union(meshBox);
        }
      }
    });

    if (hasObjects) {
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);

      // Log for debugging
      console.log('Model bounds calculated (excluding Plane12847):', {
        size: maxDim,
        center,
        box
      });

      modelBoundsRef.current = { size: maxDim, center };
    }
  }, [scene]);

  useEffect(() => {
    if (targetObject && targetPosition && enabled) {
      // Skip camera animation for ground plane
      if (targetObject.name === 'Plane12847') {
        console.log('Skipping camera animation for Plane12847');
        return;
      }

      console.log('Camera animation target:', {
        name: targetObject.name,
        type: targetObject.type,
        position: targetPosition
      });

      // Calculate bounding box of ONLY the target mesh, not its children
      let box: THREE.Box3;
      let center: THREE.Vector3;
      let size: THREE.Vector3;

      if (targetObject instanceof THREE.Mesh) {
        // For meshes, use geometry bounding box
        targetObject.geometry.computeBoundingBox();
        box = targetObject.geometry.boundingBox!.clone();
        box.applyMatrix4(targetObject.matrixWorld);
        center = box.getCenter(new THREE.Vector3());
        size = box.getSize(new THREE.Vector3());
      } else {
        // For other objects, calculate bounds excluding Plane12847
        box = new THREE.Box3();
        let hasValidObject = false;

        targetObject.traverse((child) => {
          if (child instanceof THREE.Mesh && child.name !== 'Plane12847') {
            if (!hasValidObject) {
              box.setFromObject(child);
              hasValidObject = true;
            } else {
              box.expandByObject(child);
            }
          }
        });

        if (!hasValidObject) {
          // Fallback to target position
          box.setFromCenterAndSize(targetPosition, new THREE.Vector3(1, 1, 1));
        }

        center = box.getCenter(new THREE.Vector3());
        size = box.getSize(new THREE.Vector3());
      }

      // Calculate appropriate camera distance based on object size
      // Use logarithmic scaling to prevent camera from going too far for large objects
      const maxDim = Math.max(size.x, size.y, size.z);

      // Calculate appropriate distance based on actual object size
      // Force much closer view regardless of object size
      let baseDistance;
      if (maxDim < 0.5) {
        baseDistance = 2; // Very small objects
      } else if (maxDim < 2) {
        baseDistance = maxDim + 1.5; // Small to medium objects
      } else {
        // For larger objects, use logarithmic scale but stay close
        baseDistance = 2 + Math.log(maxDim) * 0.8;
      }

      // Clamp to reasonable range
      baseDistance = Math.max(1.5, Math.min(baseDistance, 8));

      // Select pattern (cycle through patterns or choose based on camera position)
      const currentCameraPos = camera.position.clone();
      let patternIndex = lastPatternIndex.current;

      // Choose pattern based on camera's current position relative to object
      const angleToObject = Math.atan2(
        currentCameraPos.x - center.x,
        currentCameraPos.z - center.z
      );

      // Smart pattern selection based on angle
      if (Math.abs(angleToObject) < Math.PI / 4) {
        patternIndex = 0; // Right corner
      } else if (Math.abs(angleToObject) > 3 * Math.PI / 4) {
        patternIndex = 1; // Left corner
      } else if (angleToObject > 0) {
        patternIndex = 2; // Front elevated
      } else {
        patternIndex = 4; // Side sweep
      }

      // Occasionally use overhead for variety
      if (Math.random() < 0.2) {
        patternIndex = 3; // Overhead
      }

      const pattern = CAMERA_PATTERNS[patternIndex];
      lastPatternIndex.current = (patternIndex + 1) % CAMERA_PATTERNS.length;

      console.log('Base distance calculation:', {
        maxDim,
        baseDistance,
        pattern: pattern.name
      });

      // Calculate final camera position
      const finalCameraPos = new THREE.Vector3(
        center.x + pattern.offset.x * baseDistance,
        center.y + pattern.offset.y * baseDistance,
        center.z + pattern.offset.z * baseDistance
      );

      // Ensure camera never goes below ground level (y = 0.5)
      finalCameraPos.y = Math.max(0.5, finalCameraPos.y);

      console.log('Camera animation calculated:', {
        objectSize: maxDim,
        baseDistance,
        finalCameraPos,
        center
      });

      // Calculate look-at target with offset
      const lookAtTarget = center.clone().add(pattern.lookAtOffset.clone().multiplyScalar(maxDim));

      // Get current orbit controls target
      const currentTarget = controlsRef.current?.target
        ? controlsRef.current.target.clone()
        : new THREE.Vector3(0, 0, 0);

      // Start animation
      animationRef.current = {
        isAnimating: true,
        startTime: Date.now(),
        duration: pattern.duration,
        startPos: currentCameraPos,
        endPos: finalCameraPos,
        startTarget: currentTarget,
        endTarget: lookAtTarget,
        pattern: pattern,
        progress: 0
      };

      // Disable orbit controls during animation
      if (controlsRef.current) {
        controlsRef.current.enabled = false;
      }
    }
  }, [targetObject, targetPosition, camera, enabled]);

  useFrame(() => {
    // Continuously enforce minimum camera height
    if (camera.position.y < 0.3) {
      camera.position.y = 0.3;
    }

    if (animationRef.current && animationRef.current.isAnimating) {
      const {
        startTime,
        duration,
        startPos,
        endPos,
        startTarget,
        endTarget,
        pattern
      } = animationRef.current;

      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Use easing function for smooth movement
      const easeInOutCubic = (t: number) => {
        return t < 0.5
          ? 4 * t * t * t
          : 1 - Math.pow(-2 * t + 2, 3) / 2;
      };

      const easedProgress = easeInOutCubic(progress);

      // Add subtle curve to camera path for more cinematic movement
      const curveHeight = pattern.name === 'overhead' ? 0 : Math.sin(progress * Math.PI) * 0.3;

      // Interpolate camera position with curve
      const currentPos = new THREE.Vector3().lerpVectors(startPos, endPos, easedProgress);
      currentPos.y += curveHeight;

      // Ensure minimum height
      currentPos.y = Math.max(0.3, currentPos.y);

      // Interpolate target position
      const currentTarget = new THREE.Vector3().lerpVectors(startTarget, endTarget, easedProgress);

      // Apply to camera
      camera.position.copy(currentPos);
      camera.lookAt(currentTarget);
      camera.updateProjectionMatrix();

      // Update orbit controls target
      if (controlsRef.current?.target) {
        controlsRef.current.target.copy(currentTarget);
      }

      // Store progress
      animationRef.current.progress = progress;

      // Check if animation is complete
      if (progress >= 1) {
        animationRef.current.isAnimating = false;

        // Re-enable orbit controls
        if (controlsRef.current) {
          controlsRef.current.enabled = true;
          controlsRef.current.update();
        }

        // Callback
        if (onAnimationComplete) {
          onAnimationComplete();
        }
      }
    }
  });

  // Calculate dynamic max distance based on model size (excluding ground plane)
  // Force tighter bounds to keep camera close to models
  const maxDistance = modelBoundsRef.current
    ? Math.min(modelBoundsRef.current.size * 2 + 10, 40) // Much tighter max distance
    : 40;

  const minDistance = modelBoundsRef.current
    ? Math.max(modelBoundsRef.current.size * 0.05, 0.3) // Allow close zoom but not too close
    : 0.3;

  console.log('Camera limits:', { maxDistance, minDistance, modelSize: modelBoundsRef.current?.size });

  return (
    <OrbitControls
      ref={controlsRef}
      args={[camera, gl.domElement]}
      enableDamping
      dampingFactor={0.05}
      rotateSpeed={1.0}
      zoomSpeed={1.2}
      panSpeed={0.8}
      minDistance={minDistance}
      maxDistance={maxDistance}
      maxPolarAngle={Math.PI / 2 - 0.1} // Prevent camera from going below horizon
      minPolarAngle={0.1} // Prevent complete vertical flip
      enablePan={true}
      enableZoom={true}
      enableRotate={true}
    />
  );
}