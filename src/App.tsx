import React, { useEffect, useMemo, useRef, useState } from "react";
import PeerList from "./components/PeerList";
import VideoFeed from "./components/VideoFeed";
import { PeerViewModel, startIntercom } from "./utils/intercom";

const DEFAULT_NAME = "LAN Peer";
const CALL_ID = "intercom";
const OFFLINE_DELAY_MS = 5000;

type PresenceMode = "basic" | "loud";
type RemotePresence = "idle" | "connecting" | "connected" | "offline";

function readBoolean(key: string, fallback: boolean) {
  const value = localStorage.getItem(key);
  if (value === null) {
    return fallback;
  }
  return value === "true";
}

let audioContext: AudioContext | null = null;

function playConnectChime() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  const ctx = audioContext!;

  if (ctx.state === "suspended") {
    void ctx.resume();
  }

  const gain = ctx.createGain();
  gain.gain.value = 0.0001;
  gain.connect(ctx.destination);

  const tones = [784, 988];
  tones.forEach((frequency, index) => {
    const oscillator = ctx.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    oscillator.connect(gain);
    oscillator.start(ctx.currentTime + index * 0.12);
    oscillator.stop(ctx.currentTime + index * 0.12 + 0.08);
  });

  gain.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
}

function formatPresenceLabel(mode: PresenceMode, state: RemotePresence) {
  if (mode === "loud") {
    switch (state) {
      case "connecting":
        return "Ringing";
      case "connected":
        return "Busy";
      case "offline":
        return "Available";
      default:
        return "Available";
    }
  }

  switch (state) {
    case "connecting":
      return "Connecting to remote device";
    case "connected":
      return "Remote device connected";
    case "offline":
      return "Remote device offline";
    default:
      return "No remote device";
  }
}

