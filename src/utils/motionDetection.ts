export function detectMotion(
  videoElement: HTMLVideoElement,
  threshold = 20,
  onMotionDetected?: () => void
): () => void {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;

  // Set canvas size once, update if video size changes
  canvas.width = videoElement.videoWidth || 640;
  canvas.height = videoElement.videoHeight || 480;

  let lastFrame: ImageData | null = null;

  const intervalId = setInterval(() => {
    // If video is not playing or has no size yet, skip this frame
    if (videoElement.paused || videoElement.ended || !videoElement.videoWidth) return;

    // Sync canvas size with video element
    if (canvas.width !== videoElement.videoWidth || canvas.height !== videoElement.videoHeight) {
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
      lastFrame = null; // Reset lastFrame as dimensions changed
    }

    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);

    if (lastFrame) {
      let diff = 0;
      // frame.data contains [R, G, B, A, R, G, B, A, ...]
      for (let i = 0; i < frame.data.length; i += 4) {
        // Simple pixel-by-pixel intensity difference across RGB channels
        diff += Math.abs(frame.data[i] - lastFrame.data[i]);
        diff += Math.abs(frame.data[i + 1] - lastFrame.data[i + 1]);
        diff += Math.abs(frame.data[i + 2] - lastFrame.data[i + 2]);
      }

      // Normalized by total number of pixels
      const normalizedDiff = diff / (canvas.width * canvas.height);

      if (normalizedDiff > threshold) {
        if (onMotionDetected) {
          onMotionDetected();
        } else {
          console.log("Motion detected!");
        }
      }
    }
    lastFrame = frame;
  }, 100);

  // Return cleanup function to stop the interval
  return () => clearInterval(intervalId);
}
