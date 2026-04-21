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
    <div className={`relative overflow-hidden rounded-xl bg-slate-900 aspect-video ${className}`}>
      {stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={muted}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="flex flex-col items-center justify-center w-full h-full text-slate-500">
          <CameraOff size={48} className="mb-2 opacity-20" />
          <span className="text-sm font-medium">Camera Offline</span>
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent">
        <div className="flex items-center justify-between">
          <span className="text-white text-sm font-semibold truncate">{name}</span>
          {badge && (
            <span className={`px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold rounded-full ${
              badge === 'connected' ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-300'
            }`}>
              {badge}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
