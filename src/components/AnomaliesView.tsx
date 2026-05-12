"use client";

import { useState, useMemo } from "react";
import {
  ANOMALIES,
  VESSELS,
  Anomaly,
  generateFrequencyTimeSeries,
} from "@/lib/data";
import { severityBg, severityColor, formatTimeAgo, fmtMmsi } from "@/lib/engine";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
  Area,
  ComposedChart,
} from "recharts";
import {
  AlertOctagon,
  Flag,
  Radio,
  Eye,
  MapPin,
  GitBranch,
  ShieldOff,
} from "lucide-react";

type ScenarioKey =
  | "all"
  | "Faux pavillon"
  | "MMSI orphelin"
  | "Saut de fréquence"
  | "AIS désactivé"
  | "Écart de position"
  | "Changement de nom";

const SCENARIOS: {
  key: ScenarioKey;
  label: string;
  icon: React.ReactNode;
  desc: string;
}[] = [
  {
    key: "all",
    label: "Toutes",
    icon: <AlertOctagon className="w-3.5 h-3.5" />,
    desc: "",
  },
  {
    key: "Faux pavillon",
    label: "Faux pavillon",
    icon: <Flag className="w-3.5 h-3.5" />,
    desc: "Fréquence radio incohérente avec le pavillon déclaré (écart > 2σ par rapport à la norme du flag)",
  },
  {
    key: "Saut de fréquence",
    label: "Saut de fréquence",
    icon: <Radio className="w-3.5 h-3.5" />,
    desc: "Changement brutal du profil RF (>2σ historique) — substitution d'équipement ou usurpation",
  },
  {
    key: "AIS désactivé",
    label: "AIS désactivé",
    icon: <ShieldOff className="w-3.5 h-3.5" />,
    desc: "Coupure du transpondeur AIS > 24h en zone à risque ou route suspecte",
  },
  {
    key: "Écart de position",
    label: "Écart de position",
    icon: <MapPin className="w-3.5 h-3.5" />,
    desc: "Désaccord entre position AIS déclarée et triangulation RF (> 1 km)",
  },
  {
    key: "MMSI orphelin",
    label: "MMSI orphelin",
    icon: <Eye className="w-3.5 h-3.5" />,
    desc: "Signature radio captée sans MMSI associé au registre — émetteur non-coopératif",
  },
  {
    key: "Changement de nom",
    label: "Changement de nom",
    icon: <GitBranch className="w-3.5 h-3.5" />,
    desc: "Plus de 2 noms historiques — pattern d'identity laundering",
  },
];

