'use client';

import { useRef, useState } from 'react';
import { Html } from '@react-three/drei';
import type { Mesh } from 'three';
import { Vector3 } from 'three';
import type { Annotation } from '@/types';

interface AnnotationMarkerProps {
  annotation: Annotation;
  onClick?: (annotation: Annotation) => void;
}

export default function AnnotationMarker({ annotation, onClick }: AnnotationMarkerProps) {
  const meshRef = useRef<Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const [_selected, setSelected] = useState(false);

  const handleClick = () => {
    setSelected(!_selected);
    onClick?.(annotation);
  };

  return (
    <group position={new Vector3(annotation.position.x, annotation.position.y, annotation.position.z)}>
      <mesh
        ref={meshRef}
        onClick={handleClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial
          color={annotation.color || '#FF0000'}
          emissive={annotation.color || '#FF0000'}
          emissiveIntensity={hovered ? 0.5 : 0.2}
        />
      </mesh>

      {(hovered || _selected) && (
        <Html
          position={[0, 0.3, 0]}
          center
          distanceFactor={8}
          style={{
            transition: 'all 0.2s',
            opacity: hovered || _selected ? 1 : 0,
            pointerEvents: 'none',
          }}
        >
          <div className="bg-white rounded-lg shadow-lg p-3 min-w-[200px] max-w-[300px]">
            <h3 className="font-bold text-sm mb-1">{annotation.title}</h3>
            {annotation.description && (
              <p className="text-xs text-gray-600">{annotation.description}</p>
            )}
          </div>
        </Html>
      )}
    </group>
  );
}