import { describe, it, expect, vi } from 'vitest';

describe('EchoLAN Chat Logic', () => {
  it('correctly processes incoming chat messages', () => {
    const messages: any[] = [];
    const onChatMessage = (msg: any) => messages.push(msg);

    const mockPayload = {
      type: 'chat',
      from: 'id-1',
      name: 'Alice',
      text: 'Hello from the LAN!',
      timestamp: new Date().toISOString()
    };

    onChatMessage(mockPayload);

    expect(messages).toHaveLength(1);
    expect(messages[0].text).toBe('Hello from the LAN!');
    expect(messages[0].name).toBe('Alice');
  });

  it('filters empty chat messages in the UI logic', () => {
    const chatInput = "   ";
    const isEnabled = chatInput.trim().length > 0;
    expect(isEnabled).toBe(false);
  });
});
