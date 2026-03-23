import React, { useEffect, useState } from "react";
import { getClips, deleteClip } from "../utils/storage";
export default function ClipManager() {
  const [clips,setClips] = useState<{id:number,timestamp:Date}[]>([]);
  useEffect(()=>setClips(getClips()),[]);
  return (<div><h2>Recorded Clips</h2><ul>{clips.map(c=><li key={c.id}>{c.timestamp.toString()} <button onClick={()=>{deleteClip(c.id); setClips(getClips());}}>Delete</button></li>)}</ul></div>);
}