"use client";

import { VESSELS, ANOMALIES, SENSORS, VESSEL_POSITIONS, ML_KPIS, ML_WATCHLIST } from "@/lib/data";
import { formatTimeAgo, fmtMmsi } from "@/lib/engine";
import { AlertTriangle, Ship, Antenna, MapPin, Activity, Rss, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";

export function SyntheseView({ onJumpToAnomaly }: { onJumpToAnomaly: () => void }) {
  const suspicious = VESSELS.filter((v) => v.isSuspicious);
  const critical    = ANOMALIES.filter((a) => a.severity === "critical");
  const high        = ANOMALIES.filter((a) => a.severity === "high");

  const alerts = [...critical, ...high].slice(0, 4);

  return (
    <div style={{ minHeight: "calc(100vh - 130px)", background: "#ffffff", padding: "32px 36px", display: "flex", flexDirection: "column", gap: 28 }}>

      {/* ── KPI strip — chiffres réels (results.json) ── */}
      <div className="fade-in-stagger" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
          <KpiCard icon={<Ship size={20} />}          label="Navires au registre"        value={ML_KPIS.nShips}             unit="" tone="neutral" />
          <KpiCard icon={<AlertTriangle size={20} />} label="Anomalies — vérité terrain"  value={ML_KPIS.nAnomaliesTruth}    unit="" tone="critical" />
          <KpiCard icon={<Antenna size={20} />}       label="AIS désactivé > 24 h"        value={ML_KPIS.nAisOffMmsi}        unit="navires" tone="warn" />
          <KpiCard icon={<MapPin size={20} />}        label="Écart position AIS↔RF > 1 km" value={ML_KPIS.nPosMismatchMmsi}  unit="navires" tone="warn" />
        </div>
        <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "#5C6378", letterSpacing: "0.02em" }}>
          {ML_KPIS.nSignatures.toLocaleString("fr-FR")} signatures RF → {ML_KPIS.nProfiled} profils navires ·
          K-Means K={ML_KPIS.kmeansK} (silhouette {ML_KPIS.silhouette.toFixed(2)}) ·
          {" "}{ML_KPIS.nSilentShips} navires « jamais entendus » (dont {ML_KPIS.nSilentSuspicious} suspects) ·
          {" "}score de suspicion AUC {ML_KPIS.scoreAuc.toFixed(2)} — plafond de rappel atteignable {Math.round(ML_KPIS.achievableRecallCeiling * 100)} %
        </div>
      </div>

      {/* ── Rangée principale ── */}
      <div className="fade-in-stagger" style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20 }}>

        {/* Alertes */}
        <div className="panel" style={{ overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #E3E3FD", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#CE0500", display: "inline-block" }} className="animate-pulse_dot" />
              <span className="section-title">Alertes prioritaires</span>
              <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: "#000091", background: "#ECECFE", border: "1px solid #CACAFB", borderRadius: 4, padding: "2px 8px", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                {critical.length + high.length} actives
              </span>
            </div>
            <button type="button" onClick={onJumpToAnomaly} className="btn-link">
              Voir toutes →
            </button>
          </div>

          <div>
            {alerts.map((a, idx) => (
              <AlertRow key={a.id} anomaly={a} isLast={idx === alerts.length - 1} />
            ))}
          </div>
        </div>

        {/* Bâtiments à surveiller */}
        <div className="panel" style={{ overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #E3E3FD" }}>
            <div className="section-title">Bâtiments suspects</div>
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: "#5C6378", marginTop: 4, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              {suspicious.length} marqués
            </div>
          </div>
          <div style={{ padding: "4px 20px" }}>
            {suspicious.map((v, idx) => {
              const pos = VESSEL_POSITIONS[v.mmsi];
              return (
                <div key={v.mmsi} className="list-row" style={{ padding: "12px 12px", margin: "0 -12px", borderRadius: 6, display: "flex", alignItems: "center", gap: 14, borderBottom: idx === suspicious.length - 1 ? "none" : "1px solid #E3E3FD" }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(198,74,0,0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Ship size={16} color="#C64A00" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#1E2232", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {v.name}
                    </div>
                    <div style={{ fontSize: 11, color: "#5C6378", marginTop: 2, display: "flex", gap: 6, alignItems: "center" }}>
                      <span>{v.flag}</span>
                      <span style={{ opacity: 0.4 }}>·</span>
                      <span>{v.type}</span>
                      {!pos?.aisActive && (
                        <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9, color: "#C64A00", background: "rgba(198,74,0,0.08)", padding: "1px 6px", borderRadius: 4 }}>AIS OFF</span>
                      )}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12, color: "#1E2232", fontWeight: 500 }}>{v.freqMean.toFixed(2)}</div>
                    <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: "#9AA3B5" }}>MHz</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Rangée basse ── */}
      <div className="fade-in-stagger" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

        {/* Réseau capteurs */}
        <div className="panel" style={{ overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #E3E3FD", display: "flex", alignItems: "center", gap: 8 }}>
            <Antenna size={15} color="#000091" />
            <span className="section-title">Réseau de capteurs</span>
            <span style={{ marginLeft: "auto", fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: "#5C6378", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              {SENSORS.filter(s => s.status === "actif").length}/{SENSORS.length} actifs
            </span>
          </div>
          <div style={{ padding: "4px 20px" }}>
            {SENSORS.map((s, idx) => (
              <div key={s.id} className="list-row" style={{ padding: "11px 12px", margin: "0 -12px", borderRadius: 6, display: "flex", alignItems: "center", gap: 14, borderBottom: idx === SENSORS.length - 1 ? "none" : "1px solid #E3E3FD" }}>
                <StatusDot state={s.status} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "#1E2232" }}>{s.name}</div>
                  <div style={{ fontSize: 11, color: "#9AA3B5", marginTop: 2 }}>{s.type}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12, color: "#5C6378" }}>{s.rangeKm} km</div>
                  <div style={{ fontSize: 10, color: s.status === "actif" ? "#18753C" : s.status === "dégradé" ? "#8B5E00" : "#CE0500", fontWeight: 600, marginTop: 2 }}>
                    {s.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Activité RF */}
        <div className="panel" style={{ overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #E3E3FD", display: "flex", alignItems: "center", gap: 8 }}>
            <Activity size={15} color="#000091" />
            <span className="section-title">Activité RF — 24 h</span>
          </div>
          <div style={{ padding: "20px" }}>
            <ActivityBars />
          </div>
        </div>
      </div>

      {/* ── Veille OSINT (Q14) ─────────────────────────────────────────────── */}
      <div className="fade-in-stagger panel" style={{ overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #E3E3FD", display: "flex", alignItems: "center", gap: 10 }}>
          <Rss size={15} color="#000091" />
          <div style={{ flex: 1 }}>
            <div className="section-title">Veille OSINT — flux RSS maritimes (Q14)</div>
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: "#5C6378", marginTop: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              gCaptain · Maritime Executive · OFAC — ingestion automatique, déduplication par GUID,
              extraction MMSI / IMO / mots-clés de suspicion (saisie, sanctions, shadow fleet…)
            </div>
          </div>
          <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: "#000091", background: "#ECECFE", border: "1px solid #CACAFB", borderRadius: 4, padding: "2px 8px", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            {ML_WATCHLIST.length} items
          </span>
        </div>
        <div>
          {ML_WATCHLIST.map((it, idx) => {
            const isSusp = !!it.suspicionKeywords;
            return (
              <a
                key={`${it.source}-${idx}`}
                href={it.link || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="list-row"
                style={{
                  display: "flex", alignItems: "flex-start", gap: 14,
                  padding: "12px 20px",
                  borderBottom: idx === ML_WATCHLIST.length - 1 ? "none" : "1px solid #E3E3FD",
                  textDecoration: "none", color: "inherit",
                  borderLeft: isSusp ? "3px solid #C64A00" : "3px solid transparent",
                  background: isSusp ? "rgba(198,74,0,0.04)" : "transparent",
                }}
              >
                <div style={{
                  fontFamily: "JetBrains Mono, monospace", fontSize: 9, color: "#9AA3B5",
                  marginTop: 4, minWidth: 70, textTransform: "uppercase", letterSpacing: "0.04em",
                }}>
                  {it.source.replace(/^www\./, "").slice(0, 20)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: "#1E2232", lineHeight: 1.45 }}>
                    {it.title}
                  </div>
                  <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    {isSusp && (
                      <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9, fontWeight: 700, padding: "1px 6px", background: "rgba(198,74,0,0.12)", border: "1px solid rgba(198,74,0,0.3)", color: "#C64A00", borderRadius: 4, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                        {it.suspicionKeywords}
                      </span>
                    )}
                    {it.mmsi && (
                      <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: "#000091" }}>MMSI {it.mmsi}</span>
                    )}
                    {it.imo && (
                      <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: "#000091" }}>IMO {it.imo}</span>
                    )}
                    <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: "#9AA3B5" }}>
                      {it.published ? new Date(it.published).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                    </span>
                  </div>
                </div>
                <ExternalLink size={13} color="#9AA3B5" style={{ marginTop: 4, flexShrink: 0 }} />
              </a>
            );
          })}
        </div>
        <div style={{ padding: "10px 20px", borderTop: "1px solid #E3E3FD", fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: "#9AA3B5" }}>
          Source des données : <code>data/processed/watchlist.csv</code> · régénéré par <code>make generalisation</code> ou re-run du notebook.
          Les items avec mot-clé de suspicion sont mis en évidence (orange).
        </div>
      </div>
    </div>
  );
}

/* ── Sous-composants ──────────────────────────────────────────────────────── */

const SEV_COLORS: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  critical: { bg: "rgba(206,5,0,0.04)",   border: "rgba(206,5,0,0.15)",   text: "#CE0500", dot: "#CE0500" },
  high:     { bg: "rgba(198,74,0,0.04)",  border: "rgba(198,74,0,0.15)",  text: "#C64A00", dot: "#C64A00" },
  medium:   { bg: "rgba(139,94,0,0.04)",  border: "rgba(139,94,0,0.15)",  text: "#8B5E00", dot: "#8B5E00" },
  low:      { bg: "rgba(24,117,60,0.04)", border: "rgba(24,117,60,0.15)", text: "#18753C", dot: "#18753C" },
};

function AlertRow({ anomaly: a, isLast }: { anomaly: (typeof ANOMALIES)[0]; isLast: boolean }) {
  const c = SEV_COLORS[a.severity] ?? SEV_COLORS.low;
  return (
    <div className="list-row" style={{
      padding: "16px 20px",
      display: "flex", alignItems: "flex-start", gap: 16,
      borderBottom: isLast ? "none" : "1px solid #E3E3FD",
      borderLeft: `3px solid ${c.dot}`,
      cursor: "pointer",
    }}>
      <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: "#9AA3B5", marginTop: 3, minWidth: 28 }}>
        {formatTimeAgo(a.timestamp)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
          <span style={{
            fontFamily: "JetBrains Mono, monospace", fontSize: 9, fontWeight: 700,
            padding: "2px 7px", borderRadius: 5,
            background: c.bg, border: `1px solid ${c.border}`, color: c.text,
            letterSpacing: "0.08em", textTransform: "uppercase",
          }}>
            {a.type}
          </span>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#1E2232" }}>{a.vesselName}</span>
          <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: "#9AA3B5" }}>
            {fmtMmsi(a.mmsi)}
          </span>
        </div>
        <p style={{ fontSize: 12, color: "#5C6378", lineHeight: 1.6, margin: 0 }}>{a.description}</p>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 18, fontWeight: 700, color: c.text, lineHeight: 1 }}>
          {Math.round(a.confidence * 100)}%
        </div>
        <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9, color: "#9AA3B5", marginTop: 3, textTransform: "uppercase", letterSpacing: "0.08em" }}>
          confiance
        </div>
      </div>
    </div>
  );
}

