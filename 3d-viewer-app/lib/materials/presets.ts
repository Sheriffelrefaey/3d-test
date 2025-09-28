import type { MaterialPreset, ObjectMaterial, Color } from '@/types';

// Default color values
const white: Color = { r: 255, g: 255, b: 255, a: 1 };
const black: Color = { r: 0, g: 0, b: 0, a: 1 };

// Material preset definitions
export const materialPresets: Record<MaterialPreset, Partial<ObjectMaterial>> = {
  custom: {
    material_type: 'custom',
    preset_name: 'custom',
    color: white,
    properties: {
      metalness: 0,
      roughness: 0.5,
      opacity: 1,
      emissive: black,
      emissiveIntensity: 0,
    }
  },

  glass: {
    material_type: 'preset',
    preset_name: 'glass',
    color: { r: 240, g: 248, b: 255, a: 0.1 }, // Light blue tint
    properties: {
      metalness: 0,
      roughness: 0,
      opacity: 0.1,
      emissive: black,
      emissiveIntensity: 0,
      transmission: 1,
      thickness: 0.5,
      ior: 1.5, // Glass index of refraction
      reflectivity: 0.9,
    }
  },

  marble: {
    material_type: 'preset',
    preset_name: 'marble',
    color: { r: 248, g: 248, b: 248, a: 1 }, // Off-white
    texture_url: '/textures/marble_diffuse.jpg',
    properties: {
      metalness: 0,
      roughness: 0.2,
      opacity: 1,
      emissive: black,
      emissiveIntensity: 0,
      reflectivity: 0.3,
    }
  },

  wood: {
    material_type: 'preset',
    preset_name: 'wood',
    color: { r: 139, g: 69, b: 19, a: 1 }, // Saddle brown
    texture_url: '/textures/wood_diffuse.jpg',
    properties: {
      metalness: 0,
      roughness: 0.8,
      opacity: 1,
      emissive: black,
      emissiveIntensity: 0,
    }
  },

  concrete: {
    material_type: 'preset',
    preset_name: 'concrete',
    color: { r: 156, g: 156, b: 156, a: 1 }, // Gray
    texture_url: '/textures/concrete_diffuse.jpg',
    properties: {
      metalness: 0,
      roughness: 0.95,
      opacity: 1,
      emissive: black,
      emissiveIntensity: 0,
    }
  },

  metal: {
    material_type: 'preset',
    preset_name: 'metal',
    color: { r: 192, g: 192, b: 192, a: 1 }, // Silver
    properties: {
      metalness: 1,
      roughness: 0.2,
      opacity: 1,
      emissive: black,
      emissiveIntensity: 0,
      reflectivity: 1,
    }
  },

  gold: {
    material_type: 'preset',
    preset_name: 'gold',
    color: { r: 255, g: 215, b: 0, a: 1 }, // Gold
    properties: {
      metalness: 1,
      roughness: 0.1,
      opacity: 1,
      emissive: { r: 255, g: 215, b: 0, a: 1 },
      emissiveIntensity: 0.1,
      reflectivity: 1,
    }
  },

  silver: {
    material_type: 'preset',
    preset_name: 'silver',
    color: { r: 192, g: 192, b: 192, a: 1 }, // Silver
    properties: {
      metalness: 1,
      roughness: 0.05,
      opacity: 1,
      emissive: black,
      emissiveIntensity: 0,
      reflectivity: 1,
    }
  },

  copper: {
    material_type: 'preset',
    preset_name: 'copper',
    color: { r: 184, g: 115, b: 51, a: 1 }, // Copper
    properties: {
      metalness: 1,
      roughness: 0.25,
      opacity: 1,
      emissive: { r: 184, g: 115, b: 51, a: 1 },
      emissiveIntensity: 0.05,
      reflectivity: 0.95,
    }
  },

  fabric: {
    material_type: 'preset',
    preset_name: 'fabric',
    color: { r: 100, g: 100, b: 200, a: 1 }, // Blue fabric
    texture_url: '/textures/fabric_diffuse.jpg',
    properties: {
      metalness: 0,
      roughness: 0.9,
      opacity: 1,
      emissive: black,
      emissiveIntensity: 0,
    }
  },

  plastic: {
    material_type: 'preset',
    preset_name: 'plastic',
    color: { r: 255, g: 0, b: 0, a: 1 }, // Red plastic
    properties: {
      metalness: 0,
      roughness: 0.3,
      opacity: 1,
      emissive: black,
      emissiveIntensity: 0,
      clearcoat: 1,
      clearcoatRoughness: 0.1,
    }
  },

  stone: {
    material_type: 'preset',
    preset_name: 'stone',
    color: { r: 139, g: 137, b: 137, a: 1 }, // Dark gray
    texture_url: '/textures/stone_diffuse.jpg',
    properties: {
      metalness: 0,
      roughness: 0.85,
      opacity: 1,
      emissive: black,
      emissiveIntensity: 0,
    }
  },

  ceramic: {
    material_type: 'preset',
    preset_name: 'ceramic',
    color: { r: 245, g: 245, b: 245, a: 1 }, // Off-white
    properties: {
      metalness: 0,
      roughness: 0.1,
      opacity: 1,
      emissive: black,
      emissiveIntensity: 0,
      clearcoat: 0.5,
      clearcoatRoughness: 0.05,
    }
  },
};

