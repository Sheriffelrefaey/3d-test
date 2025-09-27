'use client';

import { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Line } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { Annotation } from '@/types';

interface HUDAnnotationProps {
  annotation: Annotation | null;
  worldPosition: THREE.Vector3 | null;
  onClose: () => void;
  isVisible: boolean;
}

// 2D HUD Component for the annotation card
export function HUDAnnotationCard({ annotation, screenPosition, onClose, isVisible }: {
  annotation: Annotation | null;
  screenPosition: { x: number; y: number } | null;
  onClose: () => void;
  isVisible: boolean;
}) {
  if (!annotation || !screenPosition || !isVisible) return null;

  // Position card above the object, centered horizontally with bounds checking
  const cardWidth = 350;
  const cardHeight = 200;
  const margin = 20;

  // Calculate initial position (centered above object)
  let cardX = screenPosition.x - cardWidth / 2;
  let cardY = screenPosition.y - cardHeight - 100; // Position above with spacing

  // Bounds checking to keep card within viewport
  if (cardX < margin) cardX = margin;
  if (cardX + cardWidth > window.innerWidth - margin) {
    cardX = window.innerWidth - cardWidth - margin;
  }
  if (cardY < margin) cardY = margin;
  if (cardY + cardHeight > window.innerHeight - margin) {
    cardY = window.innerHeight - cardHeight - margin;
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          style={{
            position: 'fixed',
            left: `${cardX}px`,
            top: `${cardY}px`,
            zIndex: 1000,
          }}
          className="pointer-events-none"
        >
          {/* Connection Line from top of object to bottom of card */}
          <svg
            style={{
              position: 'absolute',
              left: '50%',
              bottom: '-100px', // Line starts from bottom of card
              transform: 'translateX(-50%)',
              width: '2px',
              height: '100px',
              overflow: 'visible',
              pointerEvents: 'none'
            }}
          >
            <defs>
              <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="rgba(59, 130, 246, 1)" />
                <stop offset="100%" stopColor="rgba(59, 130, 246, 0.3)" />
              </linearGradient>
            </defs>
            <motion.line
              x1="1"
              y1="0"
              x2="1"
              y2="100"
              stroke="url(#lineGradient)"
              strokeWidth="2"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
            <motion.circle
              cx="1"
              cy="100"
              r="4"
              fill="rgba(59, 130, 246, 1)"
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.5, 1] }}
              transition={{ duration: 0.5, delay: 0.4, ease: "easeOut" }}
            />
          </svg>

          {/* HUD Card */}
          <motion.div
            className="relative bg-gray-900/90 backdrop-blur-md rounded-lg border border-blue-500/50 shadow-2xl overflow-hidden pointer-events-auto"
            style={{
              width: '350px',
              minHeight: '180px',
              boxShadow: '0 0 30px rgba(59, 130, 246, 0.3), inset 0 0 20px rgba(59, 130, 246, 0.1)'
            }}
          >
            {/* Animated border glow */}
            <motion.div
              className="absolute inset-0 rounded-lg"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.5), transparent)',
                pointerEvents: 'none'
              }}
              animate={{
                x: ['-100%', '100%']
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "linear"
              }}
            />

            {/* Top accent lines */}
            <div className="relative">
              <motion.div
                className="h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              />

              {/* Header */}
              <div className="px-4 py-3 bg-blue-950/50 border-b border-blue-500/30">
                <div className="flex items-center justify-between">
                  <motion.h3
                    className="text-blue-100 font-bold text-sm uppercase tracking-wider"
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.3, delay: 0.3 }}
                  >
                    {annotation.title || annotation.object_name || 'Object Details'}
                  </motion.h3>
                  <motion.button
                    onClick={onClose}
                    className="text-blue-400 hover:text-blue-200 transition-colors p-1"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </motion.button>
                </div>
              </div>

              {/* Content */}
              <div className="p-4 space-y-3">
                {annotation.object_name && (
                  <motion.div
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.3, delay: 0.4 }}
                  >
                    <label className="text-xs text-blue-400 uppercase tracking-wider">Component</label>
                    <p className="text-sm text-gray-100 mt-1 font-mono">{annotation.object_name}</p>
                  </motion.div>
                )}

                {annotation.description && (
                  <motion.div
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.3, delay: 0.5 }}
                  >
                    <label className="text-xs text-blue-400 uppercase tracking-wider">Details</label>
                    <p className="text-sm text-gray-200 mt-1 leading-relaxed">{annotation.description}</p>
                  </motion.div>
                )}

                {/* Position Info */}
                <motion.div
                  className="pt-2 border-t border-blue-500/20"
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.6 }}
                >
                  <label className="text-xs text-blue-400 uppercase tracking-wider">Coordinates</label>
                  <div className="flex gap-3 mt-1">
                    <span className="text-xs font-mono text-gray-400">
                      X: <span className="text-blue-300">{annotation.position_x.toFixed(2)}</span>
                    </span>
                    <span className="text-xs font-mono text-gray-400">
                      Y: <span className="text-blue-300">{annotation.position_y.toFixed(2)}</span>
                    </span>
                    <span className="text-xs font-mono text-gray-400">
                      Z: <span className="text-blue-300">{annotation.position_z.toFixed(2)}</span>
                    </span>
                  </div>
                </motion.div>
              </div>

              {/* Bottom accent */}
              <motion.div
                className="h-0.5 bg-gradient-to-r from-transparent via-blue-500 to-transparent"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.5, delay: 0.7 }}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// 3D Glow Effect Component for selected objects
