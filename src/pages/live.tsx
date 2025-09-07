import { useEffect, useRef, useState } from "react";
import type { IAgoraRTCClient, IAgoraRTCRemoteUser, IRemoteVideoTrack, IRemoteAudioTrack } from "agora-rtc-sdk-ng";
import { APP_ID, createClient, fetchToken } from "../agora/client";

function getRoom(defaultName = "test") {
  const u = new URL(window.location.href);
  return u.searchParams.get("room") || defaultName;
}

export default function Live() {
  const channel = getRoom();
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const videoRef = useRef<HTMLDivElement>(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [videoReady, setVideoReady] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const joinTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const client = createClient();
    clientRef.current = client;

    const onUserPublished = async (user: IAgoraRTCRemoteUser, type: "video" | "audio") => {
      try {
        await client.subscribe(user, type);
        if (type === "video" && user.videoTrack && videoRef.current) {
          (user.videoTrack as IRemoteVideoTrack).play(videoRef.current);
          setVideoReady(true);
          setIsConnecting(false);
        }
        if (type === "audio" && user.audioTrack) (user.audioTrack as IRemoteAudioTrack).play();
      } catch (e: any) {
        console.error(e); setErr(e?.message || String(e));
      }
    };
    const onUserUnpublished = () => { setVideoReady(false); setIsConnecting(true); };

    client.on("user-published", onUserPublished);
    client.on("user-unpublished", onUserUnpublished);

    (async () => {
      try {
        setErr(null);
        await client.setClientRole("audience");
        const { token } = await fetchToken(channel, "audience");
        await client.join(APP_ID, channel, token || null, null);

        // Subscribe to already-published users
        for (const u of client.remoteUsers) {
          if (u.hasVideo && u.videoTrack && videoRef.current) {
            await client.subscribe(u, "video");
            u.videoTrack.play(videoRef.current);
            setVideoReady(true);
            setIsConnecting(false);
          }
          if (u.hasAudio && u.audioTrack) u.audioTrack.play();
        }

        // Safety: hide overlay after 4s even if events are slow (but video should show)
        if (joinTimerRef.current) window.clearTimeout(joinTimerRef.current);
        joinTimerRef.current = window.setTimeout(() => {
          if (isConnecting && !videoReady) setIsConnecting(false);
        }, 4000);
      } catch (e: any) {
        console.error(e); setErr(e?.message || String(e)); setIsConnecting(false);
      }
    })();

    return () => {
      client.off("user-published", onUserPublished);
      client.off("user-unpublished", onUserUnpublished);
      (async () => { try { await clientRef.current?.leave(); } catch {} })();
      if (joinTimerRef.current) window.clearTimeout(joinTimerRef.current);
      joinTimerRef.current = null;
    };
  }, [channel]);

  return (
    <div className="p-6 space-y-3">
      <h1 className="text-2xl font-bold">Viewer</h1>
      <p>Channel: <code>{channel}</code> (use <code>?room=foo</code> to change)</p>

      {isConnecting && !videoReady && (
        <div className="inline-flex px-3 py-2 rounded bg-black text-white">Please wait while we establish a connection…</div>
      )}
      {err && <div className="text-red-600">Error: {err}</div>}

      <div ref={videoRef} className="w-[640px] h-[360px] bg-black rounded" />
      <div className="text-sm opacity-70">Connecting: {String(isConnecting)} · VideoReady: {String(videoReady)}</div>
    </div>
  );
}
