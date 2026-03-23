import React from "react";
import { PeerViewModel } from "../utils/intercom";

interface Props {
  peers: PeerViewModel[];
}

export default function PeerList({ peers }: Props) {
  return (
    <aside className="peer-list">
      <h2>Connected device</h2>
      <ul>
        {peers.length ? (
          peers.slice(0, 1).map((peer) => (
            <li key={peer.id}>
              <span className="peer-name">
                <span className={`peer-dot ${peer.state}`} />
                {peer.name}
              </span>
              <em>{peer.state}</em>
            </li>
          ))
        ) : (
          <li className="muted">No device connected yet</li>
        )}
      </ul>
    </aside>
  );
}
