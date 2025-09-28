'use client';

import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitControls } from '@react-three/drei';

interface SimpleCameraControllerProps {
  targetPosition: THREE.Vector3 | null;
  targetObject: any | null;
  onAnimationComplete?: () => void;
}

export default function SimpleCameraController({
  targetPosition,
  targetObject,
  onAnimationComplete
}: SimpleCameraControllerProps) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);

  const animationRef = useRef<{
    active: boolean;
    startTime: number;
    duration: number;
    startPos: THREE.Vector3;
    endPos: THREE.Vector3;
    startTarget: THREE.Vector3;
    endTarget: THREE.Vector3;
  } | null>(null);

  // Handle target object changes
  useEffect(() => {
    if (!targetObject || !targetPosition) return;

    // Skip ground plane
    if (targetObject.name === 'Plane12847') return;

    // Skip if already animating to prevent conflicts
    if (animationRef.current?.active) return;

    // Get current camera and control positions
    const currentCameraPos = camera.position.clone();
    const currentTarget = controlsRef.current?.target?.clone() || new THREE.Vector3(0, 0, 0);

    // Calculate target bounds
    let targetCenter: THREE.Vector3;
    let objectSize = 1;

    if (targetObject instanceof THREE.Mesh && targetObject.geometry) {
      // Calculate mesh bounds
      targetObject.geometry.computeBoundingBox();
      const box = targetObject.geometry.boundingBox!.clone();
      box.applyMatrix4(targetObject.matrixWorld);
      targetCenter = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      objectSize = Math.max(size.x, size.y, size.z);
    } else {
      targetCenter = targetPosition.clone();
    }

    // Calculate camera position - fixed distance approach
    const baseDistance = 5;
    const scaleFactor = Math.min(objectSize * 0.5, 2);
    const distance = baseDistance + scaleFactor;

    // Keep similar angle to current camera for smooth transition
    const angle = Math.atan2(currentCameraPos.z - targetCenter.z, currentCameraPos.x - targetCenter.x);

    const finalCameraPos = new THREE.Vector3(
      targetCenter.x + Math.cos(angle) * distance,
      targetCenter.y + distance * 0.5,
      targetCenter.z + Math.sin(angle) * distance
    );

    // Ensure camera stays above ground
    if (finalCameraPos.y < 0.5) {
      finalCameraPos.y = 0.5;
    }

    // Start animation
    animationRef.current = {
      active: true,
      startTime: Date.now(),
      duration: 1200,
      startPos: currentCameraPos,
      endPos: finalCameraPos,
      startTarget: currentTarget,
      endTarget: targetCenter
    };

  }, [targetObject, targetPosition, camera]);

  // Animation frame
  useFrame(() => {
    if (!animationRef.current?.active || !controlsRef.current) return;

    const { startTime, duration, startPos, endPos, startTarget, endTarget } = animationRef.current;
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Smooth easing
    const t = progress < 0.5
      ? 2 * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 2) / 2;

    // Interpolate positions
    camera.position.lerpVectors(startPos, endPos, t);
    controlsRef.current.target.lerpVectors(startTarget, endTarget, t);
    controlsRef.current.update();

    // Complete animation
    if (progress >= 1) {
      animationRef.current.active = false;
      if (onAnimationComplete) onAnimationComplete();
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping={true}
      dampingFactor={0.25}
      rotateSpeed={0.7}
      zoomSpeed={1}
      panSpeed={0.5}
      minDistance={1}
      maxDistance={30}
      maxPolarAngle={Math.PI / 2 - 0.05}
    />
  );
}