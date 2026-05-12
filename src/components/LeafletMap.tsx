"use client";

import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Marker,
  Popup,
  Polyline,
  Circle,
  LayerGroup,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Sensor, Vessel, ANOMALIES } from "@/lib/data";
import { TriangulationResult, severityColor } from "@/lib/engine";

export type MapMode = "tactique" | "maritime" | "alertes";

const makeIcon = (color: string, shape: "square" | "diamond" | "triangle" | "circle" | "cross", size = 14) => {
  let path = "";
  if (shape === "square") path = `<rect x="2" y="2" width="${size - 4}" height="${size - 4}" fill="${color}" stroke="#fff" stroke-width="1.5"/>`;
  else if (shape === "diamond") path = `<polygon points="${size/2},2 ${size-2},${size/2} ${size/2},${size-2} 2,${size/2}" fill="${color}" stroke="#fff" stroke-width="1.5"/>`;
  else if (shape === "triangle") path = `<polygon points="${size/2},2 ${size-2},${size-2} 2,${size-2}" fill="${color}" stroke="#fff" stroke-width="1.5"/>`;
  else if (shape === "circle") path = `<circle cx="${size/2}" cy="${size/2}" r="${size/2 - 2}" fill="${color}" stroke="#fff" stroke-width="1.5"/>`;
  else if (shape === "cross")
    path = `<line x1="2" y1="2" x2="${size-2}" y2="${size-2}" stroke="${color}" stroke-width="2.5"/><line x1="${size-2}" y1="2" x2="2" y2="${size-2}" stroke="${color}" stroke-width="2.5"/>`;
  return L.divIcon({
    html: `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${path}</svg>`,
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

export function LeafletMap({
  sensors,
  vessels,
  positions,
  triangulation,
  measurements,
  focusVessel,
  mode = "tactique",
  center = [20, 0],
  zoom = 2,
}: {
  sensors: Sensor[];
  vessels: Vessel[];
  positions: Record<number, { lat: number; lon: number; aisActive: boolean }>;
  triangulation: TriangulationResult | null;
  measurements: { sensorId: string; rssi: number }[];
  focusVessel: number | null;
  mode?: MapMode;
  center?: [number, number];
  zoom?: number;
}) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ width: "100%", height: "100%" }}
      zoomControl={true}
      className={`leaflet-mode-${mode}`}
    >
      {/* MODE TACTIQUE : OSM avec filtre CSS sombre */}
      {mode === "tactique" && (
        <TileLayer
          attribution="© OpenStreetMap"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
      )}

      {/* MODE MARITIME : fond ESRI Ocean — eau sombre (#0d2d4e), terre beige clair — look carte nautique professionnel */}
      {mode === "maritime" && (
        <>
          {/* ESRI Ocean Basemap — référence utilisée par les AIS pros (MarineTraffic, VesselFinder) */}
          <TileLayer
            attribution='Tiles &copy; Esri &mdash; Sources: GEBCO, NOAA, CHS, OSU, UNH, CSUMB, National Geographic, DeLorme, NAVTEQ'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}"
            maxZoom={13}
          />
          {/* Labels villes, pays, ports par-dessus la base */}
          <TileLayer
            attribution=""
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Reference/MapServer/tile/{z}/{y}/{x}"
            maxZoom={13}
            opacity={0.9}
          />
          {/* OpenSeaMap : bouées, phares, séparations de trafic */}
          <TileLayer
            attribution="© OpenSeaMap"
            url="https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png"
            opacity={0.85}
          />
        </>
      )}

      {sensors.map((s) => {
        const color =
          s.type === "côtier" ? "#3b82f6" : s.type === "frégate" ? "#22c55e" : "#a855f7";
        const shape = s.type === "côtier" ? "square" : s.type === "frégate" ? "diamond" : "triangle";
        return (
          <LayerGroup key={s.id}>
            <Marker position={[s.lat, s.lon]} icon={makeIcon(color, shape, 16)}>
              <Popup>
                <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "#161a23" }}>
                  <b>{s.id}</b><br />
                  {s.name}<br />
                  Type: {s.type}<br />
                  Portée: {s.rangeKm} km<br />
                  État: {s.status}
                </div>
              </Popup>
            </Marker>
            <Circle
              center={[s.lat, s.lon]}
              radius={s.rangeKm * 1000}
              pathOptions={{
                color: color,
                fillColor: color,
                fillOpacity: mode === "maritime" ? 0.06 : 0.03,
                weight: 1,
                opacity: mode === "maritime" ? 0.5 : 0.3,
                dashArray: "4 6",
              }}
            />
          </LayerGroup>
        );
      })}

      {vessels.map((v) => {
        const pos = positions[v.mmsi];
        if (!pos) return null;
        const isFocus = focusVessel === v.mmsi;

        // En mode maritime/alertes : coloration par type de navire (style MarineTraffic)
        // Sur fond bleu foncé, les couleurs vives ressortent parfaitement
        const isMaritime = mode === "maritime" || mode === "alertes";
        let aisColor: string;
        if (isMaritime) {
          if (v.isSuspicious) {
            aisColor = "#ef4444"; // rouge vif suspect
          } else if (!pos.aisActive) {
            aisColor = "#64748b"; // gris ardoise AIS off
          } else {
            // Code couleur MarineTraffic par type
            const t = v.type.toLowerCase();
            if (t.includes("tanker")) aisColor = "#ef4444"; // rouge
            else if (t.includes("croisière") || t.includes("passager")) aisColor = "#3b82f6"; // bleu
            else if (t.includes("conteneur") || t.includes("cargo")) aisColor = "#10b981"; // vert
            else if (t.includes("roulier")) aisColor = "#a855f7"; // violet
            else if (t.includes("pha") || t.includes("soutien")) aisColor = "#06b6d4"; // cyan militaire
            else aisColor = "#e3e6ed"; // blanc cassé défaut
          }
        } else {
          aisColor = pos.aisActive
            ? (v.isSuspicious ? "#f97316" : "#9aa3b5")
            : "#6b7280";
        }

        // Bordure : blanche sur fond foncé pour bien détacher, bleue si focus
        const strokeColor = isFocus
          ? "#60a5fa"
          : isMaritime
          ? "#ffffff"
          : aisColor;

        return (
          <CircleMarker
            key={v.mmsi}
            center={[pos.lat, pos.lon]}
            radius={isFocus ? 9 : 6}
            pathOptions={{
              color: strokeColor,
              fillColor: aisColor,
              fillOpacity: pos.aisActive ? 0.95 : 0.5,
              weight: isFocus ? 3 : isMaritime ? 1.5 : 1.5,
            }}
          >
            <Popup>
              <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "#161a23" }}>
                <b>{v.name}</b><br />
                MMSI: {v.mmsi}<br />
                Pavillon: {v.flag}<br />
                Type: {v.type}<br />
                AIS: {pos.aisActive ? "actif" : "DÉSACTIVÉ"}
                {v.isSuspicious && (
                  <><br /><span style={{ color: "#dc2626" }}>⚠ SUSPECT</span></>
                )}
              </div>
            </Popup>
          </CircleMarker>
        );
      })}

      {triangulation &&
        measurements.map((m) => {
          const sensor = sensors.find((s) => s.id === m.sensorId);
          if (!sensor) return null;
          const isMar = mode === "maritime" || mode === "alertes";
          return (
            <Polyline
              key={m.sensorId}
              positions={[
                [sensor.lat, sensor.lon],
                [triangulation.lat, triangulation.lon],
              ]}
              pathOptions={{
                color: isMar ? "#60a5fa" : "#3b82f6",
                weight: isMar ? 1.8 : 1.2,
                opacity: isMar ? 0.8 : 0.6,
                dashArray: "3 4",
              }}
            />
          );
        })}

      {triangulation && (
        <>
          <Circle
            center={[triangulation.lat, triangulation.lon]}
            radius={triangulation.uncertaintyKm * 1000}
            pathOptions={{
              color: "#ef4444",
              fillColor: "#ef4444",
              fillOpacity: 0.12,
              weight: 1.5,
              dashArray: "5 5",
            }}
          />
          <Marker
            position={[triangulation.lat, triangulation.lon]}
            icon={makeIcon("#ef4444", "cross", 18)}
          >
            <Popup>
              <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "#161a23" }}>
                <b>POSITION RF ESTIMÉE</b><br />
                Lat: {triangulation.lat.toFixed(4)}<br />
                Lon: {triangulation.lon.toFixed(4)}<br />
                CEP: ± {triangulation.uncertaintyKm.toFixed(1)} km
              </div>
            </Popup>
          </Marker>
        </>
      )}
      {/* MODE ALERTES : zones d'anomalies par sévérité (par-dessus tout) */}
      {mode === "alertes" &&
        ANOMALIES.map((a) => {
          const colorMap: Record<string, string> = {
            critical: "#dc2626",
            high: "#f97316",
            medium: "#eab308",
            low: "#84cc16",
          };
          const radiusKm =
            a.severity === "critical"
              ? 35
              : a.severity === "high"
              ? 25
              : a.severity === "medium"
              ? 15
              : 10;
          const color = colorMap[a.severity] ?? "#9aa3b5";

          return (
            <LayerGroup key={a.id}>
              {/* Halo extérieur dégradé */}
              <Circle
                center={[a.lat, a.lon]}
                radius={radiusKm * 1000}
                pathOptions={{
                  color: color,
                  fillColor: color,
                  fillOpacity: 0.1,
                  weight: 0,
                }}
              />
              {/* Cercle intermédiaire */}
              <Circle
                center={[a.lat, a.lon]}
                radius={(radiusKm * 1000) / 2}
                pathOptions={{
                  color: color,
                  fillColor: color,
                  fillOpacity: 0.2,
                  weight: 0,
                }}
              />
              {/* Cercle dense + contour */}
              <Circle
                center={[a.lat, a.lon]}
                radius={(radiusKm * 1000) / 5}
                pathOptions={{
                  color: color,
                  fillColor: color,
                  fillOpacity: 0.45,
                  weight: 1.5,
                  opacity: 0.9,
                }}
              >
                <Popup>
                  <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "#161a23" }}>
                    <b style={{ color, textTransform: "uppercase" }}>{a.severity}</b><br />
                    {a.type}<br />
                    <b>{a.vesselName}</b><br />
                    MMSI: {a.mmsi === 0 ? "—" : a.mmsi}<br />
                    Confiance: {Math.round(a.confidence * 100)}%<br />
                    <span style={{ color: "#475569", fontSize: 10 }}>{a.source}</span>
                  </div>
                </Popup>
              </Circle>
            </LayerGroup>
          );
        })}

    </MapContainer>
  );
}