export default function App() {
  const [displayName, setDisplayName] = useState(
    () => localStorage.getItem("lan-intercom:name") ?? DEFAULT_NAME
  );
  const [status, setStatus] = useState("Idle");
  const [error, setError] = useState<string | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [peers, setPeers] = useState<PeerViewModel[]>([]);
  const [running, setRunning] = useState(false);
  const [presenceMode, setPresenceMode] = useState<PresenceMode>(
    () => (localStorage.getItem("lan-intercom:presence-mode") as PresenceMode) ?? "basic"
  );
  const [autoOfflineTimeout, setAutoOfflineTimeout] = useState(() =>
    readBoolean("lan-intercom:auto-offline", true)
  );
  const [connectChime, setConnectChime] = useState(() =>
    readBoolean("lan-intercom:connect-chime", true)
  );
  const [remotePresence, setRemotePresence] = useState<RemotePresence>("idle");
  const cleanupRef = useRef<null | (() => void)>(null);
  const offlineTimerRef = useRef<number | null>(null);
  const wasConnectedRef = useRef(false);

  const signalUrl = useMemo(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${window.location.host}/signal`;
  }, []);

  const connectionState = useMemo(() => {
    const label = formatPresenceLabel(presenceMode, remotePresence);
    const tone =
      remotePresence === "connected"
        ? "live"
        : remotePresence === "connecting"
          ? "connecting"
          : "idle";

    return { label, tone };
  }, [presenceMode, remotePresence]);

  const rawPresence = useMemo<RemotePresence>(() => {
    if (!peers.length) {
      return "idle";
    }

    if (peers.some((peer) => peer.state === "connected")) {
      return "connected";
    }

    if (peers.some((peer) => peer.state === "connecting")) {
      return "connecting";
    }

    return "offline";
  }, [peers]);

  useEffect(() => {
    localStorage.setItem("lan-intercom:name", displayName);
  }, [displayName]);

  useEffect(() => {
    localStorage.setItem("lan-intercom:presence-mode", presenceMode);
  }, [presenceMode]);

  useEffect(() => {
    localStorage.setItem("lan-intercom:auto-offline", String(autoOfflineTimeout));
  }, [autoOfflineTimeout]);

  useEffect(() => {
    localStorage.setItem("lan-intercom:connect-chime", String(connectChime));
  }, [connectChime]);

  useEffect(() => {
    if (offlineTimerRef.current !== null) {
      window.clearTimeout(offlineTimerRef.current);
      offlineTimerRef.current = null;
    }

    if (rawPresence === "connected") {
      setRemotePresence("connected");
      if (!wasConnectedRef.current && connectChime) {
        playConnectChime();
      }
      wasConnectedRef.current = true;
      return;
    }

    wasConnectedRef.current = false;

    if (rawPresence === "connecting") {
      setRemotePresence("connecting");
      return;
    }

    if (rawPresence === "offline") {
      if (autoOfflineTimeout) {
        setRemotePresence("connecting");
        offlineTimerRef.current = window.setTimeout(() => {
          setRemotePresence("offline");
        }, OFFLINE_DELAY_MS);
      } else {
        setRemotePresence("offline");
      }
      return;
    }

    setRemotePresence("idle");
  }, [autoOfflineTimeout, connectChime, rawPresence]);

  useEffect(() => {
    return () => {
      if (offlineTimerRef.current !== null) {
        window.clearTimeout(offlineTimerRef.current);
      }
      cleanupRef.current?.();
    };
  }, []);

  const handleJoin = async () => {
    setError(null);
    cleanupRef.current?.();
    setRunning(true);

    try {
      cleanupRef.current = await startIntercom({
        displayName,
        roomId: CALL_ID,
        signalUrl,
        onStatus: setStatus,
        onLocalStream: setLocalStream,
        onPeersChange: setPeers,
        onError: (message) => {
          setError(message);
          setStatus(message);
          setRunning(false);
        },
      });
    } catch (nextError) {
      const message =
        nextError instanceof Error ? nextError.message : "Failed to join the intercom.";
      setError(message);
      setStatus(message);
      setRunning(false);
    }
  };

  const handleLeave = () => {
    cleanupRef.current?.();
    cleanupRef.current = null;
    setLocalStream(null);
    setPeers([]);
    setRunning(false);
    setStatus("Idle");
    setError(null);
  };

  const localFeed = localStream ? (
    <VideoFeed stream={localStream} name={`${displayName} (you)`} muted />
  ) : (
    <div className="empty-feed">
      <span>Local preview</span>
      <p>Click Join to grant camera and microphone access.</p>
    </div>
  );

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">LAN only intercom</p>
          <h1>Talk to the person in the shop without a cloud call.</h1>
          <p className="lede">
            Start the launcher on one machine, open the link on the remote device, and the app
            connects the two endpoints over a direct LAN signaling path.
          </p>
        </div>

        <div className="status-card">
          <div className={`status-pill ${running ? "live" : "idle"}`}>{status}</div>
          <div className="status-meta">
            <span>Signal: {signalUrl}</span>
            <span>Mode: direct call</span>
            <span>Remote: {connectionState.label}</span>
            <span>Peers: {peers.length}</span>
          </div>
          <div className={`presence-chip ${connectionState.tone}`}>
            <span className="presence-dot" />
            {connectionState.label}
          </div>
        </div>
      </section>

      <section className="controls">
        <label>
          Device name
          <input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="LAN Peer"
          />
        </label>

        <div className="control-actions">
          <button onClick={handleJoin} disabled={running}>
            Connect
          </button>
          <button onClick={handleLeave} className="ghost" disabled={!running}>
            Leave
          </button>
        </div>
      </section>

      <section className="settings-grid">
        <article className="feed-card">
          <div className="card-head">
            <h2>Presence options</h2>
            <span>Simple by default</span>
          </div>

          <label className="setting-row">
            <span>Presence style</span>
            <select value={presenceMode} onChange={(event) => setPresenceMode(event.target.value as PresenceMode)}>
              <option value="basic">Basic status labels</option>
              <option value="loud">Ringing / available / busy</option>
            </select>
          </label>

          <label className="setting-toggle">
            <input
              type="checkbox"
              checked={autoOfflineTimeout}
              onChange={(event) => setAutoOfflineTimeout(event.target.checked)}
            />
            <span>Auto-offline timeout</span>
          </label>

          <label className="setting-toggle">
            <input
              type="checkbox"
              checked={connectChime}
              onChange={(event) => setConnectChime(event.target.checked)}
            />
            <span>Play connect chime</span>
          </label>
        </article>
      </section>

      {error ? <div className="error-banner">{error}</div> : null}

      <section className="feeds">
        <article className="feed-card">
          <div className="card-head">
            <h2>Local feed</h2>
            <span>Your camera and microphone</span>
          </div>
          {localFeed}
        </article>

        <article className="feed-card">
          <div className="card-head">
            <h2>Remote device</h2>
            <span>The other end of the call</span>
          </div>
          <div className="peer-grid">
            {peers.length ? (
              peers.map((peer) => (
                <VideoFeed
                  key={peer.id}
                  stream={peer.stream}
                  name={peer.name}
                  muted={false}
                  badge={peer.state}
                />
              ))
            ) : (
              <div className="empty-feed">
                <span>No remote device connected yet</span>
                <p>Open the LAN URL on the other device and tap Connect.</p>
              </div>
            )}
          </div>
        </article>
      </section>

      <section className="sidebar">
        <PeerList peers={peers.slice(0, 1)} />
        <div className="hint">
          <strong>First run:</strong> if the browser shows a certificate warning, continue to the
          site so camera and microphone access can work over secure LAN HTTPS.
        </div>
      </section>
    </main>
  );
}
