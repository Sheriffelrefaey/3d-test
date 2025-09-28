'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

interface LoaderScreenProps {
  onComplete?: () => void;
  duration?: number;
}

export default function LoaderScreen({ onComplete, duration = 4000 }: LoaderScreenProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      if (onComplete) {
        setTimeout(onComplete, 300); // Allow fade out animation to complete
      }
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onComplete]);

  if (!isVisible) return null;

  return (
    <div className={`fixed inset-0 z-[9999] transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      {/* Blur Overlay */}
      <div className="absolute inset-0 backdrop-blur-md bg-black/80" />

      {/* Content Container */}
      <div className="relative h-full flex flex-col items-center justify-center">
        {/* Spinner */}
        <div className="mb-8 animate-spin-slow">
          <Image
            src="/LOADER.svg"
            alt="Loading"
            width={80}
            height={80}
            className="opacity-90"
          />
        </div>

        {/* Loading Text */}
        <div className="mb-4">
          <p className="text-white text-xl font-light tracking-wider animate-pulse">
            Loading Experience..
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center">
        <p className="text-white/80 text-sm tracking-wide">
          Powered By <span className="font-bold">Weventures AI</span>
        </p>
      </div>
    </div>
  );
}