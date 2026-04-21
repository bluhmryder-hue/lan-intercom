import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Settings,
  Video,
  VideoOff,
  Mic,
  MicOff,
  MessageSquare,
  Files,
  LogOut,
  Monitor,
  Bell,
  Shield,
  Activity,
  User
} from "lucide-react";
import { startIntercom, PeerViewModel } from "./utils/intercom";
import VideoFeed from "./components/VideoFeed";
import PeerList from "./components/PeerList";

const DEFAULT_NAME = "LAN Peer";
const CALL_ID = "main";
const OFFLINE_DELAY_MS = 2000;

type PresenceMode = "basic" | "loud";
type RemotePresence = "idle" | "connecting" | "connected" | "offline";

function readBoolean(key: string, defaultValue: boolean): boolean {
  const value = localStorage.getItem(key);
  return value === null ? defaultValue : value === "true";
}

export default function App() {
  const [displayName, setDisplayName] = useState(
    () => localStorage.getItem("echolan:name") ?? DEFAULT_NAME
  );
  const [status, setStatus] = useState("Idle");
  const [error, setError] = useState<string | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [peers, setPeers] = useState<PeerViewModel[]>([]);
  const [running, setRunning] = useState(false);
  const [presenceMode, setPresenceMode] = useState<PresenceMode>(
    () => (localStorage.getItem("echolan:presence-mode") as PresenceMode) ?? "basic"
  );
  const [autoOfflineTimeout, setAutoOfflineTimeout] = useState(() =>
    readBoolean("echolan:auto-offline", true)
  );
  const [connectChime, setConnectChime] = useState(() =>
    readBoolean("echolan:connect-chime", true)
  );
  const [remotePresence, setRemotePresence] = useState<RemotePresence>("idle");
  const cleanupRef = useRef<null | (() => void)>(null);
  const offlineTimerRef = useRef<number | null>(null);

  const signalUrl = useMemo(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${window.location.host}/signal`;
  }, []);

  useEffect(() => {
    localStorage.setItem("echolan:name", displayName);
  }, [displayName]);

  useEffect(() => {
    localStorage.setItem("echolan:presence-mode", presenceMode);
  }, [presenceMode]);

  useEffect(() => {
    localStorage.setItem("echolan:auto-offline", String(autoOfflineTimeout));
  }, [autoOfflineTimeout]);

  useEffect(() => {
    localStorage.setItem("echolan:connect-chime", String(connectChime));
  }, [connectChime]);

  const rawPresence = useMemo<RemotePresence>(() => {
    if (!peers.length) return "idle";
    if (peers.some((peer) => peer.state === "connected")) return "connected";
    if (peers.some((peer) => peer.state === "connecting")) return "connecting";
    return "offline";
  }, [peers]);

  useEffect(() => {
    if (offlineTimerRef.current !== null) {
      window.clearTimeout(offlineTimerRef.current);
      offlineTimerRef.current = null;
    }

    if (rawPresence === "connected") {
      setRemotePresence("connected");
      return;
    }

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
  }, [autoOfflineTimeout, rawPresence]);

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
      const message = nextError instanceof Error ? nextError.message : "Failed to join.";
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

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Top Navigation */}
      <nav className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-echolan-600 rounded-lg flex items-center justify-center text-white shadow-md shadow-echolan-200">
            <Shield size={20} />
          </div>
          <span className="font-bold text-xl tracking-tight text-slate-800">EchoLAN</span>
        </div>

        <div className="hidden md:flex items-center gap-6">
          <a href="#" className="text-sm font-semibold text-echolan-600 border-b-2 border-echolan-600 py-5">Dashboard</a>
          <a href="#" className="text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors">Messages</a>
          <a href="#" className="text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors">Files</a>
          <a href="#" className="text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors">Settings</a>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full text-slate-600">
            <Activity size={14} className={running ? "text-emerald-500 animate-pulse" : "text-slate-400"} />
            <span className="text-xs font-bold uppercase tracking-wider">{status}</span>
          </div>
          <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
            <Bell size={20} />
          </button>
        </div>
      </nav>

      <main className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left Sidebar */}
        <aside className="w-full md:w-80 bg-white border-r border-slate-200 p-6 flex flex-col gap-8 overflow-y-auto">
          <section>
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Device Identity</h3>
            <div className="flex flex-col gap-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User size={16} />
                </div>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-10 pr-3 text-sm focus:ring-2 focus:ring-echolan-500 focus:border-transparent outline-none transition-all font-medium"
                  placeholder="Set device name..."
                />
              </div>

              {!running ? (
                <button
                  onClick={handleJoin}
                  className="w-full bg-echolan-600 hover:bg-echolan-700 text-white font-bold py-2.5 rounded-lg shadow-lg shadow-echolan-100 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <Wifi size={18} />
                  Connect to LAN
                </button>
              ) : (
                <button
                  onClick={handleLeave}
                  className="w-full bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold py-2.5 rounded-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <LogOut size={18} />
                  Disconnect
                </button>
              )}
            </div>
          </section>

          <PeerList peers={peers} />

          <section className="mt-auto">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-xs text-slate-500 leading-relaxed italic">
                <strong>First run?</strong> If you see a certificate warning, click 'Advanced' and proceed. Camera/Mic require HTTPS.
              </p>
            </div>
          </section>
        </aside>

        {/* Content Area */}
        <section className="flex-1 p-6 md:p-8 bg-slate-50 overflow-y-auto">
          {error && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl flex items-center gap-3">
              <Shield size={20} className="shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Local Feed */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Monitor size={20} className="text-slate-400" />
                  <h2 className="font-bold text-slate-800">Local Environment</h2>
                </div>
                <div className="flex items-center gap-1">
                  <button className="p-2 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-echolan-600 transition-colors">
                    <MicOff size={18} />
                  </button>
                  <button className="p-2 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-echolan-600 transition-colors">
                    <VideoOff size={18} />
                  </button>
                </div>
              </div>
              <VideoFeed
                stream={localStream}
                name={`${displayName} (You)`}
                muted
                className="shadow-2xl shadow-slate-200 border-4 border-white"
              />
            </div>

            {/* Remote Feed */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity size={20} className="text-slate-400" />
                  <h2 className="font-bold text-slate-800">Remote Peer</h2>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <span className={`w-2 h-2 rounded-full ${remotePresence === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                  {remotePresence === 'connected' ? 'Secure Link Active' : 'Offline'}
                </div>
              </div>
              {peers.length > 0 ? (
                peers.map(peer => (
                  <VideoFeed
                    key={peer.id}
                    stream={peer.stream}
                    name={peer.name}
                    badge={peer.state}
                    className="shadow-2xl shadow-slate-200 border-4 border-white"
                  />
                ))
              ) : (
                <div className="aspect-video bg-white rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center p-8 text-center">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4">
                    <Wifi size={32} />
                  </div>
                  <h4 className="font-bold text-slate-700 mb-2">Awaiting Peer</h4>
                  <p className="text-sm text-slate-500 max-w-xs mx-auto leading-relaxed">
                    Once another device on the LAN connects, their encrypted media feed will appear here automatically.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions / Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 group hover:border-echolan-300 transition-colors cursor-pointer">
              <div className="p-3 bg-echolan-50 rounded-xl text-echolan-600 group-hover:scale-110 transition-transform">
                <MessageSquare size={24} />
              </div>
              <div>
                <h4 className="font-bold text-slate-800">Local Chat</h4>
                <p className="text-xs text-slate-500 font-medium">Text, Emoji, Commands</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 group hover:border-echolan-300 transition-colors cursor-pointer">
              <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600 group-hover:scale-110 transition-transform">
                <Files size={24} />
              </div>
              <div>
                <h4 className="font-bold text-slate-800">P2P Files</h4>
                <p className="text-xs text-slate-500 font-medium">Send up to 2GB Securely</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 group hover:border-echolan-300 transition-colors cursor-pointer">
              <div className="p-3 bg-amber-50 rounded-xl text-amber-600 group-hover:scale-110 transition-transform">
                <Settings size={24} />
              </div>
              <div>
                <h4 className="font-bold text-slate-800">Advanced</h4>
                <p className="text-xs text-slate-500 font-medium">mDNS, RTC, Codecs</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

// Added missing Wifi icon
function Wifi({ size, className }: { size?: number, className?: string }) {
  return (
    <svg
      width={size ?? 24}
      height={size ?? 24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M5 13a10 10 0 0 1 14 0" />
      <path d="M8.5 16.5a5 5 0 0 1 7 0" />
      <path d="M2 8a15 15 0 0 1 20 0" />
      <line x1="12" x2="12.01" y1="20" y2="20" />
    </svg>
  );
}
