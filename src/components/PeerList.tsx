import React from "react";
import { PeerViewModel } from "../utils/intercom";
import { Users, Wifi } from "lucide-react";

interface Props {
  peers: PeerViewModel[];
}

export default function PeerList({ peers }: Props) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-2">
          <Users size={18} className="text-echolan-600" />
          <h2 className="font-semibold text-slate-800 text-sm">Active Peers</h2>
        </div>
        <span className="bg-echolan-100 text-echolan-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
          {peers.length} Live
        </span>
      </div>
      <ul className="divide-y divide-slate-50">
        {peers.length ? (
          peers.map((peer) => (
            <li key={peer.id} className="px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full ${
                  peer.state === 'connected' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-300'
                }`} />
                <span className="text-sm font-medium text-slate-700">{peer.name}</span>
              </div>
              <Wifi size={14} className={peer.state === 'connected' ? 'text-emerald-500' : 'text-slate-300'} />
            </li>
          ))
        ) : (
          <li className="px-4 py-8 text-center text-slate-400 text-sm italic">
            No devices discovered on LAN
          </li>
        )}
      </ul>
    </div>
  );
}
