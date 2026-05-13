// Route SSE qui proxy le flux AISStream.io vers le client.
// Le client (LocalisationView) ouvre un EventSource sur /api/ais-stream, on tient
// la WebSocket côté serveur (la clé reste serveur-only) et on relaie chaque
// `PositionReport` filtré au bbox Méditerranée occidentale comme événement SSE `ais`.
//
// Évènements émis : `status` (state=connecting|open|closed), `ais` (mmsi/lat/lon/...),
// `error` (message), `ping` (heartbeat toutes les 20 s).

import type { NextRequest } from "next/server";
import WebSocket from "ws";

export const runtime = "nodejs"; // a besoin du WebSocket Node (lib `ws`)
export const dynamic = "force-dynamic";

// Méditerranée occidentale par défaut (overridable via ?bbox=lat1,lon1,lat2,lon2)
const DEFAULT_BBOX: [number, number, number, number] = [36.0, -1.0, 44.5, 12.5];

type AisOut = {
  mmsi: number;
  name: string;
  lat: number;
  lon: number;
  cog: number;
  sog: number;
  ts: string;
};

export async function GET(req: NextRequest) {
  const apiKey = process.env.AISSTREAM_API_KEY;
  if (!apiKey) {
    return new Response("AISSTREAM_API_KEY missing on server", { status: 503 });
  }

  // Parse bbox éventuel : ?bbox=lat1,lon1,lat2,lon2 (lat1<lat2, lon1<lon2)
  const url = new URL(req.url);
  const bboxParam = url.searchParams.get("bbox");
  let bbox: [number, number, number, number] = DEFAULT_BBOX;
  if (bboxParam) {
    const parts = bboxParam.split(",").map(Number);
    if (parts.length === 4 && parts.every((n) => Number.isFinite(n))) {
      bbox = parts as [number, number, number, number];
    }
  }

  const encoder = new TextEncoder();
  let ws: WebSocket | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  let aborted = false;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: string, data: unknown) => {
        if (aborted) return;
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        } catch {
          /* controller already closed */
        }
      };

      // Anti-storm : dit au navigateur d'attendre 60 s avant toute reconnexion
      // automatique d'EventSource (par défaut ~3 s) → évite d'aggraver un 429
      // AISStream en cycle.
      try {
        controller.enqueue(encoder.encode("retry: 60000\n\n"));
      } catch {}

      const cleanup = () => {
        aborted = true;
        if (heartbeat) clearInterval(heartbeat);
        try {
          ws?.close();
        } catch {}
        try {
          controller.close();
        } catch {}
      };

      send("status", { state: "connecting", bbox });

      try {
        ws = new WebSocket("wss://stream.aisstream.io/v0/stream");
      } catch (e) {
        send("error", { message: `Ouverture WebSocket impossible : ${String(e)}` });
        cleanup();
        return;
      }

      ws.on("open", () => {
        send("status", { state: "open", bbox });
        // AISStream attend [[lat1,lon1],[lat2,lon2]] (coin SO, coin NE)
        ws!.send(
          JSON.stringify({
            APIKey: apiKey,
            BoundingBoxes: [[[bbox[0], bbox[1]], [bbox[2], bbox[3]]]],
            FilterMessageTypes: ["PositionReport"],
          })
        );
      });

      ws.on("message", (data: WebSocket.RawData) => {
        if (aborted) return;
        try {
          const m = JSON.parse(data.toString());
          if (m.MessageType !== "PositionReport") return;
          const pos = m.Message?.PositionReport;
          const meta = m.MetaData || {};
          if (!pos || meta.MMSI == null) return;
          const out: AisOut = {
            mmsi: Number(meta.MMSI),
            name: String(meta.ShipName || "").trim(),
            lat: Number(pos.Latitude),
            lon: Number(pos.Longitude),
            cog: Number(pos.Cog ?? 0),
            sog: Number(pos.Sog ?? 0),
            ts: String(meta.time_utc || new Date().toISOString()),
          };
          send("ais", out);
        } catch {
          /* skip malformed frame */
        }
      });

      ws.on("close", (code: number, reason: Buffer) => {
        send("status", { state: "closed", code, reason: reason?.toString() || "" });
        cleanup();
      });

      ws.on("error", (err: Error) => {
        send("error", { message: err?.message || "Erreur WebSocket" });
      });

      // Heartbeat SSE — évite que les proxies coupent l'idle
      heartbeat = setInterval(() => send("ping", { t: Date.now() }), 20_000);

      req.signal.addEventListener("abort", cleanup);
    },
    cancel() {
      aborted = true;
      try {
        ws?.close();
      } catch {}
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
