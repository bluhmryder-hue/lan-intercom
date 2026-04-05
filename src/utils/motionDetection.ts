export interface MotionOptions {
  onMotionDetected: () => void;
  threshold?: number;
  interval?: number;
}

export function detectMotion(videoElement: HTMLVideoElement, options: MotionOptions) {
  const { onMotionDetected, threshold = 20, interval = 100 } = options;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;

  // Use videoWidth/height if available, otherwise fallback
  const width = videoElement.videoWidth || 640;
  const height = videoElement.videoHeight || 480;
  canvas.width = width;
  canvas.height = height;

  let lastFrame: ImageData | null = null;

  const timer = setInterval(() => {
    if (videoElement.readyState < 2) return; // Wait for metadata/current frame

    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);

    if (lastFrame) {
      let diff = 0;
      for (let i = 0; i < frame.data.length; i += 4) {
        diff += Math.abs(frame.data[i] - lastFrame.data[i]);
      }

      const averageDiff = diff / (frame.data.length / 4);
      if (averageDiff > threshold) {
        onMotionDetected();
      }
    }
    lastFrame = frame;
  }, interval);

  return () => clearInterval(timer);
}
