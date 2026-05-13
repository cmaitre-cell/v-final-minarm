"use client";

import { Radio, Crosshair, AlertOctagon, Activity, Shield } from "lucide-react";

export type TabKey = "identification" | "localisation" | "anomalies" | "synthese";

const TABS: { key: TabKey; label: string; icon: React.ReactNode; code: string }[] = [
  {
    key: "synthese",
    label: "Synthèse opérationnelle",
    code: "S/01",
    icon: <Activity className="w-3.5 h-3.5" />,
  },
  {
    key: "identification",
    label: "Identification RF",
    code: "S/02",
    icon: <Radio className="w-3.5 h-3.5" />,
  },
  {
    key: "localisation",
    label: "Localisation & triangulation",
    code: "S/03",
    icon: <Crosshair className="w-3.5 h-3.5" />,
  },
  {
    key: "anomalies",
    label: "Détection d'anomalies",
    code: "S/04",
    icon: <AlertOctagon className="w-3.5 h-3.5" />,
  },
];

export function TopBar({
  active,
  onChange,
  clock,
}: {
  active: TabKey;
  onChange: (k: TabKey) => void;
  clock: string;
}) {
  return (
    <header className="border-b border-ink-700 bg-ink-900">
      {/* Bandeau classification */}
      <div className="classification-banner h-1.5" />

      <div className="px-6 py-3 flex items-center justify-between border-b border-ink-700">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-sm bg-signal/15 border border-signal/40 flex items-center justify-center">
              <Shield className="w-4 h-4 text-signal" />
            </div>
            <div className="leading-tight">
              <div className="font-display font-semibold text-steel-100 text-sm tracking-wide">
                MARITIME RF INTELLIGENCE
              </div>
              <div className="label-tag">
                DGA · Direction générale de l'armement · Cellule SURMAR
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6 text-xs">
          <StatusPill label="Capteurs" value="4 / 5 actifs" tone="ok" />
          <StatusPill label="AIS feed" value="2.4 s latence" tone="ok" />
          <StatusPill label="RF feed" value="42 sigs/h" tone="ok" />
          <div className="text-right">
            <div className="label-tag">UTC</div>
            <div className="font-mono text-steel-100 tabular-nums">{clock}</div>
          </div>
          <span className="px-2 py-1 rounded-sm font-mono text-[10px] tracking-widest text-alert-medium border border-alert-medium/40 bg-alert-medium/10">
            DIFFUSION RESTREINTE
          </span>
        </div>
      </div>

      {/* Onglets */}
      <nav className="px-6 flex gap-1">
        {TABS.map((t) => {
          const isActive = active === t.key;
          return (
            <button
              key={t.key}
              onClick={() => onChange(t.key)}
              className={`
                relative px-4 py-3 text-sm flex items-center gap-2 transition-colors
                ${
                  isActive
                    ? "text-steel-100"
                    : "text-steel-400 hover:text-steel-200"
                }
              `}
            >
              <span className="font-mono text-[10px] text-steel-400">
                {t.code}
              </span>
              {t.icon}
              <span>{t.label}</span>
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-signal" />
              )}
            </button>
          );
        })}
      </nav>
    </header>
  );
}

function StatusPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "ok" | "warn" | "bad";
}) {
  const dot = {
    ok: "bg-alert-nominal",
    warn: "bg-alert-medium",
    bad: "bg-alert-critical",
  }[tone];
  return (
    <div className="flex items-center gap-2">
      <span className={`w-1.5 h-1.5 rounded-full ${dot} animate-pulse_dot`} />
      <div className="leading-tight">
        <div className="label-tag">{label}</div>
        <div className="text-steel-200 font-mono text-[11px]">{value}</div>
      </div>
    </div>
  );
}
