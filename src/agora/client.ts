import AgoraRTC, { IAgoraRTCClient } from "agora-rtc-sdk-ng";
export const APP_ID = import.meta.env.VITE_AGORA_APP_ID as string;

export function createClient(): IAgoraRTCClient {
  return AgoraRTC.createClient({ mode: "live", codec: "vp8" });
}

export async function fetchToken(channel: string, role: "publisher" | "audience") {
  const url = import.meta.env.VITE_TOKEN_SERVER_URL;
  if (!url) throw new Error("Missing VITE_TOKEN_SERVER_URL");
  const res = await fetch(`${url}?channel=${encodeURIComponent(channel)}&role=${role}`);
  if (!res.ok) throw new Error(`Token server error ${res.status}`);
  return res.json() as Promise<{ token: string; exp: number }>;
}
