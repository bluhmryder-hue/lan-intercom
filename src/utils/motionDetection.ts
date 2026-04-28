export function detectMotion(
  videoElement: HTMLVideoElement,
  threshold = 20,
  onMotionDetected?: () => void
) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  canvas.width = videoElement.videoWidth;
  canvas.height = videoElement.videoHeight;
  let lastFrame: ImageData | null = null;

  const intervalId = setInterval(() => {
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
    if (lastFrame) {
      let diff = 0;
      for (let i = 0; i < frame.data.length; i += 4) {
        diff += Math.abs(frame.data[i] - lastFrame.data[i]);
      }
      if (diff / frame.data.length > threshold) {
        if (onMotionDetected) {
          onMotionDetected();
        } else {
          console.log("Motion detected!");
        }
      }
    }
    lastFrame = frame;
  }, 100);

  return () => clearInterval(intervalId);
}
