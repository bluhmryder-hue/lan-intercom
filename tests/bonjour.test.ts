import { describe, it, expect, vi } from "vitest";
import { advertisePeer, discoverPeers } from "../src/utils/bonjour";

describe("bonjour utils", () => {
  it("advertisePeer logs the correct message", () => {
    const consoleSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    advertisePeer(5173, "TestDevice");
    expect(consoleSpy).toHaveBeenCalledWith("[LAN] TestDevice is available on port 5173.");
    consoleSpy.mockRestore();
  });

  it("discoverPeers logs that it is not wired yet", () => {
    const consoleSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    const onPeerFound = vi.fn();
    discoverPeers(onPeerFound);
    expect(consoleSpy).toHaveBeenCalledWith("[LAN] Peer discovery is not wired yet; using the shared LAN URL instead.");
    expect(onPeerFound).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
