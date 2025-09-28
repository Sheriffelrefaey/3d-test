'use client';

import { useRef, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitControls } from '@react-three/drei';

interface CinematicCameraControllerProps {
  targetPosition: THREE.Vector3 | null;
  targetObject: any | null;
  onAnimationComplete?: () => void;
  autoRotate?: boolean;
}

// Creative camera movement patterns
const CAMERA_PATTERNS = [
  'spiral', 'arc', 'swoop', 'orbit', 'dolly'
];

export default function CinematicCameraController({
  targetPosition,
  targetObject,
  onAnimationComplete,
  autoRotate = false
}: CinematicCameraControllerProps) {
  const { camera, gl } = useThree();
  const controlsRef = useRef<any>(null);
  const patternIndex = useRef(0);

  const animationRef = useRef<{
    active: boolean;
    startTime: number;
    duration: number;
    startPos: THREE.Vector3;
    endPos: THREE.Vector3;
    startTarget: THREE.Vector3;
    endTarget: THREE.Vector3;
    pattern: string;
    midPoint?: THREE.Vector3;
  } | null>(null);

  // Calculate creative camera path
  const calculateCreativePath = (
    start: THREE.Vector3,
    end: THREE.Vector3,
    target: THREE.Vector3,
    pattern: string
  ) => {
    const midPoint = new THREE.Vector3();

    switch (pattern) {
      case 'spiral':
        // Spiral approach
        const spiralAngle = Math.PI * 0.5;
        const spiralHeight = end.y + 3;
        midPoint.x = (start.x + end.x) / 2 + Math.cos(spiralAngle) * 3;
        midPoint.y = spiralHeight;
        midPoint.z = (start.z + end.z) / 2 + Math.sin(spiralAngle) * 3;
        break;

      case 'arc':
        // Smooth arc overhead
        midPoint.lerpVectors(start, end, 0.5);
        midPoint.y += 5;
        break;

      case 'swoop':
        // Dynamic swoop from above
        midPoint.copy(end);
        midPoint.y += 8;
        midPoint.x -= 2;
        break;

      case 'orbit':
        // Orbital approach
        const angle = Math.atan2(end.z - target.z, end.x - target.x);
        const orbitRadius = start.distanceTo(target);
        midPoint.x = target.x + Math.cos(angle + Math.PI/4) * orbitRadius;
        midPoint.y = end.y + 2;
        midPoint.z = target.z + Math.sin(angle + Math.PI/4) * orbitRadius;
        break;

      case 'dolly':
        // Straight dolly with slight elevation
        midPoint.lerpVectors(start, end, 0.5);
        midPoint.y += 1;
        break;
    }

    return midPoint;
  };

  // Handle target object changes with creative camera movements
  useEffect(() => {
    if (!targetObject || !targetPosition) return;
    if (targetObject.name === 'Plane12847') return;
    if (animationRef.current?.active) return;

    const currentCameraPos = camera.position.clone();
    const currentTarget = controlsRef.current?.target?.clone() || new THREE.Vector3(0, 0, 0);

    let targetCenter: THREE.Vector3;
    let objectSize = 1;

    if (targetObject instanceof THREE.Mesh && targetObject.geometry) {
      targetObject.geometry.computeBoundingBox();
      const box = targetObject.geometry.boundingBox!.clone();
      box.applyMatrix4(targetObject.matrixWorld);
      targetCenter = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      objectSize = Math.max(size.x, size.y, size.z);
    } else {
      targetCenter = targetPosition.clone();
    }

    // Dynamic camera distance based on object size
    const minDistance = 3;
    const maxDistance = 8;
    const distance = Math.min(maxDistance, Math.max(minDistance, objectSize * 2));

    // Creative camera angles
    const angleVariation = (Math.random() - 0.5) * Math.PI * 0.3; // Random variation
    const baseAngle = Math.atan2(currentCameraPos.z - targetCenter.z, currentCameraPos.x - targetCenter.x);
    const finalAngle = baseAngle + angleVariation;

    // Vary height for interest
    const heightVariation = 0.3 + Math.random() * 0.5; // Between 0.3 and 0.8

    const finalCameraPos = new THREE.Vector3(
      targetCenter.x + Math.cos(finalAngle) * distance,
      targetCenter.y + distance * heightVariation,
      targetCenter.z + Math.sin(finalAngle) * distance
    );

    // Ensure camera stays above ground
    finalCameraPos.y = Math.max(1, finalCameraPos.y);

    // Select pattern for this movement
    const pattern = CAMERA_PATTERNS[patternIndex.current % CAMERA_PATTERNS.length];
    patternIndex.current++;

    // Calculate mid-point for creative path
    const midPoint = calculateCreativePath(currentCameraPos, finalCameraPos, targetCenter, pattern);

    // Start animation with easing
    animationRef.current = {
      active: true,
      startTime: Date.now(),
      duration: 1800, // Slightly longer for smoother movement
      startPos: currentCameraPos,
      endPos: finalCameraPos,
      startTarget: currentTarget,
      endTarget: targetCenter,
      pattern: pattern,
      midPoint: midPoint
    };

  }, [targetObject, targetPosition, camera]);

  // Smooth animation with creative paths
  useFrame((state) => {
    // Auto-rotate drone mode
    if (autoRotate && controlsRef.current && !animationRef.current?.active) {
      const time = state.clock.getElapsedTime();
      const radius = 15;
      const height = 8;
      const speed = 0.2;

      camera.position.x = Math.sin(time * speed) * radius;
      camera.position.z = Math.cos(time * speed) * radius;
      camera.position.y = height + Math.sin(time * speed * 2) * 2; // Gentle vertical movement

      if (controlsRef.current?.target) {
        camera.lookAt(controlsRef.current.target);
      }
    }

    // Handle animation
    if (!animationRef.current?.active || !controlsRef.current) return;

    const { startTime, duration, startPos, endPos, startTarget, endTarget, pattern, midPoint } = animationRef.current;
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Smooth easing functions for cinematic feel
    let t = progress;
    if (pattern === 'swoop' || pattern === 'spiral') {
      // Ease in-out cubic for dramatic movements
      t = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;
    } else {
      // Ease in-out quad for smooth movements
      t = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;
    }

    // Three-point bezier curve for creative paths
    if (midPoint && progress < 0.9) {
      const t1 = 1 - t;
      camera.position.x = t1 * t1 * startPos.x + 2 * t1 * t * midPoint.x + t * t * endPos.x;
      camera.position.y = t1 * t1 * startPos.y + 2 * t1 * t * midPoint.y + t * t * endPos.y;
      camera.position.z = t1 * t1 * startPos.z + 2 * t1 * t * midPoint.z + t * t * endPos.z;
    } else {
      // Final approach - direct interpolation
      camera.position.lerpVectors(
        progress < 0.9 ? camera.position : startPos,
        endPos,
        progress < 0.9 ? t * 0.1 : t
      );
    }

    // Smooth target interpolation
    if (controlsRef.current?.target) {
      controlsRef.current.target.lerpVectors(startTarget, endTarget, t);
      controlsRef.current.update();
    }

    // Add subtle camera shake for cinematic feel
    if (pattern === 'swoop' && progress > 0.7 && progress < 0.95) {
      const shake = (1 - progress) * 0.02;
      camera.position.x += (Math.random() - 0.5) * shake;
      camera.position.y += (Math.random() - 0.5) * shake;
      camera.position.z += (Math.random() - 0.5) * shake;
    }

    // Complete animation
    if (progress >= 1) {
      animationRef.current.active = false;
      if (onAnimationComplete) onAnimationComplete();
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      args={[camera, gl.domElement]}
      enableDamping={true}
      dampingFactor={0.08} // Very smooth damping
      rotateSpeed={0.8}
      zoomSpeed={1.2}
      panSpeed={0.6}
      minDistance={2}
      maxDistance={25}
      maxPolarAngle={Math.PI / 2 - 0.05}
      autoRotate={false} // We handle auto-rotate manually for better control
      autoRotateSpeed={0}
    />
  );
}