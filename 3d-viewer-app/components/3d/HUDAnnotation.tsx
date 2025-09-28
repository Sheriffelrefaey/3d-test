'use client';

import { useRef, useEffect, useState, useMemo } from 'react';
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

// Enhanced Typewriter with high-quality rendering
function TypewriterText({ text }: { text: string }) {
  const [displayText, setDisplayText] = useState('');

  useEffect(() => {
    setDisplayText('');
    let index = 0;
    const interval = setInterval(() => {
      if (index <= text.length) {
        setDisplayText(text.slice(0, index));
        index++;
      } else {
        clearInterval(interval);
      }
    }, 12); // Smoother at 12ms per character

    return () => clearInterval(interval);
  }, [text]);

  return (
    <span style={{
      textRendering: 'optimizeLegibility',
      WebkitFontSmoothing: 'antialiased',
      MozOsxFontSmoothing: 'grayscale'
    }}>
      {displayText}
      {displayText.length < text.length && (
        <span className="opacity-50 animate-pulse">|</span>
      )}
    </span>
  );
}

// Enhanced Futuristic White HUD Component
export function HUDAnnotationCard({ annotation, screenPosition, onClose, isVisible }: {
  annotation: Annotation | null;
  screenPosition: { x: number; y: number } | null;
  onClose: () => void;
  isVisible: boolean;
}) {
  const [showText, setShowText] = useState(false);
  const [titleText, setTitleText] = useState('');
  const [descText, setDescText] = useState('');

  useEffect(() => {
    if (isVisible && annotation) {
      // Reset states for animation on every change
      setShowText(false);
      setTitleText('');
      setDescText('');

      // Delay text reveal after lines animation
      const textTimer = setTimeout(() => {
        setShowText(true);

        // Smooth text reveal for title - only show if there's actual content
        const title = annotation.title || annotation.object_name || '';
        if (!title && !annotation.description) {
          // No content to show - skip animation
          return;
        }
        let titleIndex = 0;
        const titleInterval = setInterval(() => {
          if (titleIndex <= title.length) {
            setTitleText(title.slice(0, titleIndex));
            titleIndex++;
          } else {
            clearInterval(titleInterval);
          }
        }, 30);

        // Smooth text reveal for description
        if (annotation.description) {
          const desc = annotation.description;
          let descIndex = 0;
          const descInterval = setInterval(() => {
            if (descIndex <= desc.length) {
              setDescText(desc.slice(0, descIndex));
              descIndex++;
            } else {
              clearInterval(descInterval);
            }
          }, 15);
          return () => clearInterval(descInterval);
        }

        return () => clearInterval(titleInterval);
      }, 600);

      return () => clearTimeout(textTimer);
    }
  }, [isVisible, annotation?.id]); // Trigger on annotation ID change

  if (!annotation || !isVisible) return null;

  // Don't show HUD card if there's no actual annotation content
  if (!annotation.title && !annotation.description) {
    return null;
  }

  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          style={{
            position: 'fixed',
            right: '30px',
            bottom: '30px',
            zIndex: 1000,
            width: '380px'
          }}
          className="pointer-events-auto"
        >
          {/* Animated glowing lines container */}
          <div className="relative">
            {/* Top glowing line base */}
            <motion.div
              key={`top-${annotation?.id}`}
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{
                scaleX: [0, 1.05, 1],
                opacity: [0, 1, 0.8],
              }}
              transition={{
                duration: 0.7,
                times: [0, 0.7, 1],
                ease: "easeOut"
              }}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '2px',
                background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.9) 10%, rgba(255, 255, 255, 0.9) 90%, transparent 100%)',
                transformOrigin: 'left',
                boxShadow: '0 0 15px rgba(255, 255, 255, 0.5), 0 0 30px rgba(255, 255, 255, 0.3)',
                zIndex: 2
              }}
            />

            {/* Moving light beam on top line - travels left to right */}
            <motion.div
              key={`top-beam-${annotation?.id}`}
              initial={{ x: '-30%', opacity: 0 }}
              animate={{
                x: ['0%', '100%'],
                opacity: [0, 1, 1, 0],
              }}
              transition={{
                duration: 0.8,
                times: [0, 0.1, 0.9, 1],
                ease: "linear",
                delay: 0.3
              }}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '2px',
                overflow: 'hidden',
                zIndex: 3
              }}
            >
              <div
                style={{
                  width: '30%',
                  height: '100%',
                  background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 1), rgba(255, 255, 255, 1), transparent)',
                  boxShadow: '0 0 20px rgba(255, 255, 255, 1), 0 0 40px rgba(255, 255, 255, 0.7)',
                  filter: 'blur(0.5px)'
                }}
              />
            </motion.div>

            {/* Bottom glowing line base */}
            <motion.div
              key={`bottom-${annotation?.id}`}
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{
                scaleX: [0, 1.05, 1],
                opacity: [0, 1, 0.8],
              }}
              transition={{
                duration: 0.7,
                times: [0, 0.7, 1],
                ease: "easeOut",
                delay: 0.1
              }}
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '2px',
                background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.9) 10%, rgba(255, 255, 255, 0.9) 90%, transparent 100%)',
                transformOrigin: 'right',
                boxShadow: '0 0 15px rgba(255, 255, 255, 0.5), 0 0 30px rgba(255, 255, 255, 0.3)',
                zIndex: 2
              }}
            />

            {/* Moving light beam on bottom line - travels right to left */}
            <motion.div
              key={`bottom-beam-${annotation?.id}`}
              initial={{ x: '100%', opacity: 0 }}
              animate={{
                x: ['70%', '-30%'],
                opacity: [0, 1, 1, 0],
              }}
              transition={{
                duration: 0.8,
                times: [0, 0.1, 0.9, 1],
                ease: "linear",
                delay: 0.4
              }}
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '2px',
                overflow: 'hidden',
                zIndex: 3
              }}
            >
              <div
                style={{
                  width: '30%',
                  height: '100%',
                  marginLeft: 'auto',
                  background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 1), rgba(255, 255, 255, 1), transparent)',
                  boxShadow: '0 0 20px rgba(255, 255, 255, 1), 0 0 40px rgba(255, 255, 255, 0.7)',
                  filter: 'blur(0.5px)'
                }}
              />
            </motion.div>

            {/* Flash effect overlay */}
            <motion.div
              key={`flash-${annotation?.id}`}
              initial={{ opacity: 0 }}
              animate={{
                opacity: [0, 0.4, 0, 0.3, 0],
              }}
              transition={{
                duration: 0.8,
                times: [0, 0.2, 0.4, 0.6, 1],
              }}
              style={{
                position: 'absolute',
                inset: 0,
                background: 'radial-gradient(circle, rgba(255, 255, 255, 0.6), transparent)',
                pointerEvents: 'none'
              }}
            />

            {/* Main HUD Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              style={{
                background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.4) 0%, rgba(10, 10, 10, 0.5) 100%)',
                backdropFilter: 'blur(30px) saturate(180%)',
                WebkitBackdropFilter: 'blur(30px) saturate(180%)',
                borderRadius: '4px',
                borderTop: '1px solid rgba(255, 255, 255, 0.2)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
                borderLeft: 'none',
                borderRight: 'none',
                padding: '20px 24px',
                boxShadow: `
                  0 0 80px rgba(255, 255, 255, 0.1),
                  0 0 160px rgba(255, 255, 255, 0.05),
                  0 10px 40px rgba(0, 0, 0, 0.6),
                  inset 0 1px 0 rgba(255, 255, 255, 0.15)
                `,
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* Shimmer effect overlay */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: `linear-gradient(
                    105deg,
                    transparent 40%,
                    rgba(255, 255, 255, 0.1) 50%,
                    transparent 60%
                  )`,
                  animation: 'shimmer 3s infinite'
                }}
              />

              <style jsx>{`
                @keyframes shimmer {
                  0% { transform: translateX(-100%); }
                  100% { transform: translateX(200%); }
                }
                @keyframes textGlow {
                  0%, 100% {
                    textShadow:
                      0 0 40px rgba(255, 255, 255, 0.4),
                      0 0 80px rgba(255, 255, 255, 0.2),
                      0 0 120px rgba(255, 255, 255, 0.1);
                  }
                  50% {
                    textShadow:
                      0 0 50px rgba(255, 255, 255, 0.5),
                      0 0 90px rgba(255, 255, 255, 0.25),
                      0 0 130px rgba(255, 255, 255, 0.15);
                  }
                }
                @font-face {
                  font-family: 'MocFont';
                  src: url('/fonts/moc-font.otf') format('opentype');
                  font-weight: normal;
                  font-style: normal;
                  font-display: swap;
                }
              `}</style>

              <div className="relative z-10" style={{
                direction: 'rtl',
                textAlign: 'right',
                fontFamily: "'MocFont', Arial, sans-serif"
              }}>
                <motion.h3
                  initial={{ opacity: 0, filter: 'blur(10px)' }}
                  animate={{
                    opacity: showText ? 1 : 0,
                    filter: showText ? 'blur(0px)' : 'blur(10px)'
                  }}
                  transition={{ duration: 0.5 }}
                  className="text-white font-bold mb-3 leading-tight"
                  style={{
                    fontSize: '26px',
                    textShadow: `
                      0 0 40px rgba(255, 255, 255, 0.4),
                      0 0 80px rgba(255, 255, 255, 0.2),
                      0 0 120px rgba(255, 255, 255, 0.1),
                      0 2px 4px rgba(0, 0, 0, 0.8)
                    `,
                    animation: 'textGlow 2s ease-in-out infinite',
                    letterSpacing: '0.5px',
                    filter: 'blur(0.2px)',
                    direction: 'rtl',
                    unicodeBidi: 'embed'
                  }}
                >
                  {titleText}
                  {showText && titleText.length < (annotation.title || annotation.object_name || 'Object').length && (
                    <span className="opacity-50">|</span>
                  )}
                </motion.h3>
                {annotation.description && (
                  <motion.p
                    initial={{ opacity: 0, filter: 'blur(10px)' }}
                    animate={{
                      opacity: showText ? 0.95 : 0,
                      filter: showText ? 'blur(0px)' : 'blur(10px)'
                    }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="text-gray-200 leading-relaxed"
                    style={{
                      fontSize: '18px',
                      textShadow: `
                        0 0 30px rgba(255, 255, 255, 0.25),
                        0 0 60px rgba(255, 255, 255, 0.1),
                        0 2px 10px rgba(0, 0, 0, 0.8)
                      `,
                      letterSpacing: '0.3px',
                      filter: 'blur(0.1px)',
                      direction: 'rtl',
                      unicodeBidi: 'embed',
                      lineHeight: '1.7'
                    }}
                  >
                    {descText}
                    {showText && descText.length < annotation.description.length && (
                      <span className="opacity-30">|</span>
                    )}
                  </motion.p>
                )}
              </div>
            </motion.div>
          </div>
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
      // Smoother pulsing glow effect
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