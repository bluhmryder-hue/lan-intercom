export interface Clip {
  id: number;
  timestamp: Date;
}

const STORAGE_KEY = 'lan-intercom-clips';

export function getClips(): Clip[] {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return [];
  try {
    const parsed = JSON.parse(stored);
    return parsed.map((c: any) => ({
      ...c,
      timestamp: new Date(c.timestamp)
    }));
  } catch (e) {
    console.error("Failed to parse clips from storage", e);
    return [];
  }
}

export function saveClip(clip: Clip) {
  const clips = getClips();
  clips.push(clip);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(clips));
}

export function deleteClip(id: number) {
  const clips = getClips();
  const filtered = clips.filter(c => c.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  console.log(`Deleted clip ${id}`);
}
