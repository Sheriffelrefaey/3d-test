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
  position: { x: number; y: number; z: number };
  normal?: { x: number; y: number; z: number };
  color?: string;
  icon?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
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