function StatusDot({ state }: { state: string }) {
  const color = state === "actif" ? "#18753C" : state === "dégradé" ? "#8B5E00" : "#CE0500";
  const bg    = state === "actif" ? "rgba(24,117,60,0.12)" : state === "dégradé" ? "rgba(139,94,0,0.12)" : "rgba(206,5,0,0.12)";
  return (
    <div style={{ width: 32, height: 32, borderRadius: 8, background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: color }} className={state === "actif" ? "animate-pulse_dot" : ""} />
    </div>
  );
}

function KpiCard({ icon, label, value, unit, tone }: {
  icon: React.ReactNode; label: string; value: number | string; unit?: string;
  tone: "neutral" | "ok" | "warn" | "critical";
}) {
  const accent = { neutral: "#1E2232", ok: "#18753C", warn: "#C64A00", critical: "#CE0500" }[tone];
  const iconBg = { neutral: "rgba(30,34,50,0.06)", ok: "rgba(24,117,60,0.08)", warn: "rgba(198,74,0,0.08)", critical: "rgba(206,5,0,0.08)" }[tone];

  return (
    <div className="panel" style={{ padding: "20px 22px", display: "flex", alignItems: "flex-start", gap: 16 }}>
      <div style={{ width: 44, height: 44, borderRadius: 8, background: iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: accent }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: "#9AA3B5", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
          {label}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 30, fontWeight: 700, color: accent, lineHeight: 1 }}>
            {value}
          </span>
          {unit && <span style={{ fontSize: 12, color: "#9AA3B5" }}>{unit}</span>}
        </div>
      </div>
    </div>
  );
}

function ActivityBars() {
  const [data, setData] = useState<number[]>([]);

  useEffect(() => {
    setData(
      Array.from({ length: 24 }, (_, i) => {
        const base = 30 + Math.sin(i / 4) * 20 + Math.random() * 25;
        const spike = i === 14 || i === 19 ? 35 : 0;
        return Math.min(100, base + spike);
      })
    );
  }, []);

  if (!data.length) return <div style={{ height: 140 }} />;

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 140 }}>
      {data.map((v, i) => {
        const isSpike = v > 80;
        return (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div style={{
              width: "100%", borderRadius: "4px 4px 0 0",
              background: isSpike ? "rgba(198,74,0,0.75)" : "rgba(0,0,145,0.3)",
              height: `${v}%`,
              transition: "height 0.4s",
            }} />
            {(i % 4 === 0) && (
              <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 8, color: "#9AA3B5" }}>
                {i.toString().padStart(2, "0")}h
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
