import React, { useEffect, useRef } from "react";

interface Props {
  stream: MediaStream | null;
  name: string;
  muted?: boolean;
  badge?: string;
}

export default function VideoFeed({ stream, name, muted = false, badge }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const element = videoRef.current;
    if (!element || !stream) {
      return;
    }

    element.srcObject = stream;
    void element.play().catch(() => {
      // Browsers may block autoplay until user interaction.
    });
  }, [stream]);

  return (
    <div className="video-feed">
      <div className="video-shell">
        {stream ? (
          <video ref={videoRef} autoPlay playsInline muted={muted} />
        ) : (
          <div className="empty-video">Waiting for media</div>
        )}
      </div>
      <div className="video-caption">
        <strong>{name}</strong>
        {badge ? <span>{badge}</span> : null}
      </div>
    </div>
  );
}
