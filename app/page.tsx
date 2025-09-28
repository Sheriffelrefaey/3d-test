import Link from 'next/link';
import { Upload, Eye, Settings, Sparkles, Layers, Smartphone } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-purple-900/20 to-pink-900/20">
        <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-16">
        <header className="text-center mb-20">
          <div className="inline-block mb-6">
            <div className="glass gradient-border rounded-2xl p-8 glow">
              <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
                3D Model Viewer
              </h1>
              <p className="text-xl text-gray-300">
                Interactive 3D models with smart annotations
              </p>
            </div>
          </div>
        </header>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-20">
          <Link href="/viewer/demo" className="group">
            <div className="glass glass-hover rounded-2xl p-8 h-full">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Eye className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-white">View Demo</h3>
              <p className="text-gray-400">
                Experience our 3D viewer with sample models and annotations
              </p>
            </div>
          </Link>

          <Link href="/admin" className="group">
            <div className="glass glass-hover rounded-2xl p-8 h-full">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Settings className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-white">Admin Panel</h3>
              <p className="text-gray-400">
                Manage your 3D models and configure annotations
              </p>
            </div>
          </Link>

          <Link href="/upload" className="group">
            <div className="glass glass-hover rounded-2xl p-8 h-full">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Upload className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-white">Upload Model</h3>
              <p className="text-gray-400">
                Import your own 3D models in GLB or glTF format
              </p>
            </div>
          </Link>
        </div>

        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-12 text-center text-white">
            Powerful Features
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="glass rounded-xl p-6 flex items-start space-x-4">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h4 className="font-bold mb-2 text-white">Material Editor</h4>
                <p className="text-gray-400 text-sm">
                  Advanced PBR materials with real-time editing
                </p>
              </div>
            </div>

            <div className="glass rounded-xl p-6 flex items-start space-x-4">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center flex-shrink-0">
                <Layers className="w-6 h-6 text-white" />
              </div>
              <div>
                <h4 className="font-bold mb-2 text-white">Smart Annotations</h4>
                <p className="text-gray-400 text-sm">
                  Add interactive hotspots with rich content
                </p>
              </div>
            </div>

            <div className="glass rounded-xl p-6 flex items-start space-x-4">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center flex-shrink-0">
                <Settings className="w-6 h-6 text-white" />
              </div>
              <div>
                <h4 className="font-bold mb-2 text-white">Environment Control</h4>
                <p className="text-gray-400 text-sm">
                  HDR environments and custom lighting setups
                </p>
              </div>
            </div>

            <div className="glass rounded-xl p-6 flex items-start space-x-4">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                <Smartphone className="w-6 h-6 text-white" />
              </div>
              <div>
                <h4 className="font-bold mb-2 text-white">Mobile Ready</h4>
                <p className="text-gray-400 text-sm">
                  Responsive design works on all devices
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}