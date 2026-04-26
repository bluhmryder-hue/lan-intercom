import React, { useState, useEffect, useRef } from "react";
import {
  Shield,
  User, Send,
  Monitor,
  LogOut,
  MessageSquare,
  Files,
  Settings,
  Bell,
  Activity,
  MicOff,
  VideoOff,
  Menu,
  X
} from "lucide-react";
import {
  startIntercom,
  PeerViewModel
} from "./utils/intercom";
import PeerList from "./components/PeerList";
import VideoFeed from "./components/VideoFeed";

export default function App() {
  const [displayName, setDisplayName] = useState(
    localStorage.getItem("echolan-name") || "Guest"
  );
  const [running, setRunning] = useState(false);
  const [peers, setPeers] = useState<PeerViewModel[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("offline");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [intercomInstance, setIntercomInstance] = useState<any>(null);
  const stopIntercomRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    localStorage.setItem("echolan-name", displayName);
  }, [displayName]);

  const handleJoin = async () => {
    try {
      setError(null);
      setStatus("scanning");

      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const signalUrl = `${protocol}//${window.location.host}/signal`;

      const stop = await startIntercom({
        roomId: "main",
        displayName: displayName,
        signalUrl: signalUrl,
        onStatus: (s) => setStatus(s),
        onLocalStream: (stream) => setLocalStream(stream),
        onChatMessage: (msg) => {
          setMessages(prev => [...prev, msg]);
        },
        onPeersChange: (updatedPeers) => {
          setPeers([...updatedPeers]);
        },
        onError: (err) => {
          setError(err);
          handleLeave();
        }
      });

      stopIntercomRef.current = stop;
      setRunning(true);
      setIntercomInstance(instance);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect");
      setStatus("offline");
    }
  };

  const handleLeave = () => {
    if (stopIntercomRef.current) {
      stopIntercomRef.current();
      stopIntercomRef.current = null;
    }
    setLocalStream(null);
    setPeers([]);
    if (intercomInstance) {
      intercomInstance.destroy();
      setIntercomInstance(null);
    }
    setRunning(false);
    setStatus("offline");
    setSidebarOpen(false);
  };

  const remotePresence = peers.some(p => p.state === 'connected') ? 'connected' : 'idle';

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      {/* Top Navigation */}
      <nav className="h-16 bg-white border-b border-slate-200 px-4 md:px-6 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
          >
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <div className="w-8 h-8 bg-echolan-600 rounded-lg flex items-center justify-center text-white shadow-md shadow-echolan-200">
            <Shield size={20} />
          </div>
          <span className="font-bold text-lg md:text-xl tracking-tight text-slate-800">EchoLAN</span>
        </div>

        <div className="hidden md:flex items-center gap-6">
          <a href="#" className="text-sm font-semibold text-echolan-600 border-b-2 border-echolan-600 py-5">Dashboard</a>
          <a href="#" className="text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors">Messages</a>
          <a href="#" className="text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors">Files</a>
          <a href="#" className="text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors">Settings</a>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full text-slate-600">
            <Activity size={14} className={running ? "text-emerald-500 animate-pulse" : "text-slate-400"} />
            <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider">{status}</span>
          </div>
          <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors hidden sm:block">
            <Bell size={20} />
          </button>
        </div>
      </nav>

      <main className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-slate-900/50 z-40 md:hidden backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Left Sidebar */}
        <aside className={`
          fixed inset-y-0 left-0 z-40 w-72 bg-white border-r border-slate-200 p-6 flex flex-col gap-8 overflow-y-auto transition-transform duration-300 ease-in-out
          md:translate-x-0 md:static md:w-80
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
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
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-3 text-sm focus:ring-2 focus:ring-echolan-500 focus:border-transparent outline-none transition-all font-medium"
                  placeholder="Set device name..."
                />
              </div>

              {!running ? (
                <button
                  onClick={handleJoin}
                  className="w-full bg-echolan-600 hover:bg-echolan-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-echolan-100 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <Wifi size={18} />
                  Connect to LAN
                </button>
              ) : (
                <button
                  onClick={handleLeave}
                  className="w-full bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold py-3.5 rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <LogOut size={18} />
                  Disconnect
                </button>
              )}
            </div>
          </section>

          <PeerList peers={peers} />

          <section className="mt-auto hidden md:block">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-xs text-slate-500 leading-relaxed italic">
                <strong>First run?</strong> If you see a certificate warning, click 'Advanced' and proceed. Camera/Mic require HTTPS.
              </p>
            </div>
          </section>
        </aside>

        {/* Content Area */}
        <section className="flex-1 p-4 md:p-8 bg-slate-50 overflow-y-auto">
          {error && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl flex items-center gap-3">
              <Shield size={20} className="shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-8">
            {/* Local Feed */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Monitor size={20} className="text-slate-400" />
                  <h2 className="font-bold text-slate-800">Local Environment</h2>
                </div>
                <div className="flex items-center gap-1">
                  <button className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-echolan-600 hover:bg-slate-50 transition-all shadow-sm active:scale-95">
                    <MicOff size={18} />
                  </button>
                  <button className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-echolan-600 hover:bg-slate-50 transition-all shadow-sm active:scale-95">
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
                <div className="flex flex-col gap-4">
                  {peers.map(peer => (
                    <VideoFeed
                      key={peer.id}
                      stream={peer.stream}
                      name={peer.name}
                      badge={peer.state}
                      className="shadow-2xl shadow-slate-200 border-4 border-white"
                    />
                  ))}
                </div>
              ) : (
                <div className="aspect-video bg-white rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center p-6 md:p-8 text-center">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4">
                    <Wifi size={32} />
                  </div>
                  <h4 className="font-bold text-slate-700 mb-2">Awaiting Peer</h4>
                  <p className="text-xs md:text-sm text-slate-500 max-w-xs mx-auto leading-relaxed">
                    Once another device on the LAN connects, their encrypted media feed will appear here automatically.
                  </p>
                </div>
              )}
            </div>
          </div>

                    {/* Local Chatroom Section */}
          <section className="mt-12 mb-8 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[500px]">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-echolan-50 rounded-lg text-echolan-600">
                  <MessageSquare size={20} />
                </div>
                <h3 className="font-bold text-slate-800">LAN Chatroom</h3>
              </div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {messages.length} Messages
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
              {messages.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-2">
                  <MessageSquare size={32} className="opacity-20" />
                  <p className="text-sm italic">No messages yet. Say hello to the LAN!</p>
                </div>
              ) : (
                messages.map((msg, i) => (
                  <div key={i} className={`flex flex-col ${msg.name === displayName ? "items-end" : "items-start"}`}>
                    <div className="flex items-center gap-2 mb-1 px-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">{msg.name}</span>
                      <span className="text-[10px] text-slate-400">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className={`px-4 py-2 rounded-2xl max-w-[80%] text-sm shadow-sm ${
                      msg.name === displayName
                        ? "bg-echolan-600 text-white rounded-tr-none"
                        : "bg-slate-100 text-slate-700 rounded-tl-none"
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-slate-100">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!chatInput.trim() || !intercomInstance) return;
                  intercomInstance.sendChatMessage(chatInput.trim());
                  setChatInput('');
                }}
                className="flex gap-2"
              >
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  disabled={!running}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-echolan-500 transition-all disabled:opacity-50"
                  placeholder={running ? "Type a message..." : "Connect to join the chat..."}
                />
                <button
                  type="submit"
                  disabled={!running || !chatInput.trim()}
                  className="p-2.5 bg-echolan-600 text-white rounded-xl hover:bg-echolan-700 transition-all disabled:opacity-50 disabled:grayscale"
                >
                  <Send size={20} />
                </button>
              </form>
            </div>
          </section>
              <div>
                <h4 className="font-bold text-slate-800">Local Chat</h4>
                <p className="text-xs text-slate-500 font-medium">Text, Emoji, Commands</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 group hover:border-echolan-300 transition-all cursor-pointer active:scale-[0.98]">
              <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600 group-hover:scale-110 transition-transform">
                <Files size={24} />
              </div>
              <div>
                <h4 className="font-bold text-slate-800">P2P Files</h4>
                <p className="text-xs text-slate-500 font-medium">Send up to 2GB Securely</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 group hover:border-echolan-300 transition-all cursor-pointer active:scale-[0.98] sm:col-span-2 lg:col-span-1">
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
