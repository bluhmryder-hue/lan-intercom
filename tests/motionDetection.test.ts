import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { detectMotion } from '../src/utils/motionDetection';

describe('detectMotion', () => {
  let videoElement: HTMLVideoElement;
  let onMotionDetected: () => void;

  beforeEach(() => {
    vi.useFakeTimers();
    videoElement = document.createElement('video');
    // Mock video dimensions
    Object.defineProperty(videoElement, 'videoWidth', { value: 100 });
    Object.defineProperty(videoElement, 'videoHeight', { value: 100 });
    onMotionDetected = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should not detect motion when frames are identical', () => {
    detectMotion(videoElement, 20, onMotionDetected);

    // Trigger two intervals
    vi.advanceTimersByTime(100); // Capture first frame
    vi.advanceTimersByTime(100); // Compare with second (identical) frame

    expect(onMotionDetected).not.toHaveBeenCalled();
  });

  it('should detect motion when frames differ significantly', () => {
    const mockCtx = {
      drawImage: vi.fn(),
      getImageData: vi.fn()
        .mockReturnValueOnce({ data: new Uint8ClampedArray(40000).fill(0) }) // Frame 1
        .mockReturnValueOnce({ data: new Uint8ClampedArray(40000).fill(255) }) // Frame 2
    };

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(mockCtx as any);

    detectMotion(videoElement, 20, onMotionDetected);

    vi.advanceTimersByTime(100); // Capture first frame
    vi.advanceTimersByTime(100); // Compare with second frame

    expect(onMotionDetected).toHaveBeenCalled();
  });

  it('should stop detecting motion after calling the cleanup function', () => {
    const cleanup = detectMotion(videoElement, 20, onMotionDetected);

    vi.advanceTimersByTime(100);
    cleanup();
    vi.advanceTimersByTime(100);

    // Should only have set the first frame or captured it, but not triggered the second interval
    // Actually, setInterval is cleared, so the second call shouldn't happen.
    expect(onMotionDetected).not.toHaveBeenCalled();
  });
});
