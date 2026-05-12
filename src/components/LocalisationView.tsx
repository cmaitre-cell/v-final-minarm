"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { SENSORS, VESSELS, VESSEL_POSITIONS } from "@/lib/data";
import { REAL_VESSELS } from "@/lib/real-data";
import { isAtSea } from "@/lib/sea-filter";
import { triangulate, haversine, fmtMmsi } from "@/lib/engine";
import { Crosshair, Radio, Satellite, Ship } from "lucide-react";
import { Globe3D } from "./Globe3D";

// Ne garder que les navires dont la position est en mer
const SEA_VESSELS = REAL_VESSELS.filter((v) => isAtSea(v.lat, v.lon));

// Conversion → format Vessel + positions attendus par LeafletMap
const REAL_VESSEL_LIST = SEA_VESSELS.map((v) => ({
  mmsi: v.mmsi,
  imo: 0,
  name: v.name,
  flag: v.flag,
  type: v.type,
  length: 0,
  width: 0,
  yearBuilt: 0,
  destination: v.destination,
  historicalNames: [] as string[],
  isSuspicious: v.isSuspicious,
  freqMean: v.freqMean,
  freqStd: 0,
  bandwidthMean: 25,
  powerMean: 300,
  signalStrengthMean: v.signalMean,
  snrMean: 20,
  dominantModulation: "DSC" as const,
  dominantPulse: "Long-Short-Long",
  nSignatures: 1,
}));

const REAL_POSITIONS = Object.fromEntries(
  SEA_VESSELS.map((v) => [
    v.mmsi,
    { lat: v.lat, lon: v.lon, speed: v.speed, course: v.course, aisActive: v.aisActive },
  ])
);

// Leaflet doit être chargé en client uniquement
const LeafletMap = dynamic(() => import("./LeafletMap").then((m) => m.LeafletMap), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-ink-900 flex items-center justify-center text-steel-400 text-xs">
      Initialisation cartographie...
    </div>
  ),
});

type MapMode = "tactique" | "maritime" | "alertes";

const DEMO_MEASUREMENTS = [
  { sensorId: "STN-TLN-01", rssi: -78 },
  { sensorId: "STN-MRS-01", rssi: -82 },
  { sensorId: "STN-AJC-01", rssi: -91 },
  { sensorId: "FRG-FREMM-AQT", rssi: -75 },
];

