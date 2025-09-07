import { useEffect, useRef, useState } from "react";
import AgoraRTC, { IAgoraRTCClient, ILocalAudioTrack, ILocalVideoTrack } from "agora-rtc-sdk-ng";
import { APP_ID, createClient, fetchToken } from "../agora/client";

function getRoom(defaultName = "test") {
  const u = new URL(window.location.href);
  return u.searchParams.get("room") || defaultName;
}

export default function Streamer() {
  const channel = getRoom();
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const localRef = useRef<HTMLDivElement>(null);
  const tracksRef = useRef<{ mic?: ILocalAudioTrack; cam?: ILocalVideoTrack }>({});

  useEffect(() => {
    clientRef.current = createClient();
    return () => {
      (async () => {
        try {
          await clientRef.current?.unpublish().catch(() => {});
          await clientRef.current?.leave().catch(() => {});
        } finally {
          tracksRef.current.cam?.stop(); tracksRef.current.cam?.close();
          tracksRef.current.mic?.stop(); tracksRef.current.mic?.close();
        }
      })();
    };
  }, []);

  const goLive = async () => {
    try {
      setErr(null);
      const client = clientRef.current!;
      await client.setClientRole("host");
      const { token } = await fetchToken(channel, "publisher");
      await client.join(APP_ID, channel, token || null, null);
      const [mic, cam] = await AgoraRTC.createMicrophoneAndCameraTracks();
      tracksRef.current.mic = mic; tracksRef.current.cam = cam;
      if (localRef.current) cam.play(localRef.current);
      await client.publish([mic, cam]);
      setPublishing(true);
    } catch (e: any) {
      console.error(e); setErr(e?.message || String(e));
    }
  };

  const stop = async () => {
    try {
      const client = clientRef.current!;
      await client.unpublish().catch(() => {});
      await client.leave().catch(() => {});
    } finally {
      tracksRef.current.cam?.stop(); tracksRef.current.cam?.close(); tracksRef.current.cam = undefined;
      tracksRef.current.mic?.stop(); tracksRef.current.mic?.close(); tracksRef.current.mic = undefined;
      setPublishing(false);
    }
  };

  return (
    <div className="p-6 space-y-3">
      <h1 className="text-2xl font-bold">Streamer</h1>
      <p>Channel: <code>{channel}</code> (use <code>?room=foo</code> to change)</p>
      {!publishing ? (
        <button onClick={goLive} className="px-4 py-2 rounded bg-black text-white">Go Live</button>
      ) : (
        <button onClick={stop} className="px-4 py-2 rounded bg-red-600 text-white">Stop</button>
      )}
      {err && <div className="text-red-600">Error: {err}</div>}
      <div className="mt-3">
        <div className="text-sm opacity-70">Local preview</div>
        <div ref={localRef} className="w-[640px] h-[360px] bg-black rounded" />
      </div>
    </div>
  );
}
