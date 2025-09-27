import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
  ObjectMaterial,
  ObjectTransform,
  ModelEnvironment,
  Color,
  MaterialPreset,
  Lighting,
  Background,
  Fog,
  Grid
} from '@/types';
import {
  saveMaterials,
  saveTransforms,
  saveEnvironment,
  loadMaterials,
  loadTransforms,
  loadEnvironment
} from './editorPersistence';

interface EditorStore {
  // Current state
  modelId: string | null;
  selectedObject: string | null;
  materials: Map<string, ObjectMaterial>;
  transforms: Map<string, ObjectTransform>;
  environment: ModelEnvironment | null;

  // History for undo/redo
  history: any[];
  historyIndex: number;

  // Flags
  isSaving: boolean;
  hasUnsavedChanges: boolean;

  // Actions - Model
  setModelId: (modelId: string) => void;

  // Actions - Selection
  selectObject: (objectName: string | null) => void;

  // Actions - Materials
  setMaterial: (objectName: string, material: ObjectMaterial) => void;
  updateMaterialProperty: (objectName: string, property: string, value: any) => void;
  applyMaterialPreset: (objectName: string, preset: MaterialPreset) => void;
  deleteMaterial: (objectName: string) => void;

  // Actions - Transforms
  setTransform: (objectName: string, transform: ObjectTransform) => void;
  updateTransformProperty: (objectName: string, property: string, value: any) => void;
  toggleObjectVisibility: (objectName: string) => void;
  deleteObject: (objectName: string) => void;

  // Actions - Environment
  setEnvironment: (environment: ModelEnvironment) => void;
  updateBackground: (background: Partial<Background>) => void;
  updateFog: (fog: Partial<Fog>) => void;
  updateGrid: (grid: Partial<Grid>) => void;
  updateLighting: (lighting: Partial<Lighting>) => void;

  // Actions - History
  undo: () => void;
  redo: () => void;
  clearHistory: () => void;

  // Actions - Persistence
  saveState: () => Promise<void>;
  loadState: (modelId: string) => Promise<void>;
  markAsSaved: () => void;

  // Actions - Reset
  reset: () => void;
}

// Default environment settings
const defaultEnvironment: ModelEnvironment = {
  model_id: '',
  background: {
    type: 'solid',
    color: { r: 245, g: 245, b: 245, a: 1 }
  },
  fog: {
    enabled: false,
    color: { r: 255, g: 255, b: 255, a: 1 },
    near: 10,
    far: 100,
    density: 0.01
  },
  lighting: {
    ambient: {
      color: { r: 255, g: 255, b: 255, a: 1 },
      intensity: 0.8
    },
    directional: [
      {
        color: { r: 255, g: 255, b: 255, a: 1 },
        intensity: 1.5,
        position: { x: 10, y: 10, z: 5 },
        castShadow: true
      }
    ],
    points: []
  },
  grid: {
    show: true,
    color: { r: 156, g: 163, b: 175, a: 1 },
    size: 20,
    divisions: 20,
    opacity: 0.5
  }
};