export function LocalisationView() {
  const [measurements, setMeasurements] = useState(DEMO_MEASUREMENTS);
  const [emittedPower, setEmittedPower] = useState(54.77);
  const [selectedVessel, setSelectedVessel] = useState<number | null>(273456120);
  const [mapMode, setMapMode] = useState<MapMode>("tactique");

  const result = useMemo(
    () =>
      triangulate({
        measurements,
        emittedPowerDbm: emittedPower,
      }),
    [measurements, emittedPower]
  );

  // Comparaison écart AIS vs triangulation pour le navire sélectionné
  const aisGap = useMemo(() => {
    if (!selectedVessel || !result) return null;
    const pos = VESSEL_POSITIONS[selectedVessel];
    if (!pos) return null;
    return {
      aisLat: pos.lat,
      aisLon: pos.lon,
      gap: haversine(pos.lat, pos.lon, result.lat, result.lon),
    };
  }, [selectedVessel, result]);

  return (
    <div className="grid grid-cols-12 gap-4 p-6 bg-white min-h-[calc(100vh-130px)]">
      {/* === Colonne gauche : carte === */}
      <div className="col-span-9 flex flex-col gap-4">
        <div className="panel rounded-sm overflow-hidden flex-1 min-h-[600px] flex flex-col">
          <div className="px-4 py-3 border-b border-ink-700 flex items-center justify-between gap-4">
            <div>
              <h2 className="section-title">Carte opérationnelle — Méditerranée occidentale</h2>
              <div className="label-tag mt-0.5">
                Triangulation RF multilatération · Capteurs DGA
              </div>
            </div>

            {/* Toggle mode carte — segmented control moderne */}
            <div className="flex items-center gap-3">
              <span className="label-tag">Vue</span>
              <div
                style={{
                  display: "flex", background: "#EAECEF", borderRadius: 10,
                  padding: 3, gap: 2, border: "1px solid #D0D3D9",
                }}
              >
                {(["tactique", "maritime", "alertes"] as const).map((mode) => {
                  const isActive = mapMode === mode;
                  const labels = { tactique: "Tactique", maritime: "Maritime", alertes: "Alertes" };
                  const isAlert = mode === "alertes";
                  return (
                    <button
                      type="button"
                      key={mode}
                      onClick={() => setMapMode(mode)}
                      style={{
                        padding: "6px 14px",
                        fontSize: 11,
                        fontFamily: "JetBrains Mono, monospace",
                        fontWeight: isActive ? 700 : 500,
                        letterSpacing: "0.04em",
                        color: isActive
                          ? isAlert ? "#CE0500" : "#000091"
                          : "#636878",
                        background: isActive ? "#fff" : "transparent",
                        border: isActive
                          ? isAlert ? "1px solid #CE050030" : "1px solid #00009130"
                          : "1px solid transparent",
                        borderRadius: 7,
                        cursor: "pointer",
                        display: "flex", alignItems: "center", gap: 6,
                        boxShadow: isActive ? "0 1px 4px rgba(0,0,0,0.12)" : "none",
                        transition: "all 0.15s",
                      }}
                    >
                      {isAlert && (
                        <span style={{
                          width: 6, height: 6, borderRadius: "50%",
                          background: isActive ? "#CE0500" : "rgba(206,5,0,0.4)",
                        }}
                        className={isActive ? "animate-pulse_dot" : ""}
                        />
                      )}
                      {labels[mode]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-4 text-[10px] font-mono">
              {mapMode === "alertes" ? (
                <>
                  <span className="label-tag text-alert-critical">Globe mondial</span>
                  <Legend color="#dc2626" label="Critique" icon="circle" />
                  <Legend color="#f97316" label="Élevée"   icon="circle" />
                  <Legend color="#eab308" label="Moyenne"  icon="circle" />
                  <Legend color="#84cc16" label="Faible"   icon="circle" />
                  <span className="text-steel-400 text-[10px] font-mono ml-1">· Anneaux = alertes actives</span>
                </>
              ) : (
                <>
                  <Legend color="#3b82f6" label="Capteur côtier" icon="square" />
                  <Legend color="#22c55e" label="Frégate" icon="diamond" />
                  <Legend color="#a855f7" label="Satellite" icon="triangle" />
                  <Legend color="#9aa3b5" label="Navire AIS" icon="circle" />
                  <Legend color="#ef4444" label="Position RF estimée" icon="cross" />
                </>
              )}
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-hidden relative">
            {mapMode === "alertes" ? (
              <Globe3D key="globe-alertes" />
            ) : (
              <LeafletMap
                key={mapMode}
                sensors={SENSORS}
                vessels={REAL_VESSEL_LIST}
                positions={REAL_POSITIONS}
                triangulation={result}
                measurements={measurements}
                focusVessel={selectedVessel}
                mode={mapMode}
                center={[20, 0]}
                zoom={2}
              />
            )}
          </div>
        </div>

        {/* Tableau capteurs avec mesures */}
        <div className="panel rounded-sm">
          <div className="px-4 py-3 border-b border-ink-700">
            <h3 className="section-title">Mesures des capteurs — signal cible</h3>
            <div className="label-tag mt-0.5">
              RSSI mesuré → distance estimée par path loss
            </div>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-ink-700 text-steel-400">
                <th className="px-3 py-2 text-left label-tag font-normal">ID</th>
                <th className="px-3 py-2 text-left label-tag font-normal">Capteur</th>
                <th className="px-3 py-2 text-right label-tag font-normal">RSSI (dBm)</th>
                <th className="px-3 py-2 text-right label-tag font-normal">
                  Distance estimée
                </th>
                <th className="px-3 py-2 text-center label-tag font-normal">
                  Contribution
                </th>
              </tr>
            </thead>
            <tbody>
              {result?.sensorsUsed.map((u) => {
                const weight = 1 / Math.max(u.estimatedDistanceKm ** 2, 0.01);
                const totalW = result.sensorsUsed.reduce(
                  (s, x) => s + 1 / Math.max(x.estimatedDistanceKm ** 2, 0.01),
                  0
                );
                const contribution = (weight / totalW) * 100;
                return (
                  <tr key={u.sensor.id} className="border-b border-ink-700/50">
                    <td className="px-3 py-2 font-mono text-steel-300">
                      {u.sensor.id}
                    </td>
                    <td className="px-3 py-2 text-steel-200">{u.sensor.name}</td>
                    <td className="px-3 py-2 text-right font-mono text-steel-100">
                      {u.rssi}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-signal">
                      {u.estimatedDistanceKm.toFixed(1)} km
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1 bg-ink-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-signal/70"
                            style={{ width: `${contribution}%` }}
                          />
                        </div>
                        <span className="font-mono text-[10px] text-steel-400 w-10 text-right">
                          {contribution.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* === Colonne droite : contrôles & résultats === */}
      <aside className="col-span-3 space-y-4">
        <div className="panel-elevated rounded-sm">
          <div className="px-4 py-3 border-b border-ink-700 flex items-center gap-2">
            <Crosshair className="w-4 h-4 text-signal" />
            <h3 className="section-title">Triangulation</h3>
          </div>

          {/* Résultat principal */}
          {result && (
            <div className="px-4 py-3 border-b border-ink-700 bg-ink-800/30">
              <div className="label-tag mb-2">Position estimée</div>
              <div className="font-mono text-sm text-steel-100 tabular-nums">
                {result.lat.toFixed(4)}° N
              </div>
              <div className="font-mono text-sm text-steel-100 tabular-nums">
                {result.lon.toFixed(4)}° E
              </div>
              <div className="mt-2 pt-2 border-t border-ink-700 flex justify-between">
                <span className="label-tag">CEP</span>
                <span className="font-mono text-xs text-alert-medium">
                  ± {result.uncertaintyKm.toFixed(1)} km
                </span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="label-tag">Capteurs</span>
                <span className="font-mono text-xs text-steel-200">
                  {result.sensorsUsed.length}
                </span>
              </div>
            </div>
          )}

          {/* Comparaison AIS */}
          <div className="px-4 py-3 border-b border-ink-700">
            <div className="label-tag mb-2">Comparer à un navire AIS</div>
            <select
              value={selectedVessel ?? ""}
              onChange={(e) => setSelectedVessel(parseInt(e.target.value))}
              className="w-full bg-ink-700 border border-ink-600 rounded-sm text-xs text-steel-200 px-2 py-1.5"
            >
              <option value="">— Sélectionner —</option>
              {VESSELS.map((v) => (
                <option key={v.mmsi} value={v.mmsi}>
                  {v.name} ({v.flag})
                </option>
              ))}
            </select>
            {aisGap && (
              <div
                className={`mt-3 p-2 rounded-sm border ${
                  aisGap.gap > 5
                    ? "bg-alert-critical/10 border-alert-critical/40"
                    : aisGap.gap > 1
                    ? "bg-alert-medium/10 border-alert-medium/40"
                    : "bg-alert-nominal/10 border-alert-nominal/40"
                }`}
              >
                <div className="label-tag mb-1">Écart AIS ↔ RF</div>
                <div
                  className={`font-mono text-lg ${
                    aisGap.gap > 5
                      ? "text-alert-critical"
                      : aisGap.gap > 1
                      ? "text-alert-medium"
                      : "text-alert-nominal"
                  }`}
                >
                  {aisGap.gap.toFixed(2)} km
                </div>
                <div className="text-[10px] text-steel-400 mt-1 leading-relaxed">
                  {aisGap.gap > 5
                    ? "Écart critique — spoofing AIS probable."
                    : aisGap.gap > 1
                    ? "Écart notable, à investiguer."
                    : "Cohérence nominale."}
                </div>
              </div>
            )}
          </div>

          {/* Sliders RSSI */}
          <div className="px-4 py-3 border-b border-ink-700">
            <div className="label-tag mb-3">Mesures RSSI par capteur</div>
            {measurements.map((m, idx) => {
              const sensor = SENSORS.find((s) => s.id === m.sensorId);
              return (
                <div key={m.sensorId} className="mb-3 last:mb-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-steel-300 truncate">
                      {sensor?.name}
                    </span>
                    <span className="font-mono text-[10px] text-signal">
                      {m.rssi} dBm
                    </span>
                  </div>
                  <input
                    type="range"
                    min={-110}
                    max={-50}
                    value={m.rssi}
                    onChange={(e) => {
                      const newM = [...measurements];
                      newM[idx] = { ...m, rssi: parseInt(e.target.value) };
                      setMeasurements(newM);
                    }}
                    className="w-full h-1 bg-ink-700 accent-signal"
                  />
                </div>
              );
            })}
          </div>

          {/* Puissance émise */}
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-1">
              <span className="label-tag">Puissance émise estimée</span>
              <span className="font-mono text-[10px] text-signal">
                {emittedPower.toFixed(1)} dBm
              </span>
            </div>
            <input
              type="range"
              min={30}
              max={70}
              step={0.1}
              value={emittedPower}
              onChange={(e) => setEmittedPower(parseFloat(e.target.value))}
              className="w-full h-1 bg-ink-700 accent-signal"
            />
            <div className="flex justify-between text-[9px] font-mono text-steel-400 mt-1">
              <span>30 dBm (1 W)</span>
              <span>70 dBm (10 kW)</span>
            </div>
          </div>
        </div>

        {/* Notice méthodo */}
        <div className="panel rounded-sm px-4 py-3 text-[11px] text-steel-400 leading-relaxed">
          <div className="label-tag mb-2 text-steel-300">Méthode</div>
          Path loss en espace libre :{" "}
          <span className="font-mono text-steel-200">
            PL = 32.45 + 20·log₁₀(f) + 20·log₁₀(d)
          </span>
          <br />
          Position = barycentre pondéré par 1/d² des capteurs.
          <br />
          CEP ≈ moyenne des distances ÷ 4.
        </div>
      </aside>
    </div>
  );
}

function Legend({
  color,
  label,
  icon,
}: {
  color: string;
  label: string;
  icon: string;
}) {
  return (
    <span className="flex items-center gap-1.5 text-steel-400">
      <span
        className="inline-block w-2.5 h-2.5"
        style={{
          background: color,
          borderRadius: icon === "circle" ? "50%" : icon === "square" ? "2px" : 0,
          clipPath:
            icon === "diamond"
              ? "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)"
              : icon === "triangle"
              ? "polygon(50% 0%, 100% 100%, 0% 100%)"
              : icon === "cross"
              ? "polygon(40% 0%, 60% 0%, 60% 40%, 100% 40%, 100% 60%, 60% 60%, 60% 100%, 40% 100%, 40% 60%, 0% 60%, 0% 40%, 40% 40%)"
              : "none",
        }}
      />
      {label}
    </span>
  );
}
