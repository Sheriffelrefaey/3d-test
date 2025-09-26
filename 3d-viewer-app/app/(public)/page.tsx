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
              <div className="mb-4 w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <Eye className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-semibold mb-3 text-white">View Models</h2>
              <p className="text-gray-400 mb-4">
                Explore 3D models with interactive annotations and smooth controls
              </p>
              <div className="text-blue-400 group-hover:text-blue-300 transition-colors">
                Try Demo →
              </div>
            </div>
          </Link>

          <Link href="/upload" className="group">
            <div className="glass glass-hover rounded-2xl p-8 h-full">
              <div className="mb-4 w-12 h-12 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                <Upload className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-semibold mb-3 text-white">Upload Models</h2>
              <p className="text-gray-400 mb-4">
                Upload your own 3D models in GLTF, OBJ, or FBX format
              </p>
              <div className="text-green-400 group-hover:text-green-300 transition-colors">
                Upload Now →
              </div>
            </div>
          </Link>

          <Link href="/admin" className="group">
            <div className="glass glass-hover rounded-2xl p-8 h-full">
              <div className="mb-4 w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                <Settings className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-semibold mb-3 text-white">Admin Panel</h2>
              <p className="text-gray-400 mb-4">
                Manage uploaded models and annotations with powerful tools
              </p>
              <div className="text-purple-400 group-hover:text-purple-300 transition-colors">
                Dashboard →
              </div>
            </div>
          </Link>
        </div>

        <section className="text-center mb-20">
          <h2 className="text-4xl font-bold mb-12 text-white">Features</h2>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <div className="glass rounded-xl p-6 group hover:scale-105 transition-transform">
              <div className="mb-4 mx-auto w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-white">Multiple Formats</h3>
              <p className="text-gray-400">Support for GLTF, OBJ, and FBX models</p>
            </div>

            <div className="glass rounded-xl p-6 group hover:scale-105 transition-transform">
              <div className="mb-4 mx-auto w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
                <Layers className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-white">Smart Annotations</h3>
              <p className="text-gray-400">Interactive markers with rich content</p>
            </div>

            <div className="glass rounded-xl p-6 group hover:scale-105 transition-transform">
              <div className="mb-4 mx-auto w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center">
                <Smartphone className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-white">Responsive Design</h3>
              <p className="text-gray-400">Works seamlessly on all devices</p>
            </div>
          </div>
        </section>

        <footer className="text-center">
          <div className="glass rounded-xl p-6 inline-block">
            <p className="text-gray-400">
              Built with Next.js, Three.js, and Supabase
            </p>
          </div>
        </footer>
      </div>

      <style jsx>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}