export const useEditorStore = create<EditorStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      modelId: null,
      selectedObject: null,
      materials: new Map(),
      transforms: new Map(),
      environment: null,
      history: [],
      historyIndex: -1,
      isSaving: false,
      hasUnsavedChanges: false,

      // Model actions
      setModelId: (modelId) =>
        set(() => ({
          modelId
        })),

      // Selection actions
      selectObject: (objectName) =>
        set(() => ({ selectedObject: objectName })),

      // Material actions
      setMaterial: (objectName, material) =>
        set((state) => {
          // Save current state to history before making changes
          const currentState = {
            materials: new Map(state.materials),
            transforms: new Map(state.transforms),
            environment: state.environment
          };

          // Add to history
          const newHistory = state.history.slice(0, state.historyIndex + 1);
          newHistory.push(currentState);

          // Ensure material has an ID and valid material_type
          const materialWithId = {
            ...material,
            id: material.id || crypto.randomUUID(),
            material_type: material.material_type === 'preset' ? 'preset' : 'custom'
          };

          const newMaterials = new Map(state.materials);
          newMaterials.set(objectName, materialWithId);

          return {
            materials: newMaterials,
            hasUnsavedChanges: true,
            history: newHistory.slice(-50), // Keep last 50 states
            historyIndex: newHistory.length - 1
          };
        }),

      updateMaterialProperty: (objectName, property, value) =>
        set((state) => {
          const material = state.materials.get(objectName);
          if (!material) return state;

          // Save current state to history before making changes
          const currentState = {
            materials: new Map(state.materials),
            transforms: new Map(state.transforms),
            environment: state.environment
          };

          // Add to history
          const newHistory = state.history.slice(0, state.historyIndex + 1);
          newHistory.push(currentState);

          const newMaterial = { ...material };
          if (property.includes('.')) {
            // Handle nested properties like 'properties.metalness'
            const [parent, child] = property.split('.');
            (newMaterial as any)[parent] = {
              ...(newMaterial as any)[parent],
              [child]: value
            };
          } else {
            (newMaterial as any)[property] = value;
          }

          const newMaterials = new Map(state.materials);
          newMaterials.set(objectName, newMaterial);
          return {
            materials: newMaterials,
            hasUnsavedChanges: true,
            history: newHistory.slice(-50), // Keep last 50 states
            historyIndex: newHistory.length - 1
          };
        }),

      applyMaterialPreset: (objectName, preset) => {
        // This would use the material presets from lib/materials/presets.ts
        // Implementation depends on importing the presets
        set((state) => {
          const material = state.materials.get(objectName);
          if (!material) return state;

          // Update material with preset values
          const updatedMaterial: ObjectMaterial = {
            ...material,
            material_type: 'preset',
            preset_name: preset,
            // Additional preset properties would be applied here
          };

          const newMaterials = new Map(state.materials);
          newMaterials.set(objectName, updatedMaterial);
          return {
            materials: newMaterials,
            hasUnsavedChanges: true
          };
        });
      },

      deleteMaterial: (objectName) =>
        set((state) => {
          // Save current state to history before making changes
          const currentState = {
            materials: new Map(state.materials),
            transforms: new Map(state.transforms),
            environment: state.environment
          };

          // Add to history
          const newHistory = state.history.slice(0, state.historyIndex + 1);
          newHistory.push(currentState);

          const newMaterials = new Map(state.materials);
          newMaterials.delete(objectName);
          return {
            materials: newMaterials,
            hasUnsavedChanges: true,
            history: newHistory.slice(-50), // Keep last 50 states
            historyIndex: newHistory.length - 1
          };
        }),

      // Transform actions
      setTransform: (objectName, transform) =>
        set((state) => {
          // Save current state to history before making changes
          const currentState = {
            materials: new Map(state.materials),
            transforms: new Map(state.transforms),
            environment: state.environment
          };

          // Add to history
          const newHistory = state.history.slice(0, state.historyIndex + 1);
          newHistory.push(currentState);

          const newTransforms = new Map(state.transforms);
          newTransforms.set(objectName, transform);
          return {
            transforms: newTransforms,
            hasUnsavedChanges: true,
            history: newHistory.slice(-50), // Keep last 50 states
            historyIndex: newHistory.length - 1
          };
        }),

      updateTransformProperty: (objectName, property, value) =>
        set((state) => {
          // Save current state to history before making changes
          const currentState = {
            materials: new Map(state.materials),
            transforms: new Map(state.transforms),
            environment: state.environment
          };

          // Add to history
          const newHistory = state.history.slice(0, state.historyIndex + 1);
          newHistory.push(currentState);

          const transform = state.transforms.get(objectName) || {
            model_id: state.modelId || '',
            object_name: objectName,
            visible: true,
            deleted: false,
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 }
          };

          const newTransform = { ...transform, [property]: value };
          const newTransforms = new Map(state.transforms);
          newTransforms.set(objectName, newTransform);
          return {
            transforms: newTransforms,
            hasUnsavedChanges: true,
            history: newHistory.slice(-50), // Keep last 50 states
            historyIndex: newHistory.length - 1
          };
        }),

      toggleObjectVisibility: (objectName) =>
        set((state) => {
          // Save current state to history before making changes
          const currentState = {
            materials: new Map(state.materials),
            transforms: new Map(state.transforms),
            environment: state.environment
          };

          // Add to history
          const newHistory = state.history.slice(0, state.historyIndex + 1);
          newHistory.push(currentState);

          const transform = state.transforms.get(objectName) || {
            model_id: state.modelId || '',
            object_name: objectName,
            visible: true,
            deleted: false,
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 }
          };

          const newTransform = { ...transform, visible: !transform.visible };
          const newTransforms = new Map(state.transforms);
          newTransforms.set(objectName, newTransform);
          return {
            transforms: newTransforms,
            hasUnsavedChanges: true,
            history: newHistory.slice(-50), // Keep last 50 states
            historyIndex: newHistory.length - 1
          };
        }),

      deleteObject: (objectName) =>
        set((state) => {
          // Save current state to history before making changes
          const currentState = {
            materials: new Map(state.materials),
            transforms: new Map(state.transforms),
            environment: state.environment
          };

          // Add to history
          const newHistory = state.history.slice(0, state.historyIndex + 1);
          newHistory.push(currentState);

          const transform = state.transforms.get(objectName) || {
            model_id: state.modelId || '',
            object_name: objectName,
            visible: false,
            deleted: true,
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 }
          };

          const newTransform = { ...transform, deleted: true, visible: false };
          const newTransforms = new Map(state.transforms);
          newTransforms.set(objectName, newTransform);
          return {
            transforms: newTransforms,
            hasUnsavedChanges: true,
            history: newHistory.slice(-50), // Keep last 50 states
            historyIndex: newHistory.length - 1
          };
        }),

      // Environment actions
      setEnvironment: (environment) =>
        set((state) => {
          // Save current state to history before making changes
          const currentState = {
            materials: new Map(state.materials),
            transforms: new Map(state.transforms),
            environment: state.environment
          };

          // Add to history
          const newHistory = state.history.slice(0, state.historyIndex + 1);
          newHistory.push(currentState);

          return {
            environment,
            hasUnsavedChanges: true,
            history: newHistory.slice(-50), // Keep last 50 states
            historyIndex: newHistory.length - 1
          };
        }),

      updateBackground: (background) =>
        set((state) => {
          if (!state.environment) return state;

          // Save current state to history before making changes
          const currentState = {
            materials: new Map(state.materials),
            transforms: new Map(state.transforms),
            environment: state.environment
          };

          // Add to history
          const newHistory = state.history.slice(0, state.historyIndex + 1);
          newHistory.push(currentState);

          return {
            environment: {
              ...state.environment,
              background: { ...state.environment.background, ...background }
            },
            hasUnsavedChanges: true,
            history: newHistory.slice(-50), // Keep last 50 states
            historyIndex: newHistory.length - 1
          };
        }),

      updateFog: (fog) =>
        set((state) => {
          if (!state.environment) return state;

          // Save current state to history before making changes
          const currentState = {
            materials: new Map(state.materials),
            transforms: new Map(state.transforms),
            environment: state.environment
          };

          // Add to history
          const newHistory = state.history.slice(0, state.historyIndex + 1);
          newHistory.push(currentState);

          return {
            environment: {
              ...state.environment,
              fog: { ...state.environment.fog, ...fog }
            },
            hasUnsavedChanges: true,
            history: newHistory.slice(-50), // Keep last 50 states
            historyIndex: newHistory.length - 1
          };
        }),

      updateGrid: (grid) =>
        set((state) => {
          if (!state.environment) return state;

          // Save current state to history before making changes
          const currentState = {
            materials: new Map(state.materials),
            transforms: new Map(state.transforms),
            environment: state.environment
          };

          // Add to history
          const newHistory = state.history.slice(0, state.historyIndex + 1);
          newHistory.push(currentState);

          return {
            environment: {
              ...state.environment,
              grid: { ...state.environment.grid, ...grid }
            },
            hasUnsavedChanges: true,
            history: newHistory.slice(-50), // Keep last 50 states
            historyIndex: newHistory.length - 1
          };
        }),

      updateLighting: (lighting) =>
        set((state) => {
          if (!state.environment) return state;

          // Save current state to history before making changes
          const currentState = {
            materials: new Map(state.materials),
            transforms: new Map(state.transforms),
            environment: state.environment
          };

          // Add to history
          const newHistory = state.history.slice(0, state.historyIndex + 1);
          newHistory.push(currentState);

          return {
            environment: {
              ...state.environment,
              lighting: { ...state.environment.lighting, ...lighting }
            },
            hasUnsavedChanges: true,
            history: newHistory.slice(-50), // Keep last 50 states
            historyIndex: newHistory.length - 1
          };
        }),

      // History actions
      undo: () => {
        const state = get();
        if (state.historyIndex >= 0 && state.history.length > 0) {
          // Save current state if it's the first undo
          if (state.historyIndex === state.history.length - 1) {
            const currentState = {
              materials: new Map(state.materials),
              transforms: new Map(state.transforms),
              environment: state.environment
            };
            const newHistory = [...state.history];
            newHistory.push(currentState);

            // Use the previous state
            const previousState = state.history[state.historyIndex];
            set({
              materials: previousState.materials,
              transforms: previousState.transforms,
              environment: previousState.environment,
              history: newHistory.slice(-50),
              historyIndex: state.historyIndex,
              hasUnsavedChanges: true
            });
          } else if (state.historyIndex > 0) {
            // Normal undo
            const previousState = state.history[state.historyIndex - 1];
            set({
              materials: previousState.materials,
              transforms: previousState.transforms,
              environment: previousState.environment,
              historyIndex: state.historyIndex - 1,
              hasUnsavedChanges: true
            });
          }
        }
      },

      redo: () => {
        const state = get();
        if (state.historyIndex < state.history.length - 1) {
          const nextState = state.history[state.historyIndex + 1];
          set({
            materials: nextState.materials,
            transforms: nextState.transforms,
            environment: nextState.environment,
            historyIndex: state.historyIndex + 1,
            hasUnsavedChanges: true
          });
        }
      },

      clearHistory: () =>
        set(() => ({
          history: [],
          historyIndex: -1
        })),

      // Persistence actions
      saveState: async () => {
        set({ isSaving: true });
        const state = get();

        if (!state.modelId) {
          console.error('No modelId set, cannot save');
          set({ isSaving: false });
          return;
        }

        // Save to Supabase
        try {
          // Save materials
          const materialsArray = Array.from(state.materials.values()).map(m => ({
            ...m,
            model_id: state.modelId
          }));
          if (materialsArray.length > 0) {
            await saveMaterials(materialsArray);
          }

          // Save transforms
          const transformsArray = Array.from(state.transforms.values()).map(t => ({
            ...t,
            model_id: state.modelId
          }));
          if (transformsArray.length > 0) {
            await saveTransforms(transformsArray);
          }

          // Save environment
          if (state.environment) {
            await saveEnvironment({
              ...state.environment,
              model_id: state.modelId
            });
          }

          set({
            isSaving: false,
            hasUnsavedChanges: false
          });
        } catch (error) {
          console.error('Failed to save state:', error);
          set({ isSaving: false });
          throw error;
        }
      },

      loadState: async (modelId) => {
        try {
          // Load from Supabase
          const materials = await loadMaterials(modelId);
          const transforms = await loadTransforms(modelId);
          const environment = await loadEnvironment(modelId);

          // Convert arrays to Maps
          const materialsMap = new Map<string, ObjectMaterial>();
          materials.forEach(m => {
            if (m.object_name) {
              materialsMap.set(m.object_name, m);
            }
          });

          const transformsMap = new Map<string, ObjectTransform>();
          transforms.forEach(t => {
            if (t.object_name) {
              transformsMap.set(t.object_name, t);
            }
          });

          set({
            modelId,
            materials: materialsMap,
            transforms: transformsMap,
            environment: environment || { ...defaultEnvironment, model_id: modelId },
            hasUnsavedChanges: false
          });
        } catch (error) {
          console.error('Failed to load state:', error);
          // Initialize with defaults if loading fails
          set({
            modelId,
            materials: new Map(),
            transforms: new Map(),
            environment: { ...defaultEnvironment, model_id: modelId }
          });
        }
      },

      markAsSaved: () =>
        set(() => ({ hasUnsavedChanges: false })),

      // Reset action
      reset: () =>
        set(() => ({
          modelId: null,
          selectedObject: null,
          materials: new Map(),
          transforms: new Map(),
          environment: null,
          history: [],
          historyIndex: -1,
          isSaving: false,
          hasUnsavedChanges: false
        }))
    }),
    {
      name: 'editor-store'
    }
  )
);