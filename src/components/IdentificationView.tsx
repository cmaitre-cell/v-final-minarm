"use client";

import { useState, useMemo } from "react";
import { VESSELS, CLUSTER_DATA, FLAG_PROFILES } from "@/lib/data";
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
  Cell,
} from "recharts";
import { Search, Zap, AlertCircle, CheckCircle2 } from "lucide-react";

const PRESETS: Record<string, SignatureInput> = {
  cargo_normal: {
    frequency: 156.92,
    bandwidth: 25.0,
    power: 290,
    modulation: "DSC",
    pulsePattern: "Short-Long-Short",
  },
  tanker_suspect: {
    frequency: 162.4,
    bandwidth: 31.2,
    power: 410,
    modulation: "SSB",
    pulsePattern: "Continuous",
  },
  passenger: {
    frequency: 156.75,
    bandwidth: 25.0,
    power: 285,
    modulation: "DSC",
    pulsePattern: "Short-Short-Short",
  },
  orphan: {
    frequency: 158.2,
    bandwidth: 27.5,
    power: 340,
    modulation: "OFDM",
    pulsePattern: "Long-Short-Long",
  },
};

export function IdentificationView() {
  const [input, setInput] = useState<SignatureInput>(PRESETS.tanker_suspect);
  const [results, setResults] = useState<IdentificationResult[] | null>(null);

  const runIdentification = () => {
    const r = identifyVessel(input, 5);
    setResults(r);
  };

  const clusterColors = ["#3b82f6", "#22c55e", "#eab308", "#f97316", "#ef4444"];

  return (
    <div className="grid grid-cols-12 gap-4 p-6 bg-white min-h-[calc(100vh-130px)]">
      {/* === COLONNE GAUCHE : profils & visualisations === */}
      <div className="col-span-8 space-y-4">
        {/* En-tête métier */}
        <div className="panel rounded-sm px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-sm text-steel-100 tracking-wide">
                BASE DE PROFILS RADIO
              </h2>
              <div className="label-tag mt-0.5">
                Empreinte RF agrégée — {VESSELS.length} navires en référence
              </div>
            </div>
            <div className="flex gap-2">
              <Metric label="Fréq. min" value="156.74" unit="MHz" />
              <Metric label="Fréq. max" value="163.12" unit="MHz" />
              <Metric label="Bande VHF" value="156-163" unit="MHz" />
            </div>
          </div>
        </div>

        {/* Grille de KPI métier */}
        <div className="grid grid-cols-2 gap-4">
          {/* Scatter clusters */}
          <div className="panel rounded-sm">
            <div className="px-4 py-3 border-b border-ink-700">
              <h3 className="font-display text-xs tracking-wider text-steel-100">
                CLUSTERS K-MEANS · FRÉQUENCE × PUISSANCE
              </h3>
              <div className="label-tag mt-0.5">
                5 familles RF — chaque point = un navire
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
                    domain={[156, 164]}
                    stroke="#CCCCCC"
                  />
                  <YAxis
                    dataKey="power"
                    name="Puissance"
                    unit=" W"
                    tick={{ fill: "#777777", fontSize: 10, fontFamily: "JetBrains Mono" }}
                    stroke="#CCCCCC"
                  />
                  <ZAxis range={[60, 60]} />
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
                    >
                      {CLUSTER_DATA.filter((d) => d.cluster === c).map((d, i) => (
                        <Cell
                          key={i}
                          fill={clusterColors[c]}
                          stroke={d.isSuspicious ? "#ef4444" : "transparent"}
                          strokeWidth={d.isSuspicious ? 2 : 0}
                        />
                      ))}
                    </Scatter>
                  ))}
                </ScatterChart>
              </ResponsiveContainer>
            </div>
            <div className="px-4 py-2 border-t border-ink-700 flex items-center gap-3 text-[10px] font-mono text-steel-400">
              <Legend color="#3b82f6" label="C0" />
              <Legend color="#22c55e" label="C1" />
              <Legend color="#eab308" label="C2" />
              <Legend color="#f97316" label="C3" />
              <Legend color="#ef4444" label="C4" />
              <span className="ml-auto">
                <span className="inline-block w-2 h-2 border border-alert-critical mr-1" />
                contour rouge = suspect
              </span>
            </div>
          </div>

          {/* Stats par pavillon */}
          <div className="panel rounded-sm">
            <div className="px-4 py-3 border-b border-ink-700">
              <h3 className="font-display text-xs tracking-wider text-steel-100">
                FRÉQUENCE MOYENNE PAR PAVILLON
              </h3>
              <div className="label-tag mt-0.5">
                Hors-norme = pavillon usurpé probable
              </div>
            </div>
            <div className="p-3 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={FLAG_PROFILES} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid stroke="#E5E5E5" strokeDasharray="3 3" horizontal={false} />
                  <XAxis
                    type="number"
                    domain={[155, 165]}
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
                    contentStyle={{
                      background: "#FFFFFF",
                      border: "1px solid #DDDDDD",
                      fontSize: 11,
                      color: "#161616",
                    }}
                  />
                  <Bar dataKey="meanFreq" radius={[0, 2, 2, 0]}>
                    {FLAG_PROFILES.map((d, i) => (
                      <Cell
                        key={i}
                        fill={d.meanFreq > 160 ? "#ef4444" : d.meanFreq > 158 ? "#f97316" : "#3b82f6"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Tableau profils */}
        <div className="panel rounded-sm">
          <div className="px-4 py-3 border-b border-ink-700 flex items-center justify-between">
            <div>
              <h3 className="font-display text-xs tracking-wider text-steel-100">
                PROFILS DE RÉFÉRENCE — TOP NAVIRES
              </h3>
              <div className="label-tag mt-0.5">
                Mean & Std agrégés sur historique RF
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
                {VESSELS.map((v) => (
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
                      {v.powerMean}
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
            <h3 className="font-display text-sm text-steel-100 tracking-wide">
              RECONNAISSANCE PASSIVE
            </h3>
          </div>

          <div className="px-4 py-3 border-b border-ink-700">
            <div className="label-tag mb-2">Presets opérationnels</div>
            <div className="grid grid-cols-2 gap-1.5">
              {Object.entries(PRESETS).map(([key, val]) => (
                <button
                  key={key}
                  onClick={() => {
                    setInput(val);
                    setResults(null);
                  }}
                  className="text-[10px] font-mono px-2 py-1.5 bg-ink-900 hover:bg-ink-800 border border-ink-700 rounded-sm text-steel-200 transition text-left"
                  style={{ borderRadius: 6 }}
                >
                  {key.replace("_", " ")}
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
                <span className="label-tag">Résultats — top 5 candidats</span>
                <span className="text-[10px] font-mono text-steel-400">
                  {new Date().toISOString().slice(11, 19)} UTC
                </span>
              </div>
              <div className="divide-y divide-ink-700">
                {results.map((r) => (
                  <CandidateRow key={r.vessel.mmsi} result={r} top={r.rank === 1} />
                ))}
              </div>
              <div className="px-4 py-3 border-t border-ink-700 bg-ink-800/30">
                {results[0].confidence > 0.5 ? (
                  <div className="flex items-start gap-2 text-xs">
                    <CheckCircle2 className="w-4 h-4 text-alert-nominal shrink-0 mt-0.5" />
                    <div>
                      <div className="text-steel-100">
                        Match probable :{" "}
                        <span className="font-medium">{results[0].vessel.name}</span>
                      </div>
                      <div className="text-steel-400 mt-0.5">
                        Confiance {(results[0].confidence * 100).toFixed(1)}% — vérifier
                        coopération AIS et cohérence pavillon.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2 text-xs">
                    <AlertCircle className="w-4 h-4 text-alert-medium shrink-0 mt-0.5" />
                    <div>
                      <div className="text-steel-100">Signature atypique</div>
                      <div className="text-steel-400 mt-0.5">
                        Confiance &lt; 50% sur tous les candidats. Émetteur inconnu ou
                        modifié — escalade analyste recommandée.
                      </div>
                    </div>
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
}: {
  result: IdentificationResult;
  top: boolean;
}) {
  const pct = result.confidence * 100;
  return (
    <div
      className={`px-4 py-2.5 ${
        top ? "bg-signal/[0.06] border-l-2 border-signal" : ""
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
