import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from 'vitest';
import { advertisePeer, discoverPeers } from '../src/utils/bonjour';

describe('bonjour utils', () => {
  let consoleSpy: MockInstance;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('advertisePeer', () => {
    it('should log that the peer is available with the correct name and port', () => {
      const port = 5173;
      const name = 'TestPeer';
      advertisePeer(port, name);

      expect(consoleSpy).toHaveBeenCalledWith(`[LAN] ${name} is available on port ${port}.`);
    });
  });

  describe('discoverPeers', () => {
    it('should log that peer discovery is not wired yet', () => {
      const onPeerFound = vi.fn();
      discoverPeers(onPeerFound);

      expect(consoleSpy).toHaveBeenCalledWith('[LAN] Peer discovery is not wired yet; using the shared LAN URL instead.');
    });

    it('should not call the onPeerFound callback', () => {
      const onPeerFound = vi.fn();
      discoverPeers(onPeerFound);

      expect(onPeerFound).not.toHaveBeenCalled();
    });
  });
});
