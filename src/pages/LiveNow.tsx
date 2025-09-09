import { useEffect, useState } from "react";
import { getFirestore, collection, query, where, onSnapshot } from "firebase/firestore";
import { Link } from "react-router-dom";

type LS = { id: string; title?: string; channelName: string; hostUid?: string; startedAt?: any };

export default function LiveNow() {
  const [rows, setRows] = useState<LS[]>([]);
  useEffect(() => {
    const db = getFirestore();
    const q = query(collection(db, "livestreams"), where("status", "==", "live"));
    const unsub = onSnapshot(q, (snap) => {
      setRows(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    });
    return () => unsub();
  }, []);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Live Now</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {rows.map(s => (
          <div key={s.id} className="border rounded-lg p-4">
            <div className="font-semibold">{s.title || s.channelName}</div>
            <div className="text-sm opacity-70">Host: {s.hostUid || "unknown"}</div>
            <Link to={`/live?room=${encodeURIComponent(s.channelName)}`} className="mt-3 inline-block px-3 py-2 rounded bg-black text-white">
              Join Stream
            </Link>
          </div>
        ))}
        {rows.length === 0 && <div>No streams are live right now.</div>}
      </div>
    </div>
  );
}
