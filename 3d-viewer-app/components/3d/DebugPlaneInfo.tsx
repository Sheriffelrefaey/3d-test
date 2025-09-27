'use client';

import React, { useEffect, useState } from 'react';
import * as THREE from 'three';

// This component should be used OUTSIDE of Canvas
export default function DebugPlaneInfo({ scene }: { scene?: THREE.Scene }) {
  const [planeInfo, setPlaneInfo] = useState<any[]>([]);

  useEffect(() => {
    if (!scene) return;

    const planes: any[] = [];
    let lowestMesh: { name: string; y: number; } | null = null;

    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        // Get world position
        const worldPos = new THREE.Vector3();
        child.getWorldPosition(worldPos);

        // Track the lowest mesh
        if (!lowestMesh || worldPos.y < lowestMesh.y) {
          lowestMesh = {
            name: child.name || 'Unnamed',
            y: worldPos.y
          };
        }

        // Find plane-like objects (flat in one dimension)
        const geometry = child.geometry;
        if (geometry) {
          geometry.computeBoundingBox();
          const box = geometry.boundingBox;
          if (box) {
            const size = new THREE.Vector3();
            box.getSize(size);

            // Check if it's flat (one dimension is very small compared to others)
            const isFlat = size.x < 0.5 || size.y < 0.5 || size.z < 0.5;

            // Check name patterns
            const hasPlaneInName = child.name.toLowerCase().includes('plane') ||
                                  child.name.toLowerCase().includes('floor') ||
                                  child.name.toLowerCase().includes('ground') ||
                                  child.name.toLowerCase().includes('modelplane');

            if (isFlat || hasPlaneInName || worldPos.y < 0) {
              planes.push({
                name: child.name || 'Unnamed',
                position: { x: worldPos.x, y: worldPos.y, z: worldPos.z },
                size: { x: size.x, y: size.y, z: size.z },
                visible: child.visible,
                isFlat,
                hasPlaneInName,
                isBelowOrigin: worldPos.y < 0,
                userData: child.userData,
                uuid: child.uuid
              });
            }
          }
        }
      }
    });

    planes.sort((a, b) => a.position.y - b.position.y);

    console.log('=== PLANE DEBUG INFO ===');
    console.log('Found planes:', planes);
    console.log('Lowest mesh:', lowestMesh);
    console.log('========================');

    setPlaneInfo(planes);

    // Return the lowest plane name to parent if needed
    if (planes.length > 0) {
      console.log('Lowest plane-like object:', planes[0].name);
      // Make it selectable by adding to window for testing
      (window as any).__debugLowestPlane = planes[0].name;
    }
  }, [scene]);

  // Debug overlay - this is normal React JSX
  return (
    <div style={{
      position: 'fixed',
      bottom: '10px',
      right: '10px',
      background: 'rgba(0,0,0,0.8)',
      color: 'white',
      padding: '10px',
      fontSize: '10px',
      maxWidth: '300px',
      maxHeight: '200px',
      overflow: 'auto',
      pointerEvents: 'none',
      fontFamily: 'monospace',
      zIndex: 9999
    }}>
      <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Plane Objects:</div>
      {planeInfo.map((plane, i) => (
        <div key={i} style={{ marginBottom: '5px', borderBottom: '1px solid #333', paddingBottom: '3px' }}>
          <div>Name: {plane.name}</div>
          <div>Y: {plane.position.y.toFixed(3)}</div>
          <div>Visible: {plane.visible ? 'Yes' : 'No'}</div>
          {plane.isBelowOrigin && <div style={{color: 'yellow'}}>⚠️ Below origin</div>}
        </div>
      ))}
    </div>
  );
}