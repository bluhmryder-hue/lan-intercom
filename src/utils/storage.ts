/**
 * EchoLAN Persistent Storage Utility
 * Handles browser-side chat history and settings with TTL.
 */

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  type: 'text' | 'file';
  fileName?: string;
  fileSize?: number;
}

const STORAGE_KEY_MESSAGES = "echolan:messages";
const STORAGE_KEY_TTL = "echolan:chat-ttl"; // in hours

export function saveMessage(message: Message) {
  const messages = getMessages();
  messages.push(message);
  localStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(messages));
  applyTTL();
}

export function getMessages(): Message[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY_MESSAGES);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function setTTL(hours: number) {
  localStorage.setItem(STORAGE_KEY_TTL, hours.toString());
  applyTTL();
}

export function getTTL(): number {
  const val = localStorage.getItem(STORAGE_KEY_TTL);
  return val ? parseInt(val, 10) : 24; // Default 24 hours
}

export function applyTTL() {
  const ttlHours = getTTL();
  if (ttlHours === 0) return; // 0 means keep forever

  const now = Date.now();
  const threshold = now - (ttlHours * 60 * 60 * 1000);

  const messages = getMessages();
  const filtered = messages.filter(m => m.timestamp > threshold);

  if (filtered.length !== messages.length) {
    localStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(filtered));
  }
}

export function clearMessages() {
  localStorage.removeItem(STORAGE_KEY_MESSAGES);
}
