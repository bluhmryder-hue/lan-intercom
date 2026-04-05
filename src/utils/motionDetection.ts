export function detectMotion(
  videoElement: HTMLVideoElement,
  onMotionDetected?: () => void,
  threshold = 0.05
) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;

  const width = videoElement.videoWidth || 640;
  const height = videoElement.videoHeight || 480;
  canvas.width = width;
  canvas.height = height;

  let lastFrame: ImageData | null = null;

  const intervalId = setInterval(() => {
    if (videoElement.readyState < 2) return; // HAVE_CURRENT_DATA

    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);

    if (lastFrame) {
      let diff = 0;
      for (let i = 0; i < frame.data.length; i += 4) {
        // Simple pixel difference (could be improved by grayscale/blur)
        const rDiff = Math.abs(frame.data[i] - lastFrame.data[i]);
        const gDiff = Math.abs(frame.data[i + 1] - lastFrame.data[i + 1]);
        const bDiff = Math.abs(frame.data[i + 2] - lastFrame.data[i + 2]);
        diff += (rDiff + gDiff + bDiff) / 3;
      }

      const normalizedDiff = diff / (width * height);
      if (normalizedDiff > threshold) {
        if (onMotionDetected) {
          onMotionDetected();
        } else {
          console.log("Motion detected!");
        }
      }
    }
    lastFrame = frame;
  }, 500);

  return () => clearInterval(intervalId);
}
