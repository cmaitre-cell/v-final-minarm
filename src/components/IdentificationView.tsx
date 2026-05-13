"use client";

import { useState, useMemo } from "react";
import {
  RADIO_PROFILES,
  CLUSTER_DATA,
  FLAG_PROFILES,
  ML_FLAG_GLOBAL_MEAN,
  ML_META,
  ML_PRESETS,
  ML_KMEANS_ELBOW,
  ML_SILENT_SHIPS,
  ML_TOP_OUTLIERS,
} from "@/lib/data";
import {
  identifyVessel,
  fmtMmsi,
  SignatureInput,
  IdentificationResult,
} from "@/lib/engine";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  ReferenceLine,
  ComposedChart,
  Line,
  Cell,
} from "recharts";
import { Search, Zap, AlertCircle, CheckCircle2 } from "lucide-react";

// Presets = signatures RF réelles extraites de radio_signatures_large.csv
// (cf. sujet3/scripts/export_dashboard_ml.py). On garde la vérité terrain
// (_trueMmsi / _trueName / _trueRank) à part pour l'afficher après l'identification.
type PresetMeta = {
  trueMmsi: number;
  trueName: string;
  trueFlag: string;
  trueRank: number | null;
  signatureId: string;
};
const PRESET_LABELS: Record<string, string> = {
  sig_match: "signature identifiable",
  sig_suspect: "navire signalé suspect",
  sig_nominal: "signature courante",
  sig_atypique: "signature atypique",
};
const PRESETS: Record<string, SignatureInput> = Object.fromEntries(
  Object.entries(ML_PRESETS).map(([k, p]) => [
    k,
    {
      frequency: p.frequency,
      bandwidth: p.bandwidth,
      power: p.power,
      modulation: p.modulation as SignatureInput["modulation"],
      pulsePattern: p.pulsePattern,
    },
  ])
);
const PRESET_META: Record<string, PresetMeta> = Object.fromEntries(
  Object.entries(ML_PRESETS).map(([k, p]) => [
    k,
    {
      trueMmsi: p._trueMmsi,
      trueName: p._trueName,
      trueFlag: p._trueFlag,
      trueRank: p._trueRank ?? null,
      signatureId: p._signatureId,
    },
  ])
);

// Profils affichés dans le tableau : top navires par nombre de signatures captées.
const TOP_PROFILES = [...RADIO_PROFILES]
  .sort((a, b) => b.nSignatures - a.nSignatures)
  .slice(0, 30);

function samePreset(a: SignatureInput, b?: SignatureInput) {
  return (
    !!b &&
    a.frequency === b.frequency &&
    a.bandwidth === b.bandwidth &&
    a.power === b.power &&
    a.modulation === b.modulation &&
    a.pulsePattern === b.pulsePattern
  );
}