export function AnomaliesView() {
  const [filter, setFilter] = useState<ScenarioKey>("all");
  const [selectedAnomaly, setSelectedAnomaly] = useState<Anomaly | null>(
    ANOMALIES[0]
  );

  const filtered = useMemo(
    () =>
      filter === "all"
        ? ANOMALIES
        : ANOMALIES.filter((a) => a.type === filter),
    [filter]
  );

  // Stats par type
  const stats = useMemo(() => {
    const counts: Record<string, { total: number; critical: number }> = {};
    for (const a of ANOMALIES) {
      counts[a.type] = counts[a.type] ?? { total: 0, critical: 0 };
      counts[a.type].total++;
      if (a.severity === "critical") counts[a.type].critical++;
    }
    return counts;
  }, []);

  return (
    <div className="grid grid-cols-12 gap-4 p-6 bg-white min-h-[calc(100vh-130px)]">
      {/* Barre de scénarios */}
      <div className="col-span-12 panel rounded-sm">
        <div className="px-4 py-3 border-b border-ink-700/40">
          <h2 className="font-display text-sm text-steel-100 tracking-wide">
            SCÉNARIOS DE DÉTECTION
          </h2>
          <div className="label-tag mt-0.5">
            6 typologies couvertes — règles statistiques + cross-check sources
          </div>
        </div>
        <div className="p-3 grid grid-cols-7 gap-2">
          {SCENARIOS.map((s) => {
            const isActive = filter === s.key;
            const count =
              s.key === "all" ? ANOMALIES.length : stats[s.key]?.total ?? 0;
            const critical =
              s.key === "all"
                ? ANOMALIES.filter((a) => a.severity === "critical").length
                : stats[s.key]?.critical ?? 0;
            return (
              <button
                key={s.key}
                onClick={() => setFilter(s.key)}
                className={`text-left px-3 py-2.5 transition rounded-lg ${
                  isActive
                    ? "bg-signal/[0.08] shadow-none"
                    : "bg-transparent hover:bg-ink-900/60"
                }`}
                style={{ transitionDuration: "0.15s" }}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span
                    className={
                      isActive ? "text-signal" : "text-steel-400"
                    }
                  >
                    {s.icon}
                  </span>
                  <span
                    className={`text-[10px] font-mono ${
                      isActive ? "text-signal" : "text-steel-400"
                    }`}
                  >
                    {count.toString().padStart(2, "0")}
                  </span>
                  {critical > 0 && (
                    <span className="text-[9px] font-mono px-1 bg-alert-critical/20 text-alert-critical rounded-sm">
                      {critical} CRIT
                    </span>
                  )}
                </div>
                <div
                  className={`text-[11px] leading-tight ${
                    isActive ? "text-steel-100" : "text-steel-300"
                  }`}
                >
                  {s.label}
                </div>
              </button>
            );
          })}
        </div>
        {filter !== "all" && (
          <div className="px-4 py-2.5 border-t border-ink-700 bg-ink-800/30">
            <div className="text-[11px] text-steel-300 leading-relaxed">
              <span className="label-tag mr-2">Méthode</span>
              {SCENARIOS.find((s) => s.key === filter)?.desc}
            </div>
          </div>
        )}
      </div>

      {/* === Liste anomalies (gauche) === */}
      <div className="col-span-5 panel rounded-sm flex flex-col">
        <div className="px-4 py-3 border-b border-ink-700/40 flex items-center justify-between">
          <h3 className="font-display text-xs tracking-wider text-steel-100">
            ANOMALIES DÉTECTÉES
          </h3>
          <span className="label-tag">
            {filtered.length} {filtered.length > 1 ? "items" : "item"}
          </span>
        </div>
        <div className="overflow-y-auto flex-1 divide-y divide-ink-700 max-h-[800px]">
          {filtered.map((a) => {
            const isSel = selectedAnomaly?.id === a.id;
            return (
              <button
                key={a.id}
                onClick={() => setSelectedAnomaly(a)}
                className={`w-full text-left px-4 py-3 transition ${
                  isSel
                    ? "bg-signal/[0.06]"
                    : `hover:bg-ink-900/50 ${severityBg(
                        a.severity
                      ).replace("bg-", "hover:bg-")}`
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="font-mono text-[10px] text-steel-400 w-10 pt-0.5">
                    {formatTimeAgo(a.timestamp)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded-sm ${severityBg(
                          a.severity
                        )} ${severityColor(a.severity)}`}
                      >
                        {a.severity.toUpperCase()}
                      </span>
                      <span className="text-[10px] font-mono text-steel-400">
                        {a.type}
                      </span>
                    </div>
                    <div className="text-sm text-steel-100 truncate">
                      {a.vesselName}{" "}
                      <span className="text-steel-400 font-mono text-[11px]">
                        · {a.mmsi === 0 ? "—" : fmtMmsi(a.mmsi)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-xs text-steel-200">
                      {Math.round(a.confidence * 100)}%
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* === Détail anomalie (droite) === */}
      <div className="col-span-7 space-y-4">
        {selectedAnomaly ? (
          <AnomalyDetail anomaly={selectedAnomaly} />
        ) : (
          <div className="panel rounded-sm p-8 text-center text-steel-400 text-sm">
            Sélectionner une anomalie pour voir le détail
          </div>
        )}
      </div>
    </div>
  );
}

function AnomalyDetail({ anomaly }: { anomaly: Anomaly }) {
  const vessel = VESSELS.find((v) => v.mmsi === anomaly.mmsi);
  const timeseries = vessel ? generateFrequencyTimeSeries(vessel.mmsi) : [];
  const showChart = anomaly.type === "Saut de fréquence" || anomaly.type === "Faux pavillon";

  return (
    <>
      {/* Bandeau résumé */}
      <div
        className={`panel-elevated rounded-sm ${severityBg(
          anomaly.severity
        )}`}
      >
        <div className="px-5 py-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-sm ${severityBg(
                    anomaly.severity
                  )} ${severityColor(anomaly.severity)}`}
                >
                  {anomaly.severity.toUpperCase()}
                </span>
                <span className="font-mono text-[10px] text-steel-400">
                  {anomaly.id}
                </span>
                <span className="font-mono text-[10px] text-steel-400">
                  · détectée {formatTimeAgo(anomaly.timestamp)}
                </span>
              </div>
              <h2 className="font-display text-xl text-steel-100 tracking-tight">
                {anomaly.type}
              </h2>
              <div className="mt-0.5 text-sm text-steel-300">
                {anomaly.vesselName}
                {anomaly.mmsi !== 0 && (
                  <span className="text-steel-400 font-mono text-xs ml-2">
                    MMSI {fmtMmsi(anomaly.mmsi)}
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="label-tag">Confiance</div>
              <div
                className={`font-display text-3xl ${severityColor(
                  anomaly.severity
                )}`}
              >
                {Math.round(anomaly.confidence * 100)}
                <span className="text-base text-steel-400">%</span>
              </div>
            </div>
          </div>
          <p className="text-sm text-steel-200 leading-relaxed">
            {anomaly.description}
          </p>
        </div>
        <div className="border-t border-ink-700 px-5 py-2.5 flex items-center justify-between text-[11px] font-mono text-steel-400">
          <div className="flex gap-4">
            <span>
              <span className="label-tag mr-1">Source</span>
              {anomaly.source}
            </span>
            <span>
              <span className="label-tag mr-1">Lat</span>
              {anomaly.lat.toFixed(3)}
            </span>
            <span>
              <span className="label-tag mr-1">Lon</span>
              {anomaly.lon.toFixed(3)}
            </span>
          </div>
          <span>{new Date(anomaly.timestamp).toLocaleString("fr-FR")}</span>
        </div>
      </div>

      {/* Graphique évolution fréquence si pertinent */}
      {showChart && vessel && (
        <div className="panel rounded-sm">
          <div className="px-4 py-3 border-b border-ink-700 flex items-center justify-between">
            <div>
              <h3 className="font-display text-xs tracking-wider text-steel-100">
                ÉVOLUTION RF — 48 DERNIÈRES HEURES
              </h3>
              <div className="label-tag mt-0.5">
                Bande référence ± 2σ · seuil rouge = saut détecté
              </div>
            </div>
            <div className="flex gap-3 text-[10px] font-mono">
              <span className="text-steel-400">
                f̄ ref = {vessel.freqMean.toFixed(2)} MHz
              </span>
              <span className="text-steel-400">
                σ = {vessel.freqStd.toFixed(2)}
              </span>
            </div>
          </div>
          <div className="p-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={timeseries}>
                <CartesianGrid stroke="#E5E5E5" strokeDasharray="3 3" />
                <XAxis
                  dataKey="t"
                  tick={{ fill: "#777777", fontSize: 9, fontFamily: "JetBrains Mono" }}
                  stroke="#CCCCCC"
                  interval={5}
                />
                <YAxis
                  domain={[
                    Math.floor(vessel.freqMean - 4),
                    Math.ceil(vessel.freqMean + 4),
                  ]}
                  tick={{ fill: "#777777", fontSize: 10, fontFamily: "JetBrains Mono" }}
                  stroke="#CCCCCC"
                  label={{
                    value: "Fréquence (MHz)",
                    angle: -90,
                    position: "insideLeft",
                    fill: "#777777",
                    fontSize: 10,
                  }}
                />
                <Tooltip
                  contentStyle={{
                    background: "#FFFFFF",
                    border: "1px solid #DDDDDD",
                    fontSize: 11,
                    fontFamily: "JetBrains Mono",
                    color: "#161616",
                  }}
                />
                {/* Bande référence */}
                <Area
                  dataKey={() => vessel.freqMean + vessel.freqStd * 2}
                  fill="#22c55e"
                  fillOpacity={0.06}
                  stroke="none"
                  isAnimationActive={false}
                />
                <Line
                  dataKey="freq"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
                {timeseries.map((p, i) =>
                  p.anomaly ? (
                    <ReferenceDot
                      key={i}
                      x={p.t}
                      y={p.freq}
                      r={6}
                      fill="#ef4444"
                      stroke="#fff"
                      strokeWidth={1.5}
                      isFront
                    />
                  ) : null
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Actions / Workflow */}
      <div className="panel rounded-sm">
        <div className="px-4 py-3 border-b border-ink-700">
          <h3 className="font-display text-xs tracking-wider text-steel-100">
            CHAÎNE D'ANALYSE & ACTIONS RECOMMANDÉES
          </h3>
        </div>
        <div className="p-4 space-y-3">
          {getRecommendations(anomaly).map((rec, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full border border-signal/40 bg-signal/10 flex items-center justify-center font-mono text-[10px] text-signal shrink-0">
                {i + 1}
              </div>
              <div className="text-xs text-steel-200 leading-relaxed pt-0.5">
                {rec}
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-ink-700 px-4 py-3 flex gap-2 flex-wrap">
          <button className="btn-primary text-xs">
            Escalader CO-MAR
          </button>
          <button className="btn-secondary text-xs">
            Marquer faux positif
          </button>
          <button className="btn-secondary text-xs">
            Demander overpass satellite
          </button>
          <button className="ml-auto px-3 py-1.5 text-xs text-steel-300 hover:text-signal transition-colors" style={{ background: "none", border: "none", cursor: "pointer" }}>
            Exporter rapport →
          </button>
        </div>
      </div>
    </>
  );
}

function getRecommendations(a: Anomaly): string[] {
  const map: Record<string, string[]> = {
    "Faux pavillon": [
      "Cross-check du pavillon déclaré avec base Equasis (registre officiel)",
      "Vérification de la liste OFAC/UE/ONU des navires sanctionnés via OpenSanctions",
      "Demande d'overpass satellite (CSO ou Sentinel-1) pour identification visuelle",
      "Si confirmé > 24h : escalade Préfecture Maritime Méditerranée",
    ],
    "Saut de fréquence": [
      "Comparer l'empreinte RF actuelle au profil historique (12 derniers mois)",
      "Vérifier si changement d'équipement déclaré (Equasis classification updates)",
      "Si saut non justifié : marquer comme suspect et corréler avec activité AIS",
      "Capture longue durée pour analyse spectrale fine (transient signature)",
    ],
    "AIS désactivé": [
      "Continuer la triangulation RF pour maintenir le tracking",
      "Vérifier route habituelle et zones d'opération du navire",
      "Demander coordination avec garde-côtes du pavillon déclaré",
      "Si > 48h sans justification : signalement EMSA / FRONTEX",
    ],
    "Écart de position": [
      "Recalculer triangulation avec capteurs additionnels si disponibles",
      "Vérifier intégrité GPS du navire (interférences zone connue ?)",
      "Cross-check avec imagerie SAR (Sentinel-1) sur la zone",
      "Si confirmé : déclaration spoofing AIS auprès de l'OMI",
    ],
    "MMSI orphelin": [
      "Tentative d'identification par similarité de profil RF (top 5 candidats)",
      "Vérifier signatures captées sur les 7 derniers jours dans la même zone",
      "Si pattern récurrent : ouvrir dossier émetteur non-identifié",
      "Coordination avec ANSSI sur signature inhabituelle",
    ],
    "Changement de nom": [
      "Récupérer l'historique complet via Equasis (noms, pavillons, propriétaires)",
      "Cross-check avec les listes de sanctions sur tous les noms historiques",
      "Analyse de la chronologie : changements rapprochés = signal fort",
      "Si > 3 noms en < 24 mois : escalade compliance maritime",
    ],
  };
  return map[a.type] ?? ["Investigation manuelle requise."];
}