export function ObjectGlowEffect({ mesh, isActive }: { mesh: THREE.Mesh | null; isActive: boolean }) {
  const glowRef = useRef<THREE.Mesh>(null);
  const [glowIntensity, setGlowIntensity] = useState(0);

  useFrame(({ clock }) => {
    if (glowRef.current && isActive) {
      // Pulsing glow effect
      const pulse = Math.sin(clock.getElapsedTime() * 2) * 0.5 + 0.5;
      glowRef.current.material.emissiveIntensity = 0.3 + pulse * 0.3;
      glowRef.current.material.opacity = 0.3 + pulse * 0.2;
    }
  });

  useEffect(() => {
    if (isActive) {
      setGlowIntensity(1);
    } else {
      setGlowIntensity(0);
    }
  }, [isActive]);

  if (!mesh || !isActive) return null;

  return (
    <mesh
      ref={glowRef}
      geometry={mesh.geometry}
      position={mesh.position}
      rotation={mesh.rotation}
      scale={mesh.scale}
    >
      <meshStandardMaterial
        color="#3b82f6"
        emissive="#3b82f6"
        emissiveIntensity={glowIntensity}
        transparent
        opacity={0.5}
        side={THREE.FrontSide}
      />
    </mesh>
  );
}

// 3D Connection Line Component
export function ConnectionLine({ startPos, endPos, isVisible }: {
  startPos: THREE.Vector3 | null;
  endPos: THREE.Vector3 | null;
  isVisible: boolean;
}) {
  const [lineProgress, setLineProgress] = useState(0);

  useFrame(() => {
    if (isVisible && lineProgress < 1) {
      setLineProgress(prev => Math.min(prev + 0.05, 1));
    } else if (!isVisible && lineProgress > 0) {
      setLineProgress(prev => Math.max(prev - 0.05, 0));
    }
  });

  if (!startPos || !endPos || lineProgress === 0) return null;

  // Calculate intermediate points for curved line
  const midPoint = new THREE.Vector3().lerpVectors(startPos, endPos, 0.5);
  midPoint.y += 0.5; // Add curve

  const currentEnd = new THREE.Vector3().lerpVectors(startPos, endPos, lineProgress);

  return (
    <>
      <Line
        points={[startPos, currentEnd]}
        color="#3b82f6"
        lineWidth={2}
        transparent
        opacity={0.8 * lineProgress}
      />
      {/* End point indicator */}
      {lineProgress > 0.9 && (
        <mesh position={endPos}>
          <sphereGeometry args={[0.05, 16, 16]} />
          <meshStandardMaterial
            color="#3b82f6"
            emissive="#3b82f6"
            emissiveIntensity={1}
          />
        </mesh>
      )}
    </>
  );
}

// Main HUD Annotation System
export default function HUDAnnotation({ annotation, worldPosition, onClose, isVisible }: HUDAnnotationProps) {
  const { camera, gl } = useThree();
  const [screenPosition, setScreenPosition] = useState<{ x: number; y: number } | null>(null);

  useFrame(() => {
    if (worldPosition && isVisible) {
      // Convert 3D world position to 2D screen position
      const vector = worldPosition.clone();
      vector.project(camera);

      const x = (vector.x * 0.5 + 0.5) * gl.domElement.clientWidth;
      const y = (-vector.y * 0.5 + 0.5) * gl.domElement.clientHeight;

      setScreenPosition({ x, y });
    }
  });

  return (
    <>
      {/* 3D Elements are handled separately in the main component */}
      {/* This component focuses on the HUD overlay */}
    </>
  );
}