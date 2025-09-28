import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

// Create a singleton instance of the loaders
let gltfLoader: GLTFLoader | null = null;
let dracoLoader: DRACOLoader | null = null;

export function getGLTFLoader(): GLTFLoader {
  if (!gltfLoader) {
    gltfLoader = new GLTFLoader();

    // Setup DRACO loader for compressed models
    if (!dracoLoader) {
      dracoLoader = new DRACOLoader();
      // Use the CDN version of the DRACO decoder
      dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
      dracoLoader.setDecoderConfig({ type: 'js' });
    }

    gltfLoader.setDRACOLoader(dracoLoader);
  }

  return gltfLoader;
}

export function disposeDRACOLoader(): void {
  if (dracoLoader) {
    dracoLoader.dispose();
    dracoLoader = null;
  }
  gltfLoader = null;
}