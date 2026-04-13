import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getClips, saveClip, deleteClip, Clip } from '../src/utils/storage';

describe('storage utility', () => {
  const STORAGE_KEY = 'lan-intercom-clips';

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should return an empty array when storage is empty', () => {
    const clips = getClips();
    expect(clips).toEqual([]);
  });

  it('should save and retrieve clips', () => {
    const mockClip: Clip = {
      id: 1,
      timestamp: new Date('2024-01-01T12:00:00Z')
    };

    saveClip(mockClip);
    const clips = getClips();

    expect(clips).toHaveLength(1);
    expect(clips[0].id).toBe(1);
    expect(clips[0].timestamp).toBeInstanceOf(Date);
    expect(clips[0].timestamp.toISOString()).toBe(mockClip.timestamp.toISOString());
  });

  it('should handle multiple clips', () => {
    const clip1: Clip = { id: 1, timestamp: new Date() };
    const clip2: Clip = { id: 2, timestamp: new Date() };

    saveClip(clip1);
    saveClip(clip2);

    const clips = getClips();
    expect(clips).toHaveLength(2);
    expect(clips.map(c => c.id)).toContain(1);
    expect(clips.map(c => c.id)).toContain(2);
  });

  it('should delete a clip by id', () => {
    const clip1: Clip = { id: 1, timestamp: new Date() };
    const clip2: Clip = { id: 2, timestamp: new Date() };

    saveClip(clip1);
    saveClip(clip2);

    deleteClip(1);

    const clips = getClips();
    expect(clips).toHaveLength(1);
    expect(clips[0].id).toBe(2);
  });

  it('should handle malformed JSON in localStorage gracefully', () => {
    localStorage.setItem(STORAGE_KEY, 'invalid-json');

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const clips = getClips();

    expect(clips).toEqual([]);
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('should handle storage not being an array gracefully', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ not: 'an-array' }));

    const clips = getClips();
    expect(clips).toEqual([]);
  });
});
