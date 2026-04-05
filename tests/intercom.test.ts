import { describe, it, expect } from "vitest";
import { sortPeers, PeerViewModel } from "../src/utils/intercom";

describe("Intercom Utility Functions", () => {
  it("sorts peers correctly by name", () => {
    const peers: PeerViewModel[] = [
      { id: "1", name: "Zebra", stream: null, state: "connected" },
      { id: "2", name: "Alpha", stream: null, state: "connecting" },
      { id: "3", name: "Beta", stream: null, state: "disconnected" },
    ];

    const sorted = sortPeers(peers);

    expect(sorted[0].name).toBe("Alpha");
    expect(sorted[1].name).toBe("Beta");
    expect(sorted[2].name).toBe("Zebra");
  });

  it("handles empty arrays", () => {
    const sorted = sortPeers([]);
    expect(sorted).toEqual([]);
  });
});
