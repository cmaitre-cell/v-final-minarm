"use client";

import Image from "next/image";
import { Radio, Crosshair, AlertOctagon, Activity, Share2 } from "lucide-react";
import { TabKey } from "./TopBar";

const TABS: { key: TabKey; label: string; icon: React.ReactNode; code: string }[] = [
  { key: "synthese",       label: "Synthèse",         code: "S/01", icon: <Activity     className="w-3.5 h-3.5" /> },
  { key: "identification", label: "Identification RF", code: "S/02", icon: <Radio        className="w-3.5 h-3.5" /> },
  { key: "localisation",   label: "Localisation",      code: "S/03", icon: <Crosshair    className="w-3.5 h-3.5" /> },
  { key: "anomalies",      label: "Anomalies",         code: "S/04", icon: <AlertOctagon className="w-3.5 h-3.5" /> },
  { key: "graph",          label: "Graphe",            code: "S/05", icon: <Share2       className="w-3.5 h-3.5" /> },
];

export function HeaderGouv({
  active,
  onChange,
  clock,
}: {
  active: TabKey;
  onChange: (k: TabKey) => void;
  clock: string;
}) {
  return (
    <header
      className="site-header"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 20000,
        background: "#fff",
        boxShadow: "0 1px 0 #E8EAED",
      }}
    >

      {/* ── TIER 1 — bleu Marine Nationale ───────────────────────────────────── */}
      <div style={{ background: "#002654" }}>
        <div style={{ maxWidth: 1600, margin: "0 auto", padding: "10px 36px", display: "flex", alignItems: "center", gap: 20 }}>

          {/* Drapeau + République */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            <div style={{ display: "flex", height: 22, width: 16, borderRadius: 2, overflow: "hidden", flexShrink: 0, boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }}>
              <div style={{ flex: 1, background: "#002395" }} />
              <div style={{ flex: 1, background: "#FFFFFF" }} />
              <div style={{ flex: 1, background: "#ED2939" }} />
            </div>
            <div>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: 13, lineHeight: "1.2" }}>Gouvernement</div>
              <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 11 }}>République Française</div>
            </div>
          </div>

          <div style={{ width: 1, height: 32, background: "rgba(255,255,255,0.2)", flexShrink: 0 }} />

          <div>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 13, lineHeight: "1.2" }}>
              Ministère des Armées et des Anciens Combattants
            </div>
            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 11, letterSpacing: "0.04em", textTransform: "uppercase", marginTop: 1 }}>
              Direction générale de l'armement · Cellule SURMAR
            </div>
          </div>

          <div style={{ marginLeft: "auto", color: "rgba(255,255,255,0.4)", fontSize: 10, fontStyle: "italic", textAlign: "right", lineHeight: 1.7 }}>
            Liberté<br />Égalité<br />Fraternité
          </div>
        </div>
      </div>

      {/* ── TIER 2 — identité app ────────────────────────────────────────────── */}
      <div style={{ background: "#fff", borderBottom: "1px solid #EBEBEB" }}>
        <div style={{ maxWidth: 1600, margin: "0 auto", padding: "14px 36px", display: "flex", alignItems: "center", gap: 18 }}>

          <div style={{ flexShrink: 0, width: 56, height: 56, position: "relative" }}>
            <Image
              src="/logos/marine-nationale.png"
              alt="Marine Nationale"
              fill
              sizes="56px"
              style={{ objectFit: "contain", objectPosition: "center" }}
              priority
            />
          </div>

          <div style={{ width: 3, height: 48, background: "#000091", borderRadius: 99, flexShrink: 0 }} />

          <div>
            <div style={{ color: "#111827", fontWeight: 700, fontSize: 19, letterSpacing: "-0.02em", lineHeight: "1.1" }}>
              RF Intelligence Maritime
            </div>
            <div style={{ color: "#6B7280", fontSize: 12, marginTop: 4 }}>
              Plateforme de surveillance passive · Identification RF & AIS ·{" "}
              <span style={{ color: "#000091", fontWeight: 600 }}>v1.0</span>
            </div>
          </div>

          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 20 }}>

            {/* Horloge */}
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.12em", color: "#9CA3AF", marginBottom: 2 }}>
                UTC
              </div>
              <div style={{ fontSize: 22, color: "#111827", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                {clock}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── TIER 3 — navigation ──────────────────────────────────────────────── */}
      <div style={{ background: "#fff" }}>
        <div style={{ maxWidth: 1600, margin: "0 auto", padding: "0 28px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>

          <nav style={{ display: "flex", gap: 2 }}>
            {TABS.map((t) => {
              const isActive = active === t.key;
              return (
                <button
                  type="button"
                  key={t.key}
                  onClick={() => onChange(t.key)}
                  style={{
                    position: "relative",
                    padding: "13px 20px",
                    fontSize: 13.5,
                    fontFamily: "Marianne, system-ui, sans-serif",
                    fontWeight: isActive ? 700 : 400,
                    color: isActive ? "#000091" : "#6B7280",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    transition: "color 0.15s",
                    outline: "none",
                  }}
                  onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.color = "#000091"; }}
                  onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.color = "#6B7280"; }}
                >
                  <span style={{ fontSize: 9, color: isActive ? "#7B8FDB" : "#C4C9D4", letterSpacing: "0.1em" }}>
                    {t.code}
                  </span>
                  <span style={{ color: isActive ? "#000091" : "#9CA3AF" }}>{t.icon}</span>
                  <span>{t.label}</span>
                  {isActive && (
                    <span style={{
                      position: "absolute", bottom: 0, left: 14, right: 14, height: 2,
                      background: "#000091",
                      borderRadius: "2px 2px 0 0",
                    }} />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Indicateurs — flat, pas de boîte */}
          <div style={{ display: "flex", alignItems: "center", gap: 28, padding: "8px 0" }}>
            <FlatStatus label="Capteurs" value="4 / 5 actifs"  tone="ok" />
            <FlatStatus label="AIS feed"  value="2.4 s latence" tone="ok" />
            <FlatStatus label="RF feed"   value="42 sigs/h"     tone="ok" />
          </div>
        </div>
        <div style={{ height: 1, background: "#E8EAED" }} />
      </div>
    </header>
  );
}

function FlatStatus({ label, value, tone }: { label: string; value: string; tone: "ok" | "warn" | "bad" }) {
  const dotColor = { ok: "#16A34A", warn: "#D97706", bad: "#DC2626" }[tone];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
      <div style={{ width: 6, height: 6, borderRadius: "50%", background: dotColor, flexShrink: 0 }} className="animate-pulse_dot" />
      <div>
        <div style={{ fontSize: 10, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: 12, color: "#374151", fontWeight: 600 }}>{value}</div>
      </div>
    </div>
  );
}
