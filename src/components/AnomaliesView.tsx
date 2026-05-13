"use client";

import { useState, useMemo } from "react";
import {
  ANOMALIES,
  Anomaly,
  ML_RECALL_BY_TYPE,
  ML_TEMPORAL_Q9,
  ML_KPIS,
} from "@/lib/data";
import { severityBg, severityColor, formatTimeAgo, fmtMmsi } from "@/lib/engine";
import { generateAnomalyAlertPdf, generateDetectionReportPdf } from "@/lib/report";
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
  FileDown,
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
    <div className="grid grid-cols-12 gap-4 p-6 bg-white min-h-[calc(100vh-130px)] fade-in-stagger">
      {/* Barre de scénarios */}
      <div className="col-span-12 panel rounded-sm">
        <div className="px-4 py-3 border-b border-ink-700/40">
          <h2 className="section-title">Scénarios de détection</h2>
          <div className="label-tag mt-0.5">
            6 typologies couvertes — règles statistiques + cross-check OSINT · les compteurs ci-dessous
            = cas-types illustratifs ; l'évaluation chiffrée est dans le panneau « Évaluation vs vérité terrain »
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

      {/* === Évaluation vs vérité terrain — chiffres réels === */}
      <div className="col-span-12 panel rounded-sm">
        <div className="px-4 py-3 border-b border-ink-700/40 flex items-start justify-between gap-4">
          <div>
            <h3 className="section-title">Évaluation vs vérité terrain — anomalies_large.csv</h3>
            <div className="label-tag mt-0.5">
              {ML_KPIS.nAnomaliesTruth} anomalies de référence · rappel global passé de{" "}
              <span className="text-alert-medium">
                {Math.round(ML_KPIS.recallOverallBefore * 100)} %
              </span>{" "}
              à{" "}
              <span className="text-alert-nominal">
                {Math.round(ML_KPIS.recallOverall * 100)} %
              </span>{" "}
              en récupérant Speed / Course Anomaly par analyse cinématique des positions AIS
              (+{ML_KPIS.nRecoveredKinematic} cas) — plafond théorique levé de{" "}
              {Math.round(ML_KPIS.achievableRecallCeilingBefore * 100)} % à{" "}
              {Math.round(ML_KPIS.achievableRecallCeiling * 100)} %
            </div>
          </div>
          <button
            onClick={() =>
              generateDetectionReportPdf({ kpis: ML_KPIS, recallByType: [...ML_RECALL_BY_TYPE] })
            }
            className="btn-secondary text-xs whitespace-nowrap flex items-center gap-1.5"
            title="Ouvrir le rapport de détection (vue imprimable A4) et l'enregistrer en PDF"
          >
            <FileDown className="w-3.5 h-3.5" />
            Rapport de détection (PDF)
          </button>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
          {ML_RECALL_BY_TYPE.map((r) => (
            <div key={r.type} className="flex items-center gap-3 text-xs">
              <span className="w-36 shrink-0 text-steel-200">{r.type}</span>
              <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "#E5E5E5" }}>
                <div
                  className="h-full"
                  style={{
                    width: `${Math.max(r.recall * 100, 2)}%`,
                    background: !r.recoverable ? "#9AA3B5" : r.recall >= 0.3 ? "#18753C" : r.recall > 0 ? "#C64A00" : "#CE0500",
                  }}
                />
              </div>
              <span className="w-28 shrink-0 text-right font-mono text-steel-400">
                {Math.round(r.recall * 100)}% · {r.nOverlap}/{r.nTruth}
              </span>
            </div>
          ))}
        </div>
        <div className="px-4 py-2.5 border-t border-ink-700 bg-ink-800/30 text-[11px] font-mono text-steel-400 flex flex-wrap gap-x-6 gap-y-1">
          <span>AIS off &gt; 24 h : <span className="text-steel-200">{ML_KPIS.nAisOffBlocks}</span> épisodes / {ML_KPIS.nAisOffMmsi} navires</span>
          <span>écart position AIS↔RF &gt; 1 km : <span className="text-steel-200">{ML_KPIS.nPosMismatchPairs}</span> paires / {ML_KPIS.nPosMismatchMmsi} navires</span>
          <span>MMSI orphelins : <span className="text-steel-200">{ML_KPIS.nOrphans}</span> (intégrité référentielle parfaite)</span>
          <span>score de suspicion : AUC {ML_KPIS.scoreAuc.toFixed(2)}, précision@k {Math.round(ML_KPIS.scorePrecisionAtK * 100)}%</span>
        </div>
      </div>

      {/* === Liste anomalies (gauche) — exemples === */}
      <div className="col-span-5 panel rounded-sm flex flex-col">
        <div className="px-4 py-3 border-b border-ink-700/40 flex items-center justify-between">
          <div>
            <h3 className="section-title">Cas-types — exemples illustratifs</h3>
            <div className="label-tag mt-0.5">scénarios annotés à la main pour la démo</div>
          </div>
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
  const q9 = ML_TEMPORAL_Q9;
  const showChart = anomaly.type === "Saut de fréquence";

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
              <h2 className="section-title" style={{ fontSize: 17 }}>
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

      {/* Graphique évolution fréquence — cas réel du dataset (Q9) */}
      {showChart && (
        <div className="panel rounded-sm">
          <div className="px-4 py-3 border-b border-ink-700 flex items-center justify-between">
            <div>
              <h3 className="section-title">
                Exemple réel — historique RF du MMSI {q9.mmsi}
              </h3>
              <div className="label-tag mt-0.5">
                {q9.series.length} captations sur l'année · {q9.jumpsFreq} sauts de fréquence détectés
                (|Δf| &gt; 1 MHz, points rouges) · {q9.jumpsSignal} sauts de puissance reçue
              </div>
            </div>
            <div className="flex gap-3 text-[10px] font-mono">
              <span className="text-steel-400">f̄ = {q9.freqMean.toFixed(2)} MHz</span>
              <span className="text-steel-400">σ = {q9.freqStd.toFixed(2)}</span>
            </div>
          </div>
          <div className="p-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={[...q9.series]}>
                <CartesianGrid stroke="#E5E5E5" strokeDasharray="3 3" />
                <XAxis
                  dataKey="t"
                  tick={{ fill: "#777777", fontSize: 9, fontFamily: "JetBrains Mono" }}
                  stroke="#CCCCCC"
                  interval={2}
                />
                <YAxis
                  domain={[
                    Math.floor(q9.freqMean - 3),
                    Math.ceil(q9.freqMean + 3),
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
                {/* Bande référence ± 2σ */}
                <Area
                  dataKey={() => q9.freqMean + q9.freqStd * 2}
                  fill="#22c55e"
                  fillOpacity={0.06}
                  stroke="none"
                  isAnimationActive={false}
                />
                <Line
                  dataKey="freq"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 2.5, fill: "#3b82f6" }}
                  isAnimationActive={false}
                />
                {q9.series.map((p, i) =>
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
          <div className="px-4 py-2 border-t border-ink-700 text-[10px] font-mono text-steel-400">
            Détection de rupture (Q9) : on suit la dérive du profil RF par MMSI ; ici le signal saute
            de 156 à 161 MHz sans logique — substitution d'équipement ou usurpation probable.
          </div>
        </div>
      )}

      {/* Actions / Workflow */}
      <div className="panel rounded-sm">
        <div className="px-4 py-3 border-b border-ink-700">
          <h3 className="section-title">Chaîne d'analyse & actions recommandées</h3>
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
          <button
            onClick={() => generateAnomalyAlertPdf(anomaly, getRecommendations(anomaly))}
            className="ml-auto btn-secondary text-xs flex items-center gap-1.5"
            title="Ouvrir la fiche d'alerte (vue imprimable A4) et l'enregistrer en PDF"
          >
            <FileDown className="w-3.5 h-3.5" />
            Exporter la fiche d'alerte (PDF)
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
