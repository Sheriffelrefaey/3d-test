export interface Model {
  id: string;
  name: string;
  description?: string;
  file_url: string;
  file_size?: number; // Size in bytes
  thumbnail_url?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface Annotation {
  id: string;
  model_id: string;
  title: string;
  description?: string;
  position?: { x: number; y: number; z: number };
  // For compatibility, we still use these internally
  position_x: number;
  position_y: number;
  position_z: number;
  object_name?: string;
  normal?: { x: number; y: number; z: number };
  color?: string;
  icon?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at?: string;
  created_by?: string;
}

export interface AnnotationInteraction {
  id: string;
  annotation_id: string;
  type: 'click' | 'hover' | 'view';
  user_id?: string;
  session_id?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: 'admin' | 'editor' | 'viewer';
  created_at: string;
}

// ========== Enhanced Editor Types ==========

// Material and Styling Types
export interface Color {
  r: number;
  g: number;
  b: number;
  a?: number;
}

export interface Vector2 {
  x: number;
  y: number;
}

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export type TextureWrapMode = 'repeat' | 'mirror' | 'clamp';

export interface TextureSettings {
  scale?: Vector2;
  repeat?: Vector2;
  offset?: Vector2;
  rotation?: number;
  wrapS?: TextureWrapMode;
  wrapT?: TextureWrapMode;
}

export interface MaterialProperties {
  metalness: number;
  roughness: number;
  opacity: number;
  emissive: Color;
  emissiveIntensity: number;
  clearcoat?: number;
  clearcoatRoughness?: number;
  ior?: number; // Index of refraction
  transmission?: number; // For glass materials
  thickness?: number;
  reflectivity?: number;
}

export type MaterialPreset =
  | 'custom'
  | 'marble'
  | 'glass'
  | 'wood'
  | 'concrete'
  | 'metal'
  | 'fabric'
  | 'plastic'
  | 'stone'
  | 'gold'
  | 'silver'
  | 'copper'
  | 'ceramic';

export interface ObjectMaterial {
  id?: string;
  model_id: string;
  object_name: string;
  material_type: 'custom' | 'preset';
  preset_name?: MaterialPreset;
  color: Color;
  texture_url?: string;
  texture_settings?: TextureSettings | null;
  properties: MaterialProperties;
  created_at?: string;
  updated_at?: string;
}

// Lighting Types
export interface DirectionalLight {
  color: Color;
  intensity: number;
  position: Vector3;
  castShadow: boolean;
  shadowMapSize?: number;
}

export interface PointLight {
  id?: string;
  color: Color;
  intensity: number;
  position: Vector3;
  distance: number;
  decay: number;
  castShadow: boolean;
}

export interface SpotLight {
  id?: string;
  color: Color;
  intensity: number;
  position: Vector3;
  target: Vector3;
  angle: number;
  penumbra: number;
  distance: number;
  decay: number;
  castShadow: boolean;
}

export interface AmbientLight {
  color: Color;
  intensity: number;
}

export interface Lighting {
  ambient: AmbientLight;
  directional: DirectionalLight[];
  points: PointLight[];
  spots?: SpotLight[];
}

// Environment Types
export interface GradientStop {
  color: Color;
  position: number; // 0 to 1
}

export interface Gradient {
  type: 'linear' | 'radial';
  angle?: number; // For linear gradients
  stops: GradientStop[];
}

export interface Background {
  type: 'solid' | 'gradient' | 'image' | 'skybox' | 'environment';
  color?: Color;
  gradient?: Gradient;
  imageUrl?: string;
  environmentPreset?: string;
}

export interface Fog {
  enabled: boolean;
  type?: 'linear' | 'exponential';
  color: Color;
  near: number;
  far: number;
  density: number;
}

export interface Grid {
  show: boolean;
  color: Color;
  size: number;
  divisions: number;
  opacity: number;
  fadeDistance?: number;
  fadeStrength?: number;
}

export interface PostProcessing {
  bloom?: {
    enabled: boolean;
    intensity: number;
    threshold?: number;
    smoothing?: number;
  };
  dof?: {
    enabled: boolean;
    focus: number;
    aperture: number;
    maxBlur?: number;
  };
  vignette?: {
    enabled: boolean;
    darkness: number;
    offset?: number;
  };
  chromaticAberration?: {
    enabled: boolean;
    offset: number;
  };
  toneMapping?: {
    type: 'none' | 'linear' | 'reinhard' | 'cineon' | 'aces';
    exposure: number;
  };
}

export interface ModelEnvironment {
  id?: string;
  model_id: string;
  background: Background;
  fog: Fog;
  lighting: Lighting;
  grid: Grid;
  post_processing?: PostProcessing;
  created_at?: string;
  updated_at?: string;
}

// Transform Types
export interface ObjectTransform {
  id?: string;
  model_id: string;
  object_name: string;
  visible: boolean;
  deleted: boolean;
  position: Vector3;
  rotation: Vector3;
  scale: Vector3;
  created_at?: string;
  updated_at?: string;
}

// Editor State
export interface EditorState {
  selectedObject: string | null;
  materials: Map<string, ObjectMaterial>;
  transforms: Map<string, ObjectTransform>;
  environment: ModelEnvironment;
  history: EditorAction[];
  historyIndex: number;
}

export interface EditorAction {
  type: string;
  payload: any;
  timestamp: number;
}

// UI Component Props
export interface ColorPickerProps {
  color: Color;
  onChange: (color: Color) => void;
  showAlpha?: boolean;
  presets?: Color[];
}

export interface GradientEditorProps {
  gradient: Gradient;
  onChange: (gradient: Gradient) => void;
}

export interface MaterialPanelProps {
  material: ObjectMaterial;
  onChange: (material: ObjectMaterial) => void;
  onPresetSelect?: (preset: MaterialPreset) => void;
}

export interface LightingControlsProps {
  lighting: Lighting;
  onChange: (lighting: Lighting) => void;
}

export interface EnvironmentPanelProps {
  environment: ModelEnvironment;
  onChange: (environment: ModelEnvironment) => void;
}
