export function advertisePeer(port: number, name: string) {
  console.info(`[LAN] ${name} is available on port ${port}.`);
}

export function discoverPeers(
  onPeerFound: (ip: string, port: number, name: string) => void
) {
  void onPeerFound;
  console.info("[LAN] Peer discovery is not wired yet; using the shared LAN URL instead.");
}
