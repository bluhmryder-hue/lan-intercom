export interface Peer { id:string; name:string; stream:MediaStream }
export async function initializePeers(onPeersUpdated:(peers:Peer[])=>void) {
  const localStream = await navigator.mediaDevices.getUserMedia({video:true,audio:true});
  const discoveredPeers:Peer[] = [];
  onPeersUpdated([{id:"local",name:"You",stream:localStream}, ...discoveredPeers]);
}