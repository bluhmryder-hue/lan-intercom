export function detectMotion(
  videoElement: HTMLVideoElement,
  onMotion?: () => void,
  threshold = 20,
  interval = 100
) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return () => {};

  // Downsample to a small fixed size to significantly reduce CPU usage
  const DOWNSAMPLE_WIDTH = 64;
  const DOWNSAMPLE_HEIGHT = 64;
  canvas.width = DOWNSAMPLE_WIDTH;
  canvas.height = DOWNSAMPLE_HEIGHT;

  let lastFrameData: Uint8ClampedArray | null = null;

  const timer = setInterval(() => {
    if (videoElement.videoWidth === 0 || videoElement.videoHeight === 0) return;

    // Draw video frame downsampled
    ctx.drawImage(videoElement, 0, 0, DOWNSAMPLE_WIDTH, DOWNSAMPLE_HEIGHT);
    const { data } = ctx.getImageData(0, 0, DOWNSAMPLE_WIDTH, DOWNSAMPLE_HEIGHT);

    if (lastFrameData) {
      let diff = 0;
      // Compare only the red channel of each pixel for maximum performance.
      // This is generally sufficient for detecting significant motion.
      for (let i = 0; i < data.length; i += 4) {
        diff += Math.abs(data[i] - lastFrameData[i]);
      }

      // The original threshold logic: diff / total_buffer_length
      // Since data.length is fixed at 64*64*4, this is consistent.
      if (diff / data.length > threshold) {
        if (onMotion) {
          onMotion();
        } else {
          console.log("Motion detected!");
        }
      }
    }

    // Store current frame data for next comparison
    if (!lastFrameData || lastFrameData.length !== data.length) {
      lastFrameData = new Uint8ClampedArray(data);
    } else {
      lastFrameData.set(data);
    }
  }, interval);

  return () => clearInterval(timer);
}