export function IdentificationView() {
  const [presetKey, setPresetKey] = useState<string>("sig_match");
  const [input, setInputState] = useState<SignatureInput>(PRESETS.sig_match);
  const [results, setResults] = useState<IdentificationResult[] | null>(null);
  const [resultMeta, setResultMeta] = useState<PresetMeta | null>(null);

  // Toute modification manuelle « casse » l'association à un preset (plus de vérité terrain).
  const setInput = (next: SignatureInput) => {
    setInputState(next);
    if (!samePreset(next, PRESETS[presetKey])) setPresetKey("");
  };
  const applyPreset = (key: string) => {
    setPresetKey(key);
    setInputState(PRESETS[key]);
    setResults(null);
    setResultMeta(null);
  };

  const runIdentification = () => {
    setResults(identifyVessel(input, 5, RADIO_PROFILES));
    setResultMeta(samePreset(input, PRESETS[presetKey]) ? PRESET_META[presetKey] ?? null : null);
  };

  const clusterColors = ["#3b82f6", "#22c55e", "#eab308", "#f97316", "#a855f7"];

  return (
    <div className="grid grid-cols-12 gap-4 p-6 bg-white min-h-[calc(100vh-130px)] fade-in-stagger">
      {/* === COLONNE GAUCHE : profils & visualisations === */}
      <div className="col-span-8 space-y-4">
        {/* En-tête métier */}
        <div className="panel rounded-sm px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="section-title">Base de profils radio</h2>
              <div className="label-tag mt-0.5">
                Empreinte RF agrégée — {ML_META.nProfiled} navires profilés ·{" "}
                {ML_META.nSignatures.toLocaleString("fr-FR")} signatures (radio_signatures_large.csv)
              </div>
            </div>
            <div className="flex gap-2">
              <Metric label="Bande" value={`${ML_META.freqMin}-${ML_META.freqMax}`} unit="MHz" />
              <Metric label="K-Means" value={`K=${ML_META.kmeansK}`} />
              <Metric label="Silhouette" value={ML_META.silhouette.toFixed(3)} />
              <Metric label="Combos mod×pulse×bande" value={`${ML_META.nUniqueCombos}`} />
            </div>
          </div>
        </div>

        {/* Grille de KPI métier */}
        <div className="grid grid-cols-2 gap-4">
          {/* Scatter clusters */}
          <div className="panel rounded-sm">
            <div className="px-4 py-3 border-b border-ink-700">
              <h3 className="section-title">Clusters K-Means · fréquence × puissance</h3>
              <div className="label-tag mt-0.5">
                K={ML_META.kmeansK} (imposé) · StandardScaler + KMeans++ · {ML_META.nProfiled} navires
                — silhouette {ML_META.silhouette.toFixed(3)}, WCSS {Math.round(ML_META.wcss)}
              </div>
            </div>
            <div className="p-3 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
                  <CartesianGrid stroke="#E5E5E5" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="freq"
                    name="Fréquence"
                    unit=" MHz"
                    tick={{ fill: "#777777", fontSize: 10, fontFamily: "JetBrains Mono" }}
                    domain={[156, 162.5]}
                    stroke="#CCCCCC"
                  />
                  <YAxis
                    dataKey="power"
                    name="Puissance"
                    unit=" W"
                    tick={{ fill: "#777777", fontSize: 10, fontFamily: "JetBrains Mono" }}
                    stroke="#CCCCCC"
                  />
                  <ZAxis range={[24, 24]} />
                  <Tooltip
                    contentStyle={{
                      background: "#FFFFFF",
                      border: "1px solid #DDDDDD",
                      fontSize: 11,
                      fontFamily: "JetBrains Mono",
                      color: "#161616",
                    }}
                    cursor={{ stroke: "#000091", strokeDasharray: "3 3" }}
                  />
                  {[0, 1, 2, 3, 4].map((c) => (
                    <Scatter
                      key={c}
                      name={`Cluster ${c}`}
                      data={CLUSTER_DATA.filter((d) => d.cluster === c)}
                      fill={clusterColors[c]}
                      fillOpacity={0.55}
                    />
                  ))}
                </ScatterChart>
              </ResponsiveContainer>
            </div>
            <div className="px-4 py-2 border-t border-ink-700 flex items-center gap-3 text-[10px] font-mono text-steel-400">
              <Legend color={clusterColors[0]} label="C0" />
              <Legend color={clusterColors[1]} label="C1" />
              <Legend color={clusterColors[2]} label="C2" />
              <Legend color={clusterColors[3]} label="C3" />
              <Legend color={clusterColors[4]} label="C4" />
              <span className="ml-auto">silhouette ≈ 0,22 → familles RF peu séparées (jeu synthétique)</span>
            </div>
          </div>

          {/* Stats par pavillon */}
          <div className="panel rounded-sm">
            <div className="px-4 py-3 border-b border-ink-700">
              <h3 className="section-title">Fréquence moyenne par pavillon (Q10)</h3>
              <div className="label-tag mt-0.5">
                10 pavillons · {FLAG_PROFILES.reduce((s, f) => s + f.n, 0).toLocaleString("fr-FR")} signatures —
                trait pointillé = moyenne globale {ML_FLAG_GLOBAL_MEAN.toFixed(2)} MHz
              </div>
            </div>
            <div className="p-3 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={FLAG_PROFILES} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid stroke="#E5E5E5" strokeDasharray="3 3" horizontal={false} />
                  <XAxis
                    type="number"
                    domain={[158.5, 159.5]}
                    allowDataOverflow
                    tick={{ fill: "#777777", fontSize: 10, fontFamily: "JetBrains Mono" }}
                    stroke="#CCCCCC"
                  />
                  <YAxis
                    type="category"
                    dataKey="flag"
                    tick={{ fill: "#555555", fontSize: 10 }}
                    width={100}
                    stroke="#CCCCCC"
                  />
                  <Tooltip
                    formatter={(v: number) => [`${v.toFixed(3)} MHz`, "f̄"]}
                    contentStyle={{
                      background: "#FFFFFF",
                      border: "1px solid #DDDDDD",
                      fontSize: 11,
                      color: "#161616",
                    }}
                  />
                  <ReferenceLine x={ML_FLAG_GLOBAL_MEAN} stroke="#000091" strokeDasharray="4 3" />
                  <Bar dataKey="meanFreq" radius={[0, 2, 2, 0]}>
                    {FLAG_PROFILES.map((d, i) => (
                      <Cell
                        key={i}
                        fill={Math.abs(d.meanFreq - ML_FLAG_GLOBAL_MEAN) > 0.08 ? "#f97316" : "#3b82f6"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="px-4 py-2 border-t border-ink-700 text-[10px] font-mono text-steel-400">
              Tous les pavillons tiennent dans ±0,15 MHz : la fréquence seule ne discrimine pas
              le pavillon → la détection de faux pavillon (Q4) repose sur la distance de Mahalanobis
              multivariée (fréquence × bande × puissance × modulation).
            </div>
          </div>
        </div>

        {/* Choix de K — méthode du coude + silhouette */}
        <div className="panel rounded-sm">
          <div className="px-4 py-3 border-b border-ink-700">
            <h3 className="section-title">Choix de K — méthode du coude &amp; silhouette</h3>
            <div className="label-tag mt-0.5">
              WCSS et silhouette pour K ∈ [2, 10] — K = {ML_META.kmeansK} imposé par l'énoncé ·
              silhouette plate ≈ 0,21–0,22 → optimum mou, on l'assume
            </div>
          </div>
          <div className="p-3 h-44">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={[...ML_KMEANS_ELBOW]} margin={{ top: 8, right: 30, bottom: 6, left: 0 }}>
                <CartesianGrid stroke="#E5E5E5" strokeDasharray="3 3" />
                <XAxis
                  dataKey="k"
                  tick={{ fill: "#777777", fontSize: 10, fontFamily: "JetBrains Mono" }}
                  stroke="#CCCCCC"
                  label={{ value: "K", position: "insideBottom", offset: -2, fill: "#777777", fontSize: 10 }}
                />
                <YAxis
                  yAxisId="wcss"
                  tick={{ fill: "#9AA3B5", fontSize: 10, fontFamily: "JetBrains Mono" }}
                  stroke="#CCCCCC"
                  width={50}
                />
                <YAxis
                  yAxisId="sil"
                  orientation="right"
                  domain={[0.19, 0.24]}
                  tickFormatter={(v: number) => v.toFixed(2)}
                  tick={{ fill: "#000091", fontSize: 10, fontFamily: "JetBrains Mono" }}
                  stroke="#000091"
                  width={42}
                />
                <Tooltip
                  contentStyle={{
                    background: "#FFFFFF",
                    border: "1px solid #DDDDDD",
                    fontSize: 11,
                    fontFamily: "JetBrains Mono",
                    color: "#161616",
                  }}
                  formatter={(v: number, name: string) => [
                    name === "silhouette" ? v.toFixed(3) : Math.round(v).toLocaleString("fr-FR"),
                    name === "wcss" ? "WCSS (inertie)" : "Silhouette",
                  ]}
                  labelFormatter={(k) => `K = ${k}`}
                />
                <ReferenceLine
                  x={ML_META.kmeansK}
                  yAxisId="sil"
                  stroke="#000091"
                  strokeDasharray="4 3"
                  label={{ value: `K=${ML_META.kmeansK}`, position: "top", fill: "#000091", fontSize: 10 }}
                />
                <Line
                  yAxisId="wcss"
                  type="monotone"
                  dataKey="wcss"
                  name="wcss"
                  stroke="#9AA3B5"
                  strokeWidth={1.5}
                  dot={{ r: 2.5, fill: "#9AA3B5" }}
                  isAnimationActive={false}
                />
                <Line
                  yAxisId="sil"
                  type="monotone"
                  dataKey="silhouette"
                  name="silhouette"
                  stroke="#000091"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "#000091" }}
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="px-4 py-2 border-t border-ink-700 flex items-center gap-4 text-[10px] font-mono text-steel-400">
            <span><span className="inline-block w-3 h-0.5 align-middle mr-1" style={{ background: "#9AA3B5" }} />WCSS (inertie intra-cluster, axe gauche)</span>
            <span><span className="inline-block w-3 h-0.5 align-middle mr-1" style={{ background: "#000091" }} />Silhouette (axe droit)</span>
            <span className="ml-auto">à K=5 : WCSS {Math.round(ML_META.wcss).toLocaleString("fr-FR")} · silhouette {ML_META.silhouette.toFixed(3)}</span>
          </div>
        </div>

        {/* Top aberrants RF — distance au centroïde K-Means */}
        <div className="panel rounded-sm">
          <div className="px-4 py-3 border-b border-ink-700 flex items-center justify-between">
            <div>
              <h3 className="section-title">
                Top {ML_TOP_OUTLIERS.length} aberrants RF — empreintes les plus éloignées de leur famille
              </h3>
              <div className="label-tag mt-0.5">
                Distance euclidienne au centroïde K-Means (espace standardisé) — proxy d'« atypique » :
                candidats prioritaires pour l'analyse, alimente le score de suspicion (S/04)
              </div>
            </div>
            <span className="label-tag">
              {ML_TOP_OUTLIERS.filter((v) => v.isSuspicious).length}/{ML_TOP_OUTLIERS.length} déjà suspects
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-ink-700 text-steel-400">
                  <th className="px-3 py-2 text-left label-tag font-normal">#</th>
                  <th className="px-3 py-2 text-left label-tag font-normal">Nom</th>
                  <th className="px-3 py-2 text-left label-tag font-normal">MMSI</th>
                  <th className="px-3 py-2 text-left label-tag font-normal">Pavillon</th>
                  <th className="px-3 py-2 text-left label-tag font-normal">Type</th>
                  <th className="px-3 py-2 text-center label-tag font-normal">Cluster</th>
                  <th className="px-3 py-2 text-left label-tag font-normal">Distance au centroïde</th>
                  <th className="px-3 py-2 text-center label-tag font-normal">Marquage</th>
                </tr>
              </thead>
              <tbody>
                {ML_TOP_OUTLIERS.map((v, i) => {
                  const maxD = ML_TOP_OUTLIERS[0]?.distanceToCentroid || 1;
                  const w = (v.distanceToCentroid / maxD) * 100;
                  const cColor = clusterColors[v.cluster] ?? "#9AA3B5";
                  return (
                    <tr
                      key={v.mmsi}
                      className={`border-b border-ink-700/50 hover:bg-ink-800/50 transition ${
                        v.isSuspicious ? "bg-alert-critical/[0.04]" : ""
                      }`}
                    >
                      <td className="px-3 py-2 font-mono text-steel-400">#{i + 1}</td>
                      <td className="px-3 py-2 text-steel-100">{v.name}</td>
                      <td className="px-3 py-2 font-mono text-steel-300">{fmtMmsi(v.mmsi)}</td>
                      <td className="px-3 py-2 text-steel-300">{v.flag}</td>
                      <td className="px-3 py-2 text-steel-300">{v.type}</td>
                      <td className="px-3 py-2 text-center">
                        <span
                          className="text-[10px] font-mono px-1.5 py-0.5 rounded-sm"
                          style={{
                            background: `${cColor}22`,
                            color: cColor,
                            border: `1px solid ${cColor}55`,
                          }}
                        >
                          C{v.cluster}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div
                            className="flex-1 h-1.5 rounded-full overflow-hidden"
                            style={{ background: "#E5E5E5", minWidth: 60 }}
                          >
                            <div className="h-full" style={{ width: `${w}%`, background: "#000091" }} />
                          </div>
                          <span
                            className="font-mono text-[11px] text-steel-200 tabular-nums"
                            style={{ minWidth: 36, textAlign: "right" }}
                          >
                            {v.distanceToCentroid.toFixed(2)}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-center">
                        {v.isSuspicious ? (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 bg-alert-critical/15 border border-alert-critical/40 text-alert-critical rounded-sm">
                            SUSPECT
                          </span>
                        ) : (
                          <span className="text-[10px] text-steel-400">nominal</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 border-t border-ink-700 text-[10px] font-mono text-steel-400">
            Centroïdes K-Means calculés dans l'espace standardisé (fréquence × bande × puissance) — distance ≳ 3 = signal d'atypicité significatif.
          </div>
        </div>

        {/* Navires jamais entendus */}
        <div className="panel rounded-sm">
          <div className="px-4 py-3 border-b border-ink-700 flex items-center justify-between">
            <div>
              <h3 className="section-title">
                Navires « jamais entendus » — {ML_SILENT_SHIPS.length} bâtiments du registre sans aucune signature RF
              </h3>
              <div className="label-tag mt-0.5">
                Présents dans ships_large.csv, absents de ship_radio_profiles.csv (radio_mmsi_orphans = 0,
                ships_without_radio = {ML_SILENT_SHIPS.length}) — signal de suspicion en soi : un navire qui
                n'émet jamais alors qu'il navigue est anormal
              </div>
            </div>
            <span className="label-tag">
              {ML_SILENT_SHIPS.filter((s) => s.isSuspicious).length} suspect{ML_SILENT_SHIPS.filter((s) => s.isSuspicious).length > 1 ? "s" : ""}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-ink-700 text-steel-400">
                  <th className="px-3 py-2 text-left label-tag font-normal">Nom</th>
                  <th className="px-3 py-2 text-left label-tag font-normal">MMSI</th>
                  <th className="px-3 py-2 text-left label-tag font-normal">Pavillon</th>
                  <th className="px-3 py-2 text-left label-tag font-normal">Type</th>
                  <th className="px-3 py-2 text-left label-tag font-normal">Destination</th>
                  <th className="px-3 py-2 text-center label-tag font-normal">Année</th>
                  <th className="px-3 py-2 text-center label-tag font-normal">Marquage</th>
                </tr>
              </thead>
              <tbody>
                {ML_SILENT_SHIPS.map((s) => (
                  <tr
                    key={s.mmsi}
                    className={`border-b border-ink-700/50 hover:bg-ink-800/50 transition ${
                      s.isSuspicious ? "bg-alert-critical/[0.04]" : ""
                    }`}
                  >
                    <td className="px-3 py-2 text-steel-100 flex items-center gap-2">
                      {s.isSuspicious && <span className="w-1.5 h-1.5 rounded-full bg-alert-critical" />}
                      {s.name}
                    </td>
                    <td className="px-3 py-2 font-mono text-steel-300">{fmtMmsi(s.mmsi)}</td>
                    <td className="px-3 py-2 text-steel-300">{s.flag}</td>
                    <td className="px-3 py-2 text-steel-300">{s.type}</td>
                    <td className="px-3 py-2 text-steel-300">{s.destination || "—"}</td>
                    <td className="px-3 py-2 text-center font-mono text-steel-400">{s.yearBuilt || "—"}</td>
                    <td className="px-3 py-2 text-center">
                      {s.isSuspicious ? (
                        <span className="text-[9px] font-mono px-1.5 py-0.5 bg-alert-critical/15 border border-alert-critical/40 text-alert-critical rounded-sm">
                          SUSPECT
                        </span>
                      ) : (
                        <span className="text-[10px] text-steel-400">nominal</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tableau profils */}
        <div className="panel rounded-sm">
          <div className="px-4 py-3 border-b border-ink-700 flex items-center justify-between">
            <div>
              <h3 className="section-title">Profils de référence — ship_radio_profiles.csv (Q1)</h3>
              <div className="label-tag mt-0.5">
                {ML_META.nProfiled} navires agrégés (mean/std par MMSI) — {TOP_PROFILES.length} plus
                observés affichés
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-ink-700 text-steel-400">
                  <th className="px-3 py-2 text-left label-tag font-normal">Nom</th>
                  <th className="px-3 py-2 text-left label-tag font-normal">MMSI</th>
                  <th className="px-3 py-2 text-left label-tag font-normal">Pavillon</th>
                  <th className="px-3 py-2 text-right label-tag font-normal">f̄ (MHz)</th>
                  <th className="px-3 py-2 text-right label-tag font-normal">σf</th>
                  <th className="px-3 py-2 text-right label-tag font-normal">P̄ (W)</th>
                  <th className="px-3 py-2 text-right label-tag font-normal">SNR (dB)</th>
                  <th className="px-3 py-2 text-center label-tag font-normal">Mod.</th>
                  <th className="px-3 py-2 text-center label-tag font-normal">N</th>
                </tr>
              </thead>
              <tbody>
                {TOP_PROFILES.map((v) => (
                  <tr
                    key={v.mmsi}
                    className={`border-b border-ink-700/50 hover:bg-ink-800/50 transition ${
                      v.isSuspicious ? "bg-alert-critical/[0.04]" : ""
                    }`}
                  >
                    <td className="px-3 py-2 text-steel-100 flex items-center gap-2">
                      {v.isSuspicious && (
                        <span className="w-1.5 h-1.5 rounded-full bg-alert-critical" />
                      )}
                      {v.name}
                    </td>
                    <td className="px-3 py-2 font-mono text-steel-300">
                      {fmtMmsi(v.mmsi)}
                    </td>
                    <td className="px-3 py-2 text-steel-300">{v.flag}</td>
                    <td className="px-3 py-2 text-right font-mono text-steel-200">
                      {v.freqMean.toFixed(3)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-steel-400">
                      {v.freqStd.toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-steel-300">
                      {Math.round(v.powerMean)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-steel-300">
                      {v.snrMean.toFixed(1)}
                    </td>
                    <td className="px-3 py-2 text-center font-mono text-[10px] text-signal">
                      {v.dominantModulation}
                    </td>
                    <td className="px-3 py-2 text-center font-mono text-steel-400">
                      {v.nSignatures}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* === COLONNE DROITE : panel de reconnaissance === */}
      <aside className="col-span-4 space-y-4">
        <div className="panel-elevated rounded-sm sticky top-4">
          <div className="px-4 py-3 border-b border-ink-700 flex items-center gap-2">
            <Zap className="w-4 h-4 text-signal" />
            <h3 className="section-title">Reconnaissance passive</h3>
          </div>

          <div className="px-4 py-3 border-b border-ink-700">
            <div className="label-tag mb-2">Signatures RF réelles — radio_signatures_large.csv</div>
            <div className="grid grid-cols-2 gap-1.5">
              {Object.keys(PRESETS).map((key) => (
                <button
                  key={key}
                  onClick={() => applyPreset(key)}
                  className={`text-[10px] font-mono px-2 py-1.5 border rounded-sm transition text-left ${
                    presetKey === key
                      ? "border-signal bg-signal/10 text-signal"
                      : "bg-ink-900 hover:bg-ink-800 border-ink-700 text-steel-200"
                  }`}
                  style={{ borderRadius: 6 }}
                >
                  <div>{PRESET_LABELS[key] ?? key}</div>
                  <div className="text-steel-400">{PRESET_META[key]?.signatureId}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="px-4 py-3 space-y-3 border-b border-ink-700">
            <FormField
              label="Fréquence porteuse"
              value={input.frequency}
              onChange={(v) => setInput({ ...input, frequency: v })}
              unit="MHz"
              step={0.001}
              min={150}
              max={170}
            />
            <FormField
              label="Bande passante"
              value={input.bandwidth}
              onChange={(v) => setInput({ ...input, bandwidth: v })}
              unit="kHz"
              step={0.1}
              min={5}
              max={50}
            />
            <FormField
              label="Puissance émise"
              value={input.power}
              onChange={(v) => setInput({ ...input, power: v })}
              unit="W"
              step={1}
              min={1}
              max={1000}
            />
            <div>
              <label className="label-tag block mb-1.5">Modulation</label>
              <div className="grid grid-cols-5 gap-1">
                {["DSC", "SSB", "AM", "OFDM", "FM"].map((m) => (
                  <button
                    key={m}
                    onClick={() =>
                      setInput({ ...input, modulation: m as SignatureInput["modulation"] })
                    }
                    className={`text-[10px] font-mono py-1.5 rounded-sm border transition ${
                      input.modulation === m
                        ? "border-signal bg-signal/10 text-signal"
                        : "border-ink-700 bg-ink-950 text-steel-300 hover:border-signal/40 hover:text-signal"
                    }`}
                    style={{ borderRadius: 6 }}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label-tag block mb-1.5">Pulse pattern</label>
              <select
                value={input.pulsePattern}
                onChange={(e) =>
                  setInput({ ...input, pulsePattern: e.target.value })
                }
                className="w-full bg-white border border-ink-600 rounded-sm text-xs font-mono text-steel-100 px-2 py-1.5 focus:border-signal focus:outline-none"
              >
                {[
                  "Short-Short-Short",
                  "Short-Long-Short",
                  "Long-Short-Long",
                  "Long-Long-Short",
                  "Short-Short-Long",
                  "Continuous",
                ].map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="px-4 py-3">
            <button
              onClick={runIdentification}
              className="btn-primary w-full justify-center text-sm"
            >
              <Search className="w-4 h-4" />
              LANCER L'IDENTIFICATION
            </button>
          </div>

          {results && (
            <div className="border-t border-ink-700">
              <div className="px-4 py-2.5 border-b border-ink-700 flex items-center justify-between bg-ink-800/50">
                <span className="label-tag">k-NN sur {ML_META.nProfiled} profils — top 5 candidats</span>
                <span className="text-[10px] font-mono text-steel-400">
                  {new Date().toISOString().slice(11, 19)} UTC
                </span>
              </div>
              <div className="divide-y divide-ink-700">
                {results.map((r) => (
                  <CandidateRow
                    key={r.vessel.mmsi}
                    result={r}
                    top={r.rank === 1}
                    isTruth={resultMeta?.trueMmsi === r.vessel.mmsi}
                  />
                ))}
              </div>
              <div className="px-4 py-3 border-t border-ink-700 bg-ink-800/30 space-y-2">
                {/* Verdict opérationnel */}
                {results[0].confidence > 0.5 ? (
                  <div className="flex items-start gap-2 text-xs">
                    <CheckCircle2 className="w-4 h-4 text-alert-nominal shrink-0 mt-0.5" />
                    <div>
                      <div className="text-steel-100">
                        Candidat le plus probable :{" "}
                        <span className="font-medium">{results[0].vessel.name}</span>
                      </div>
                      <div className="text-steel-400 mt-0.5">
                        Confiance {(results[0].confidence * 100).toFixed(1)}% — à confirmer par
                        coopération AIS et cohérence pavillon.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2 text-xs">
                    <AlertCircle className="w-4 h-4 text-alert-medium shrink-0 mt-0.5" />
                    <div>
                      <div className="text-steel-100">Pas de correspondance franche</div>
                      <div className="text-steel-400 mt-0.5">
                        Confiance &lt; 50 % sur tous les candidats — émetteur non profilé, modifié,
                        ou jeu de profils peu discriminant. Escalade analyste.
                      </div>
                    </div>
                  </div>
                )}

                {/* Vérité terrain (preset = signature réelle au propriétaire connu) */}
                {resultMeta && (
                  <div className="text-[10px] font-mono text-steel-400 border-t border-ink-700 pt-2">
                    Vérité terrain — {resultMeta.signatureId} émise par{" "}
                    <span className="text-steel-200">{resultMeta.trueName}</span> ({resultMeta.trueFlag},
                    MMSI {fmtMmsi(resultMeta.trueMmsi)}).{" "}
                    {resultMeta.trueRank === 1 ? (
                      <span className="text-alert-nominal">k-NN l'a classé #1 → identification correcte.</span>
                    ) : resultMeta.trueRank ? (
                      <span className="text-alert-medium">
                        k-NN l'a classé #{resultMeta.trueRank}/{ML_META.nProfiled} — non identifié (taux
                        d'ID correcte mesuré sur 10 signatures, Q13 ≈ {Math.round(ML_META.identCorrectRate * 100)} % :
                        la limite du jeu synthétique est assumée).
                      </span>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

function FormField({
  label,
  value,
  onChange,
  unit,
  step,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  unit: string;
  step: number;
  min: number;
  max: number;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="label-tag">{label}</label>
        <span className="font-mono text-[10px] text-steel-400">{unit}</span>
      </div>
      <input
        type="number"
        value={value}
        step={step}
        min={min}
        max={max}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full bg-white border border-ink-600 rounded-sm text-sm font-mono text-steel-100 px-2 py-1.5 focus:border-signal focus:outline-none"
      />
    </div>
  );
}

function CandidateRow({
  result,
  top,
  isTruth = false,
}: {
  result: IdentificationResult;
  top: boolean;
  isTruth?: boolean;
}) {
  const pct = result.confidence * 100;
  return (
    <div
      className={`px-4 py-2.5 ${
        isTruth
          ? "bg-alert-nominal/[0.08] border-l-2 border-alert-nominal"
          : top
          ? "bg-signal/[0.06] border-l-2 border-signal"
          : ""
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span
          className={`font-mono text-[10px] w-5 ${
            top ? "text-signal" : "text-steel-400"
          }`}
        >
          #{result.rank}
        </span>
        <span className="text-sm text-steel-100 flex-1 truncate">
          {result.vessel.name}
        </span>
        {isTruth && (
          <span className="text-[9px] font-mono px-1 py-0.5 bg-alert-nominal/15 border border-alert-nominal/40 text-alert-nominal rounded-sm">
            VRAI ÉMETTEUR
          </span>
        )}
        {result.vessel.isSuspicious && (
          <span className="text-[9px] font-mono px-1 py-0.5 bg-alert-critical/15 border border-alert-critical/40 text-alert-critical rounded-sm">
            SUSPECT
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 ml-7">
        <div className="flex-1 h-1 bg-ink-700 rounded-full overflow-hidden" style={{ background: "#E5E5E5" }}>
          <div
            className={`h-full transition-all ${
              top ? "bg-signal" : "bg-steel-400/40"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span
          className={`font-mono text-[11px] tabular-nums ${
            top ? "text-signal" : "text-steel-400"
          }`}
        >
          {pct.toFixed(1)}%
        </span>
      </div>
      <div className="ml-7 mt-1 flex gap-3 text-[10px] font-mono text-steel-400">
        <span>{result.vessel.flag}</span>
        <span>·</span>
        <span>{result.vessel.type}</span>
        <span>·</span>
        <span>d = {result.distance.toFixed(3)}</span>
      </div>
    </div>
  );
}

function Metric({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="text-right">
      <div className="label-tag">{label}</div>
      <div className="font-mono text-sm text-steel-100">
        {value}
        {unit && <span className="text-[10px] text-steel-400 ml-1">{unit}</span>}
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span
        className="inline-block w-2 h-2 rounded-full"
        style={{ background: color }}
      />
      {label}
    </span>
  );
}
