import { useEffect, useRef, useState } from "react";
import AgoraRTC, { IAgoraRTCClient, ILocalAudioTrack, ILocalVideoTrack } from "agora-rtc-sdk-ng";
import { APP_ID, createClient, fetchToken } from "../agora/client";
import { getFirestore, doc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { getStorage, ref as sRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { getAuth } from "firebase/auth";
import LiveChat from "../components/LiveChat";
import AuctionPanel from "../components/AuctionPanel";

function getRoom(defaultName = "test") {
  const u = new URL(window.location.href);
  return u.searchParams.get("room") || defaultName;
}

// Helper function to capture preview from local video track
async function capturePreviewFromLocalTrack(localVideoTrack: ILocalVideoTrack): Promise<Blob | null> {
  try {
    const mediaTrack = localVideoTrack.getMediaStreamTrack?.();
    if (!mediaTrack) return null;

    const stream = new MediaStream([mediaTrack]);
    const video = document.createElement("video");
    video.playsInline = true;
    video.muted = true;
    video.srcObject = stream;

    await video.play().catch(() => {});
    await new Promise(r => setTimeout(r, 150)); // let first frame render

    const w = video.videoWidth || 640;
    const h = video.videoHeight || 360;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, w, h);
    const blob: Blob = await new Promise(res => canvas.toBlob(b => res(b!), "image/jpeg", 0.8));
    video.pause();
    return blob;
  } catch (error) {
    console.error("Preview capture failed:", error);
    return null;
  }
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
      // Enable dual-stream for low-resolution previews
      await client.enableDualStream();
      await client.setLowStreamParameter({
        width: 320,
        height: 240,
        framerate: 15,
        bitrate: 140
      });

      await client.publish([mic, cam]);

      // Firestore updates for live stream
      const db = getFirestore();
      const storage = getStorage();
      const auth = getAuth();
      const currentUser = auth.currentUser;

      const streamId = channel; // Use channel name as stream ID
      const streamRef = doc(db, "livestreams", streamId);

      // Try to capture a preview and upload it
      let previewUrl: string | null = null;
      try {
        const blob = await capturePreviewFromLocalTrack(cam);
        if (blob) {
          const fileRef = sRef(storage, `previews/${streamId}.jpg`);
          await uploadBytes(fileRef, blob, { contentType: "image/jpeg" });
          previewUrl = await getDownloadURL(fileRef);
        }
      } catch (previewError) {
        console.warn("Preview capture failed, continuing without preview:", previewError);
      }

      // Create/mark live stream doc
      await setDoc(streamRef, {
        status: "live",
        channelName: channel,
        title: channel, // Use channel name as title for now
        hostUid: currentUser?.uid || null,
        previewUrl: previewUrl || null,
        startedAt: serverTimestamp(),
      }, { merge: true });

      console.log("Stream marked as live in Firestore");
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

      // Update Firestore to mark stream as ended
      const db = getFirestore();
      const streamId = channel;
      const streamRef = doc(db, "livestreams", streamId);

      await updateDoc(streamRef, {
        status: "ended",
        endedAt: serverTimestamp(),
      });

      console.log("Stream marked as ended in Firestore");
    } catch (firestoreError) {
      console.warn("Failed to update Firestore on stream end:", firestoreError);
    } finally {
      tracksRef.current.cam?.stop(); tracksRef.current.cam?.close(); tracksRef.current.cam = undefined;
      tracksRef.current.mic?.stop(); tracksRef.current.mic?.close(); tracksRef.current.mic = undefined;
      setPublishing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Stream Area */}
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-slate-800 rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h1 className="text-2xl font-bold text-white">Live Stream</h1>
                  <p className="text-slate-300">Channel: <code className="bg-slate-700 px-2 py-1 rounded">{channel}</code></p>
                </div>
                <div className="flex space-x-3">
                  {!publishing ? (
                    <button onClick={goLive} className="px-6 py-3 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors">
                      🚀 Go Live
                    </button>
                  ) : (
                    <button onClick={stop} className="px-6 py-3 rounded-lg bg-gray-600 hover:bg-gray-700 text-white font-semibold transition-colors">
                      ⏹️ Stop Stream
                    </button>
                  )}
                </div>
              </div>

              {err && (
                <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg">
                  <p className="text-red-300">Error: {err}</p>
                </div>
              )}

              <div className="relative">
                <div ref={localRef} className="w-full h-[480px] bg-black rounded-lg overflow-hidden" />
                {!publishing && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-2xl">📹</span>
                      </div>
                      <p className="text-white text-lg">Click "Go Live" to start streaming</p>
                    </div>
                  </div>
                )}
                {publishing && (
                  <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-semibold animate-pulse">
                    🔴 LIVE
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            {/* Auction Panel */}
            <AuctionPanel roomId={channel} isHost={true} className="h-[400px]" />

            {/* Live Chat */}
            <LiveChat roomId={channel} className="h-[400px]" />
          </div>
        </div>
      </div>
    </div>
  );
}
