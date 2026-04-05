import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { detectMotion } from '../src/utils/motionDetection';

describe('detectMotion Utility (Windows Environment)', () => {
  let video: HTMLVideoElement;
  let onMotionDetected: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    onMotionDetected = vi.fn();

    video = document.createElement('video');
    Object.defineProperty(video, 'videoWidth', { value: 100, writable: true });
    Object.defineProperty(video, 'videoHeight', { value: 100, writable: true });
    Object.defineProperty(video, 'paused', { value: false, writable: true });
    Object.defineProperty(video, 'ended', { value: false, writable: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should not trigger motion detection if the video is paused', () => {
    video.paused = true;
    detectMotion(video, 10, onMotionDetected);
    vi.advanceTimersByTime(100);
    expect(onMotionDetected).not.toHaveBeenCalled();
  });

  it('should detect motion when pixels change significantly', () => {
    const getImageDataSpy = vi.spyOn(CanvasRenderingContext2D.prototype, 'getImageData');

    const blackFrame = new ImageData(new Uint8ClampedArray(100 * 100 * 4).fill(0), 100, 100);
    const whiteFrame = new ImageData(new Uint8ClampedArray(100 * 100 * 4).fill(255), 100, 100);

    getImageDataSpy
      .mockReturnValueOnce(blackFrame)
      .mockReturnValueOnce(whiteFrame);

    const stop = detectMotion(video, 5, onMotionDetected);

    vi.advanceTimersByTime(100);
    expect(onMotionDetected).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(onMotionDetected).toHaveBeenCalled();

    stop();
  });

  it('should not detect motion when frames are identical', () => {
    const getImageDataSpy = vi.spyOn(CanvasRenderingContext2D.prototype, 'getImageData');
    const frameData = new ImageData(new Uint8ClampedArray(100 * 100 * 4).fill(128), 100, 100);
    getImageDataSpy.mockReturnValue(frameData);

    const stop = detectMotion(video, 10, onMotionDetected);

    vi.advanceTimersByTime(100);
    vi.advanceTimersByTime(100);

    expect(onMotionDetected).not.toHaveBeenCalled();
    stop();
  });

  it('should stop detection when the cleanup function is called', () => {
    const stop = detectMotion(video, 10, onMotionDetected);
    vi.advanceTimersByTime(100);
    stop();

    const getImageDataSpy = vi.spyOn(CanvasRenderingContext2D.prototype, 'getImageData');
    getImageDataSpy.mockReturnValue(new ImageData(new Uint8ClampedArray(100 * 100 * 4).fill(255), 100, 100));

    vi.advanceTimersByTime(100);
    expect(onMotionDetected).not.toHaveBeenCalled();
  });

  it('should handle video resizing gracefully', () => {
    const stop = detectMotion(video, 10, onMotionDetected);
    vi.advanceTimersByTime(100);

    Object.defineProperty(video, 'videoWidth', { value: 200, writable: true });
    Object.defineProperty(video, 'videoHeight', { value: 200, writable: true });

    vi.advanceTimersByTime(100);
    expect(onMotionDetected).not.toHaveBeenCalled();

    stop();
  });

  it('should log to console if no callback is provided', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const getImageDataSpy = vi.spyOn(CanvasRenderingContext2D.prototype, 'getImageData');

    const blackFrame = new ImageData(new Uint8ClampedArray(100 * 100 * 4).fill(0), 100, 100);
    const whiteFrame = new ImageData(new Uint8ClampedArray(100 * 100 * 4).fill(255), 100, 100);

    getImageDataSpy
      .mockReturnValueOnce(blackFrame)
      .mockReturnValueOnce(whiteFrame);

    const stop = detectMotion(video, 5);
    vi.advanceTimersByTime(100);
    vi.advanceTimersByTime(100);

    expect(logSpy).toHaveBeenCalledWith("Motion detected!");
    stop();
  });
});
