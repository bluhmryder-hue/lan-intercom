export interface Clip {
  id: number;
  timestamp: Date;
}

const STORAGE_KEY = 'lan-intercom-clips';

export function getClips(): Clip[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];

    return parsed.map((clip: any) => ({
      ...clip,
      timestamp: new Date(clip.timestamp)
    }));
  } catch (error) {
    console.error('Failed to get clips from storage:', error);
    return [];
  }
}

export function saveClip(clip: Clip): void {
  try {
    const clips = getClips();
    clips.push(clip);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clips));
  } catch (error) {
    console.error('Failed to save clip to storage:', error);
  }
}

export function deleteClip(id: number): void {
  try {
    const clips = getClips();
    const filtered = clips.filter(c => c.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    console.log(`Deleted clip ${id}`);
  } catch (error) {
    console.error('Failed to delete clip from storage:', error);
  }
}