// Helper function to get preset material
export function getMaterialPreset(preset: MaterialPreset): Partial<ObjectMaterial> {
  return materialPresets[preset] || materialPresets.custom;
}

// Apply material preset to an existing material
export function applyMaterialPreset(
  material: ObjectMaterial,
  preset: MaterialPreset
): ObjectMaterial {
  const presetData = getMaterialPreset(preset);

  return {
    ...material,
    ...presetData,
    model_id: material.model_id,
    object_name: material.object_name,
  };
}

// Convert material properties to Three.js material parameters
export function materialToThreeJS(material: ObjectMaterial): any {
  const { color, properties, texture_url, texture_settings } = material;

  const params: any = {
    color: `rgb(${color.r}, ${color.g}, ${color.b})`,
    metalness: properties.metalness,
    roughness: properties.roughness,
    opacity: properties.opacity,
    transparent: properties.opacity < 1,
    emissive: `rgb(${properties.emissive.r}, ${properties.emissive.g}, ${properties.emissive.b})`,
    emissiveIntensity: properties.emissiveIntensity,
  };

  // Add texture information if it exists
  if (texture_url) {
    params.map = texture_url;
    params.textureSettings = texture_settings;
  }

  // Add optional properties if they exist
  if (properties.clearcoat !== undefined) {
    params.clearcoat = properties.clearcoat;
  }

  if (properties.clearcoatRoughness !== undefined) {
    params.clearcoatRoughness = properties.clearcoatRoughness;
  }

  if (properties.ior !== undefined) {
    params.ior = properties.ior;
  }

  if (properties.transmission !== undefined) {
    params.transmission = properties.transmission;
  }

  if (properties.thickness !== undefined) {
    params.thickness = properties.thickness;
  }

  if (properties.reflectivity !== undefined) {
    params.reflectivity = properties.reflectivity;
  }

  return params;
}

// Preset categories for UI organization
export const presetCategories = {
  'Metals': ['metal', 'gold', 'silver', 'copper'],
  'Transparent': ['glass'],
  'Natural': ['wood', 'marble', 'stone', 'concrete'],
  'Synthetic': ['plastic', 'fabric', 'ceramic'],
} as const;

// Preset icons mapping (using emoji for simplicity)
export const presetIcons: Record<MaterialPreset, string> = {
  custom: '🎨',
  glass: '🪟',
  marble: '⬜',
  wood: '🪵',
  concrete: '🧱',
  metal: '⚙️',
  gold: '🥇',
  silver: '🥈',
  copper: '🥉',
  fabric: '🧵',
  plastic: '🔴',
  stone: '🪨',
  ceramic: '🏺',
};