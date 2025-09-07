import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pkg from "agora-access-token";
const { RtcRole, RtcTokenBuilder } = pkg;

dotenv.config();
const app = express();
app.use(cors());

const APP_ID = process.env.AGORA_APP_ID;
const APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE;

app.get("/agora/token", (req, res) => {
  try {
    const channel = req.query.channel;
    if (!channel) return res.status(400).json({ error: "channel required" });

    const roleParam = String(req.query.role || "audience");
    const role = roleParam === "publisher" ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;

    const ttl = 2 * 60 * 60; // 2h
    const exp = Math.floor(Date.now() / 1000) + ttl;

    if (!APP_ID || !APP_CERTIFICATE) {
      return res.status(500).json({ error: "Missing AGORA_APP_ID or AGORA_APP_CERTIFICATE" });
    }

    const token = RtcTokenBuilder.buildTokenWithUid(APP_ID, APP_CERTIFICATE, channel, 0, role, exp);
    res.json({ token, exp });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "token generation failed" });
  }
});

const PORT = process.env.TOKEN_PORT || 3002;
app.listen(PORT, () => console.log(`🔑 Token server on http://localhost:${PORT}`));
