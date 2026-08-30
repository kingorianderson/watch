import { useState, useEffect } from 'react';
import { Server, RefreshCw, Sparkles, Info } from 'lucide-react';
import { STREAM_SERVERS, type StreamServer } from '../services/providers';

interface VideoPlayerProps {
  tmdbId: number | string;
  type: 'movie' | 'tv';
  season?: number;
  episode?: number;
  title: string;
}

export default function VideoPlayer({
  tmdbId,
  type,
  season = 1,
  episode = 1,
  title,
}: VideoPlayerProps) {
  const [currentServer, setCurrentServer] = useState<StreamServer>(STREAM_SERVERS[0]);
  const [iframeKey, setIframeKey] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // When id, season, episode, or server changes, reset loader
  useEffect(() => {
    setIsLoading(true);
    setIframeKey((prev) => prev + 1);
  }, [tmdbId, type, season, episode, currentServer]);

  const streamUrl =
    type === 'movie'
      ? currentServer.getMovieUrl(tmdbId)
      : currentServer.getTvUrl(tmdbId, season, episode);

  const handleServerChange = (server: StreamServer) => {
    setCurrentServer(server);
  };

  const handleReload = () => {
    setIsLoading(true);
    setIframeKey((prev) => prev + 1);
  };

  return (
    <div className="w-full space-y-4">
      {/* Video Player Frame Container */}
      <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-zinc-800 ring-1 ring-zinc-800/50">
        {/* Loading Spinner Indicator */}
        {isLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-zinc-950/90 backdrop-blur-sm pointer-events-none">
            <div className="w-12 h-12 border-4 border-red-500/20 border-t-red-500 rounded-full animate-spin mb-3" />
            <p className="text-sm font-medium text-zinc-300">Connecting to {currentServer.name}...</p>
            <div className="flex items-center gap-1.5 text-xs text-amber-400 mt-2 font-medium bg-amber-950/40 px-2.5 py-1 rounded-full border border-amber-800/40">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Loading HD Video Feed</span>
            </div>
          </div>
        )}

        {/* Video Embed Iframe */}
        <iframe
          key={iframeKey}
          src={streamUrl}
          title={`${title} Stream Player`}
          onLoad={() => setIsLoading(false)}
          className="w-full h-full border-0 relative z-20"
          allowFullScreen
          allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
          referrerPolicy="origin"
        />
      </div>

      {/* Control Bar: Server Switching & Controls */}
      <div className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800 p-4 rounded-2xl flex flex-col space-y-3">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          {/* Server Switcher */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400 mr-2 uppercase tracking-wider">
              <Server className="w-4 h-4 text-red-500" />
              <span>Servers:</span>
            </div>

            {STREAM_SERVERS.map((server) => {
              const isSelected = server.id === currentServer.id;
              return (
                <button
                  key={server.id}
                  onClick={() => handleServerChange(server)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                      : 'bg-zinc-800/90 text-zinc-300 hover:bg-zinc-700 hover:text-white'
                  }`}
                >
                  <span>{server.name}</span>
                  {server.badge && (
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                        isSelected ? 'bg-red-700 text-red-100' : 'bg-zinc-950 text-zinc-400 border border-zinc-700/50'
                      }`}
                    >
                      {server.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <button
              onClick={handleReload}
              className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition border border-zinc-700 cursor-pointer"
              title="Reload Video Stream"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reload Stream</span>
            </button>
          </div>
        </div>

        {/* Server Quality Note */}
        <div className="pt-2 border-t border-zinc-800/60 flex items-center gap-2 text-[11px] text-zinc-400">
          <Info className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
          <span>
            If a video is slow or buffers, click any other server above. For 100% zero ads across all streams, use <strong>Brave Browser</strong>.
          </span>
        </div>
      </div>
    </div>
  );
}
