export type PeerState = "connecting" | "connected" | "disconnected";

export interface PeerViewModel {
  id: string;
  name: string;
  stream: MediaStream | null;
  state: PeerState;
}

interface ServerPeer {
  id: string;
  name: string;
}

interface JoinedMessage {
  type: "joined";
  peerId: string;
  roomId: string;
  peers: ServerPeer[];
}

interface PeerJoinedMessage {
  type: "peer-joined";
  peer: ServerPeer;
}

interface PeerLeftMessage {
  type: "peer-left";
  peerId: string;
}

interface SignalMessage {
  type: "signal";
  from: string;
  signal: SignalPayload;
}

interface ErrorMessage {
  type: "error";
  message: string;
}

type ServerMessage =
  | JoinedMessage
  | PeerJoinedMessage
  | PeerLeftMessage
  | SignalMessage
  | ErrorMessage;

type JoinMessage = {
  type: "join";
  roomId: string;
  name: string;
};

type LeaveMessage = {
  type: "leave";
};

type SignalPayload =
  | {
      kind: "offer";
      description: RTCSessionDescriptionInit;
    }
  | {
      kind: "answer";
      description: RTCSessionDescriptionInit;
    }
  | {
      kind: "ice";
      candidate: RTCIceCandidateInit;
    };

type ClientMessage =
  | JoinMessage
  | LeaveMessage
  | {
      type: "signal";
      to: string;
      signal: SignalPayload;
    };

interface StartIntercomOptions {
  roomId: string;
  displayName: string;
  signalUrl: string;
  onStatus: (status: string) => void;
  onLocalStream: (stream: MediaStream) => void;
  onPeersChange: (peers: PeerViewModel[]) => void;
  onError: (message: string) => void;
}

function createMediaStream(): MediaStream {
  return new MediaStream();
}

function sortPeers(peers: PeerViewModel[]) {
  return [...peers].sort((a, b) => a.name.localeCompare(b.name));
}

function isOfferLike(message: SignalPayload): message is Extract<SignalPayload, { kind: "offer" }> {
  return message.kind === "offer";
}

function isAnswerLike(message: SignalPayload): message is Extract<SignalPayload, { kind: "answer" }> {
  return message.kind === "answer";
}

function isIceLike(message: SignalPayload): message is Extract<SignalPayload, { kind: "ice" }> {
  return message.kind === "ice";
}

