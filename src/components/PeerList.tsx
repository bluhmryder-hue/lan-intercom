import React from "react";
import { PeerViewModel } from "../utils/intercom";
import { Users, Wifi } from "lucide-react";

interface Props {
  peers: PeerViewModel[];
}

export default function PeerList({ peers }: Props) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-2">
          <Users size={18} className="text-echolan-600" />
          <h2 className="font-bold text-slate-800 text-sm">Active Peers</h2>
        </div>
        <span className="bg-echolan-100 text-echolan-700 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
          {peers.length} Live
        </span>
      </div>
      <ul className="divide-y divide-slate-50">
        {peers.length ? (
          peers.map((peer) => (
            <li key={peer.id} className="px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-all cursor-pointer active:bg-slate-100">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${
                  peer.state === 'connected' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-300'
                }`} />
                <span className="text-sm font-semibold text-slate-700">{peer.name}</span>
              </div>
              <Wifi size={16} className={peer.state === 'connected' ? 'text-emerald-500' : 'text-slate-300'} />
            </li>
          ))
        ) : (
          <li className="px-5 py-10 text-center text-slate-400 text-sm italic">
            <div className="flex flex-col items-center gap-2">
              <Users size={24} className="opacity-20" />
              <p>No devices discovered</p>
            </div>
          </li>
        )}
      </ul>
    </div>
  );
}
