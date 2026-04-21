import React, { useEffect, useRef } from "react";
import { Camera, CameraOff } from "lucide-react";

interface Props {
  stream: MediaStream | null;
  name: string;
  muted?: boolean;
  badge?: string;
  className?: string;
}

export default function VideoFeed({ stream, name, muted = false, badge, className = "" }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const element = videoRef.current;
    if (!element || !stream) {
      return;
    }

    element.srcObject = stream;
    void element.play().catch(() => {});
  }, [stream]);

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-slate-900 aspect-video group ${className}`}>
      {stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={muted}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="flex flex-col items-center justify-center w-full h-full text-slate-600 bg-slate-800/50">
          <CameraOff size={40} className="mb-2 opacity-30 group-hover:scale-110 transition-transform" />
          <span className="text-xs font-bold uppercase tracking-widest opacity-40">Offline</span>
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-white text-sm font-bold truncate max-w-[150px] sm:max-w-[200px]">{name}</span>
            {badge === 'connected' && (
              <span className="text-emerald-400 text-[10px] font-bold uppercase tracking-tighter">Live Connection</span>
            )}
          </div>
          {badge && (
            <span className={`px-2.5 py-1 text-[10px] uppercase tracking-wider font-black rounded-lg ${
              badge === 'connected' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-800 text-slate-400'
            }`}>
              {badge}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
