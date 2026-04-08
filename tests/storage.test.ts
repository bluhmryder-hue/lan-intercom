import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getClips, deleteClip, saveClip } from '../src/utils/storage';

describe('storage utils', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should return an empty array when no clips are stored', () => {
    expect(getClips()).toEqual([]);
  });

  it('should save and retrieve clips', () => {
    const clip = { id: 1, timestamp: new Date('2023-01-01T10:00:00Z') };
    saveClip(clip);

    const clips = getClips();
    expect(clips).toHaveLength(1);
    expect(clips[0].id).toBe(1);
    expect(clips[0].timestamp).toBeInstanceOf(Date);
    expect(clips[0].timestamp.toISOString()).toBe(clip.timestamp.toISOString());
  });

  it('should delete a clip by id', () => {
    const clip1 = { id: 1, timestamp: new Date('2023-01-01T10:00:00Z') };
    const clip2 = { id: 2, timestamp: new Date('2023-01-01T11:00:00Z') };
    saveClip(clip1);
    saveClip(clip2);

    deleteClip(1);

    const clips = getClips();
    expect(clips).toHaveLength(1);
    expect(clips[0].id).toBe(2);
  });

  it('should handle corrupted JSON in localStorage', () => {
    localStorage.setItem('lan-intercom-clips', 'invalid-json');
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(getClips()).toEqual([]);
    expect(consoleSpy).toHaveBeenCalled();
  });
});