export async function startIntercom(options: StartIntercomOptions) {
  const { roomId, displayName, signalUrl, onStatus, onLocalStream, onPeersChange, onError } = options;
  const roomName = roomId.trim() || "main";
  const localName = displayName.trim() || "Guest";
  const peers = new Map<string, PeerViewModel>();
  const peerConnections = new Map<string, RTCPeerConnection>();
  const pendingCandidates = new Map<string, RTCIceCandidateInit[]>();
  let socket: WebSocket | null = null;
  let localStream: MediaStream | null = null;
  let selfPeerId: string | null = null;
  let disposed = false;

  const syncPeers = () => {
    onPeersChange(sortPeers([...peers.values()]));
  };

  const upsertPeer = (
    peerId: string,
    peerName: string,
    patch?: Partial<PeerViewModel>
  ) => {
    const existing = peers.get(peerId);
    peers.set(peerId, {
      id: peerId,
      name: patch?.name ?? peerName ?? existing?.name ?? "Unknown",
      stream: patch?.stream ?? existing?.stream ?? null,
      state: patch?.state ?? existing?.state ?? "connecting",
    });
    syncPeers();
  };

  const removePeer = (peerId: string) => {
    const connection = peerConnections.get(peerId);
    if (connection) {
      connection.ontrack = null;
      connection.onicecandidate = null;
      connection.onconnectionstatechange = null;
      connection.close();
      peerConnections.delete(peerId);
    }
    pendingCandidates.delete(peerId);
    peers.delete(peerId);
    syncPeers();
  };

  const send = (message: ClientMessage) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return;
    }
    socket.send(JSON.stringify(message));
  };

  const flushPendingCandidates = async (peerId: string, connection: RTCPeerConnection) => {
    const candidates = pendingCandidates.get(peerId);
    if (!candidates?.length) {
      return;
    }
    pendingCandidates.delete(peerId);
    for (const candidate of candidates) {
      try {
        await connection.addIceCandidate(candidate);
      } catch (error) {
        console.warn("Failed to add queued ICE candidate", error);
      }
    }
  };

  const createConnection = (peerId: string, peerName: string) => {
    if (!localStream || !selfPeerId || peerId === selfPeerId || peerConnections.has(peerId)) {
      return peerConnections.get(peerId) ?? null;
    }

    const connection = new RTCPeerConnection({ iceServers: [] });
    const shouldInitiate = selfPeerId < peerId;

    peerConnections.set(peerId, connection);
    upsertPeer(peerId, peerName, { state: "connecting" });

    for (const track of localStream.getTracks()) {
      connection.addTrack(track, localStream);
    }

    connection.onicecandidate = (event) => {
      if (event.candidate) {
        send({
          type: "signal",
          to: peerId,
          signal: { kind: "ice", candidate: event.candidate.toJSON() },
        });
      }
    };

    connection.ontrack = (event) => {
      const [stream] = event.streams;
      const remoteStream = stream ?? createMediaStream();
      upsertPeer(peerId, peerName, {
        stream: remoteStream,
        state: "connected",
      });
    };

    connection.onconnectionstatechange = () => {
      const nextState = connection.connectionState;
      if (nextState === "connected") {
        upsertPeer(peerId, peerName, { state: "connected" });
      } else if (nextState === "failed" || nextState === "disconnected") {
        upsertPeer(peerId, peerName, { state: "disconnected" });
      }
    };

    if (shouldInitiate) {
      void (async () => {
        try {
          const offer = await connection.createOffer();
          await connection.setLocalDescription(offer);
          send({
            type: "signal",
            to: peerId,
            signal: {
              kind: "offer",
              description: connection.localDescription ?? offer,
            },
          });
        } catch (error) {
          onError(`Failed to create offer for ${peerName}.`);
          console.error(error);
        }
      })();
    }

    void flushPendingCandidates(peerId, connection);
    return connection;
  };

  const handleSignal = async (message: SignalMessage) => {
    const connection = createConnection(message.from, peers.get(message.from)?.name ?? message.from);
    if (!connection) {
      return;
    }

    if (isOfferLike(message.signal)) {
      await connection.setRemoteDescription(message.signal.description);
      const answer = await connection.createAnswer();
      await connection.setLocalDescription(answer);
      send({
        type: "signal",
        to: message.from,
        signal: {
          kind: "answer",
          description: connection.localDescription ?? answer,
        },
      });
      await flushPendingCandidates(message.from, connection);
      return;
    }

    if (isAnswerLike(message.signal)) {
      await connection.setRemoteDescription(message.signal.description);
      await flushPendingCandidates(message.from, connection);
      return;
    }

    if (isIceLike(message.signal)) {
      if (connection.remoteDescription) {
        await connection.addIceCandidate(message.signal.candidate);
      } else {
        const queue = pendingCandidates.get(message.from) ?? [];
        queue.push(message.signal.candidate);
        pendingCandidates.set(message.from, queue);
      }
    }
  };

  try {
    onStatus("Requesting camera and microphone access");
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    onLocalStream(localStream);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to access camera or microphone.";
    onError(message);
    throw error;
  }

  onStatus("Connecting to LAN signaling");
  socket = new WebSocket(signalUrl);

  socket.addEventListener("open", () => {
    if (disposed) {
      return;
    }
    send({ type: "join", roomId: roomName, name: localName });
    onStatus("Connected to signaling server");
  });

  socket.addEventListener("message", async (event) => {
    const payload = JSON.parse(event.data as string) as ServerMessage;

    if (payload.type === "joined") {
      selfPeerId = payload.peerId;
      peers.clear();
      for (const peer of payload.peers) {
        upsertPeer(peer.id, peer.name, { state: "connecting" });
        createConnection(peer.id, peer.name);
      }
      onStatus(`Joined room ${payload.roomId}`);
      return;
    }

    if (payload.type === "peer-joined") {
      upsertPeer(payload.peer.id, payload.peer.name, { state: "connecting" });
      createConnection(payload.peer.id, payload.peer.name);
      return;
    }

    if (payload.type === "peer-left") {
      removePeer(payload.peerId);
      return;
    }

    if (payload.type === "signal") {
      try {
        await handleSignal(payload);
      } catch (error) {
        console.error(error);
        onError("Failed to process signaling message.");
      }
      return;
    }

    if (payload.type === "error") {
      onError(payload.message);
    }
  });

  socket.addEventListener("close", () => {
    if (!disposed) {
      onStatus("Disconnected from signaling server");
    }
  });

  socket.addEventListener("error", () => {
    onError("WebSocket signaling failed.");
  });

  syncPeers();

  return () => {
    disposed = true;
    socket?.close();
    socket = null;

    for (const connection of peerConnections.values()) {
      connection.close();
    }
    peerConnections.clear();
    pendingCandidates.clear();
    peers.clear();
    syncPeers();

    if (localStream) {
      for (const track of localStream.getTracks()) {
        track.stop();
      }
      localStream = null;
    }
  };
}
