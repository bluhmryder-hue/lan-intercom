import { describe, it, expect, vi } from 'vitest';
import { advertisePeer, discoverPeers } from './bonjour';

describe('bonjour utils', () => {
  describe('advertisePeer', () => {
    it('should log the correct message when advertising a peer', () => {
      const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
      const port = 5173;
      const name = 'TestPeer';

      advertisePeer(port, name);

      expect(consoleSpy).toHaveBeenCalledWith(`[LAN] ${name} is available on port ${port}.`);
      consoleSpy.mockRestore();
    });
  });

  describe('discoverPeers', () => {
    it('should log the "not wired yet" message and not call the callback', () => {
      const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
      const onPeerFound = vi.fn();

      discoverPeers(onPeerFound);

      expect(consoleSpy).toHaveBeenCalledWith("[LAN] Peer discovery is not wired yet; using the shared LAN URL instead.");
      expect(onPeerFound).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});
