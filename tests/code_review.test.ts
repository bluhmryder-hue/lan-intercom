import { describe, it, expect } from 'vitest';
import * as storage from '../src/utils/storage';

describe('Code Review - Storage Utils', () => {
  it('has clear type definitions', () => {
    const clip: storage.Clip = { id: 1, timestamp: new Date() };
    expect(clip.id).toBe(1);
  });

  it('handles empty storage gracefully', () => {
    localStorage.clear();
    expect(storage.getClips()).toEqual([]);
  });
});
