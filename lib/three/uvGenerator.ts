import * as THREE from 'three';

/**
 * Generate UV coordinates for a geometry that doesn't have them
 * Uses different algorithms based on geometry type
 */
export function generateUVs(geometry: THREE.BufferGeometry): void {
  // Check if UVs already exist
  if (geometry.attributes['uv'] as THREE.BufferAttribute) {
    return;
  }

  const position = geometry.attributes['position'] as THREE.BufferAttribute;
  if (!position) {
    console.warn('Geometry has no position attribute');
    return;
  }
  const uvs = [];

  // Get bounding box for normalization
  geometry.computeBoundingBox();
  const bbox = geometry.boundingBox!;
  const size = new THREE.Vector3();
  bbox.getSize(size);

  // Check if this is an indexed geometry
  const isIndexed = geometry.index !== null;

  if (isIndexed) {
    // For indexed geometries, generate UVs based on vertex positions
    const vertexCount = position.count;

    for (let i = 0; i < vertexCount; i++) {
      const x = position.getX(i);
      const y = position.getY(i);
      // const z = position.getZ(i); // Unused in current implementation

      // Project to 2D using the most appropriate plane based on geometry orientation
      // We'll use a box projection approach
      let u = 0, v = 0;

      // Determine the dominant axis for this vertex (variables unused but kept for clarity)
      // const nx = Math.abs(x - bbox.min.x) / size.x;
      // const ny = Math.abs(y - bbox.min.y) / size.y;
      // const nz = Math.abs(z - bbox.min.z) / size.z;

      // Use XY plane projection (looking down Z axis)
      u = (x - bbox.min.x) / size.x;
      v = (y - bbox.min.y) / size.y;

      uvs.push(u, v);
    }
  } else {
    // For non-indexed geometries (like triangulated meshes)
    const faceCount = position.count / 3;

    for (let face = 0; face < faceCount; face++) {
      for (let vertex = 0; vertex < 3; vertex++) {
        const index = face * 3 + vertex;
        const x = position.getX(index);
        const y = position.getY(index);
        // const z = position.getZ(index); // Unused in planar projection

        // Calculate UV based on position
        // Using planar projection
        const u = (x - bbox.min.x) / size.x;
        const v = (y - bbox.min.y) / size.y;

        uvs.push(u, v);
      }
    }
  }

  // Set the UV attribute
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  const uvAttr = geometry.attributes['uv'] as THREE.BufferAttribute;
  if (uvAttr) {
    uvAttr.needsUpdate = true;
  }
}

/**
 * Generate spherical UV coordinates
 * Better for round/curved objects
 */
export function generateSphericalUVs(geometry: THREE.BufferGeometry): void {
  if (geometry.attributes['uv'] as THREE.BufferAttribute) {
    return;
  }

  const position = geometry.attributes['position'] as THREE.BufferAttribute;
  if (!position) {
    console.warn('Geometry has no position attribute');
    return;
  }
  const uvs = [];

  // Get center of geometry
  geometry.computeBoundingSphere();
  const center = geometry.boundingSphere!.center;
  const radius = geometry.boundingSphere!.radius;

  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);

    // Convert to spherical coordinates
    const dx = x - center.x;
    const dy = y - center.y;
    const dz = z - center.z;

    const theta = Math.atan2(dx, dz);
    const phi = Math.asin(dy / radius);

    const u = (theta + Math.PI) / (2 * Math.PI);
    const v = (phi + Math.PI / 2) / Math.PI;

    uvs.push(u, v);
  }

  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  const uvAttr = geometry.attributes['uv'] as THREE.BufferAttribute;
  if (uvAttr) {
    uvAttr.needsUpdate = true;
  }
}

/**
 * Generate box/cube UV coordinates
 * Projects each face onto a 2D plane
 */
export function generateBoxUVs(geometry: THREE.BufferGeometry): void {
  if (geometry.attributes['uv'] as THREE.BufferAttribute) {
    return;
  }

  const position = geometry.attributes['position'] as THREE.BufferAttribute;
  const normal = geometry.attributes['normal'] as THREE.BufferAttribute;

  if (!position) {
    console.warn('Geometry has no position attribute');
    return;
  }
  const uvs = [];

  if (!normal) {
    geometry.computeVertexNormals();
  }

  geometry.computeBoundingBox();
  const bbox = geometry.boundingBox!;
  const size = new THREE.Vector3();
  bbox.getSize(size);

  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);

    // Get the normal to determine which face this vertex belongs to
    const nx = normal ? normal.getX(i) : 0;
    const ny = normal ? normal.getY(i) : 1;
    const nz = normal ? normal.getZ(i) : 0;

    let u = 0, v = 0;

    // Determine dominant axis from normal
    const absNx = Math.abs(nx);
    const absNy = Math.abs(ny);
    const absNz = Math.abs(nz);

    if (absNx >= absNy && absNx >= absNz) {
      // X-facing: use YZ plane
      u = (z - bbox.min.z) / size.z;
      v = (y - bbox.min.y) / size.y;
    } else if (absNy >= absNx && absNy >= absNz) {
      // Y-facing: use XZ plane
      u = (x - bbox.min.x) / size.x;
      v = (z - bbox.min.z) / size.z;
    } else {
      // Z-facing: use XY plane
      u = (x - bbox.min.x) / size.x;
      v = (y - bbox.min.y) / size.y;
    }

    uvs.push(u, v);
  }

  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  const uvAttr = geometry.attributes['uv'] as THREE.BufferAttribute;
  if (uvAttr) {
    uvAttr.needsUpdate = true;
  }
}

/**
 * Automatically choose the best UV generation method based on geometry characteristics
 */
export function autoGenerateUVs(geometry: THREE.BufferGeometry, meshName?: string): void {
  if (geometry.attributes['uv'] as THREE.BufferAttribute) {
    return;
  }

  console.warn(`Generating UV coordinates for mesh: ${meshName || 'unnamed'}`);

  // Analyze geometry to determine best UV mapping method
  geometry.computeBoundingSphere();
  geometry.computeBoundingBox();

  const sphere = geometry.boundingSphere!;
  const box = geometry.boundingBox!;
  const size = new THREE.Vector3();
  box.getSize(size);

  // Calculate aspect ratios to determine shape
  const aspectRatios = [
    size.x / size.y,
    size.x / size.z,
    size.y / size.z
  ];

  // Check if it's roughly spherical
  const sphereVolume = (4/3) * Math.PI * Math.pow(sphere.radius, 3);
  const boxVolume = size.x * size.y * size.z;
  const sphericalRatio = sphereVolume / boxVolume;

  // Determine best UV mapping method
  if (sphericalRatio > 0.5 && sphericalRatio < 2) {
    // Roughly spherical
    console.warn(`Using spherical UV mapping for ${meshName}`);
    generateSphericalUVs(geometry);
  } else if (Math.max(...aspectRatios) > 3) {
    // Very elongated, use planar projection
    console.warn(`Using planar UV mapping for ${meshName}`);
    generateUVs(geometry);
  } else {
    // Default to box mapping for most objects
    console.warn(`Using box UV mapping for ${meshName}`);
    generateBoxUVs(geometry);
  }

  console.warn(`UV coordinates generated successfully for ${meshName}`);
}