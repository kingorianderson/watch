import { Link } from 'react-router-dom';
import { Film, Home, Compass } from 'lucide-react';
import { usePageTitle } from '../hooks/usePageTitle';

export default function NotFoundPage() {
  usePageTitle('404 Page Not Found');

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4 py-24">
      {/* 404 Badge */}
      <div className="relative mb-6">
        <span className="text-8xl sm:text-9xl font-black tracking-widest text-zinc-900 select-none">
          404
        </span>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-red-600/20 border border-red-500/30 flex items-center justify-center shadow-2xl">
            <Film className="w-8 h-8 text-red-500" />
          </div>
        </div>
      </div>

      <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight mb-2">
        Lost in the Cinema?
      </h1>
      <p className="text-sm sm:text-base text-zinc-400 max-w-md mx-auto mb-8 leading-relaxed">
        The movie or page you are looking for does not exist or may have been relocated to another dimension.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          to="/"
          className="px-6 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm flex items-center gap-2 shadow-xl shadow-red-600/30 hover:scale-105 transition duration-200"
        >
          <Home className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>

        <Link
          to="/explore"
          className="px-6 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white font-semibold text-sm flex items-center gap-2 border border-zinc-800 transition"
        >
          <Compass className="w-4 h-4" />
          <span>Explore Catalog</span>
        </Link>
      </div>
    </div>
  );
}
