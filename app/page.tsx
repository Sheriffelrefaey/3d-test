'use client';

import Link from 'next/link';
import { Upload, Eye, Settings, Sparkles, Layers, Smartphone, ArrowRight } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-900 text-white relative">
      {/* Subtle grid background */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(90deg, #ffffff 1px, transparent 1px), linear-gradient(180deg, #ffffff 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }}
      />

      <div className="relative z-10 container mx-auto px-6 py-20">
        {/* Header */}
        <header className="text-center mb-24">
          <h1 className="text-7xl font-light mb-6 tracking-wider">
            <span
              className="bg-gradient-to-r from-white via-gray-100 to-white bg-clip-text text-transparent"
              style={{
                backgroundSize: '200% auto',
                animation: 'shimmer 3s ease-in-out infinite'
              }}
            >
              3D Model Viewer
            </span>
          </h1>
          <p className="text-gray-400 text-lg tracking-wide font-light">
            Professional 3D visualization with intelligent annotations
          </p>
        </header>

        {/* Main Actions - HUD style cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-32">
          <Link href="/viewer/demo" className="group">
            <div className="relative bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-8 h-full hover:border-gray-500 transition-all duration-300 hover:bg-gray-800/70">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <Eye className="w-8 h-8 text-gray-300 mb-6 group-hover:text-white transition-colors" strokeWidth={1} />
                <h3 className="text-xl font-light mb-3 text-white group-hover:text-white transition-colors">
                  View Demo
                </h3>
                <p className="text-gray-400 text-sm font-light leading-relaxed">
                  Experience our 3D viewer with sample models
                </p>
                <ArrowRight className="w-4 h-4 text-gray-500 mt-4 group-hover:text-gray-300 transition-colors" strokeWidth={1} />
              </div>
            </div>
          </Link>

          <Link href="/admin" className="group">
            <div className="relative bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-8 h-full hover:border-gray-500 transition-all duration-300 hover:bg-gray-800/70">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <Settings className="w-8 h-8 text-gray-300 mb-6 group-hover:text-white transition-colors" strokeWidth={1} />
                <h3 className="text-xl font-light mb-3 text-white group-hover:text-white transition-colors">
                  Admin Panel
                </h3>
                <p className="text-gray-400 text-sm font-light leading-relaxed">
                  Manage models and configure annotations
                </p>
                <ArrowRight className="w-4 h-4 text-gray-500 mt-4 group-hover:text-gray-300 transition-colors" strokeWidth={1} />
              </div>
            </div>
          </Link>

          <Link href="/upload" className="group">
            <div className="relative bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-8 h-full hover:border-gray-500 transition-all duration-300 hover:bg-gray-800/70">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <Upload className="w-8 h-8 text-gray-300 mb-6 group-hover:text-white transition-colors" strokeWidth={1} />
                <h3 className="text-xl font-light mb-3 text-white group-hover:text-white transition-colors">
                  Upload Model
                </h3>
                <p className="text-gray-400 text-sm font-light leading-relaxed">
                  Import GLB or glTF format models
                </p>
                <ArrowRight className="w-4 h-4 text-gray-500 mt-4 group-hover:text-gray-300 transition-colors" strokeWidth={1} />
              </div>
            </div>
          </Link>
        </div>

        {/* Features - Minimal list */}
        <div className="max-w-3xl mx-auto">
          <div className="border-t border-gray-700 pt-16">
            <h2 className="text-2xl font-light mb-12 text-center">
              <span className="bg-gradient-to-r from-gray-100 to-white bg-clip-text text-transparent">
                Core Features
              </span>
            </h2>

            <div className="grid md:grid-cols-2 gap-x-12 gap-y-8">
              <div className="flex items-start space-x-4">
                <Sparkles className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" strokeWidth={1} />
                <div>
                  <h4 className="text-gray-100 font-light mb-1">Material Editor</h4>
                  <p className="text-gray-500 text-sm font-light">
                    PBR materials with real-time editing
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <Layers className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" strokeWidth={1} />
                <div>
                  <h4 className="text-gray-100 font-light mb-1">Smart Annotations</h4>
                  <p className="text-gray-500 text-sm font-light">
                    Interactive hotspots with rich content
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <Settings className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" strokeWidth={1} />
                <div>
                  <h4 className="text-gray-100 font-light mb-1">Environment Control</h4>
                  <p className="text-gray-500 text-sm font-light">
                    HDR environments and lighting setups
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <Smartphone className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" strokeWidth={1} />
                <div>
                  <h4 className="text-gray-100 font-light mb-1">Responsive Design</h4>
                  <p className="text-gray-500 text-sm font-light">
                    Optimized for all device sizes
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-32 border-t border-gray-700 pt-8 pb-4">
          <div className="text-center">
            <p className="text-gray-500 text-sm font-light">
              Powered by <span className="text-gray-300">Weventures AI</span>
            </p>
          </div>
        </footer>
      </div>

      {/* Global styles for shimmer animation */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
      `}</style>
    </div>
  );
}