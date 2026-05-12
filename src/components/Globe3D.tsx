"use client";

import { useEffect, useRef, useState } from "react";
import { REAL_ANOMALIES } from "@/lib/real-data";
import { isAtSea } from "@/lib/sea-filter";

const SEVERITY_COLORS: Record<string, string> = {
  critical: "#dc2626",
  high:     "#f97316",
  medium:   "#eab308",
  low:      "#84cc16",
};

const SEVERITY_RADIUS: Record<string, number> = {
  critical: 0.55,
  high:     0.42,
  medium:   0.32,
  low:      0.24,
};

// Construire les points en ne gardant que les anomalies en mer
const ALL_POINTS = REAL_ANOMALIES.filter((a) => isAtSea(a.lat, a.lon)).map((a) => ({
  id:         a.id,
  lat:        a.lat,
  lng:        a.lon,
  severity:   a.severity,
  type:       a.type,
  vessel:     a.vesselName,
  flag:       a.flag,
  desc:       a.description.substring(0, 90) + (a.description.length > 90 ? "..." : ""),
  color:      SEVERITY_COLORS[a.severity] ?? "#9aa3b5",
  radius:     SEVERITY_RADIUS[a.severity] ?? 0.3,
  confidence: a.confidence,
  source:     a.source,
  isVessel:   a.isVessel,
}));

// Navires identifiés → sphères pleines colorées
const VESSEL_POINTS   = ALL_POINTS.filter((p) => p.isVessel);
// Émetteurs non identifiés (Spoofing) → marqueurs différents
const UNKNOWN_POINTS  = ALL_POINTS.filter((p) => !p.isVessel);

// Anneaux pulsants sur critiques + high (tous types)
const CRITICAL_POINTS = ALL_POINTS.filter(
  (p) => p.severity === "critical" || p.severity === "high"
);

const STATS = {
  vessels:  VESSEL_POINTS.length,
  unknown:  UNKNOWN_POINTS.length,
  total:    ALL_POINTS.length,
  critical: ALL_POINTS.filter((p) => p.severity === "critical").length,
  high:     ALL_POINTS.filter((p) => p.severity === "high").length,
  medium:   ALL_POINTS.filter((p) => p.severity === "medium").length,
  low:      ALL_POINTS.filter((p) => p.severity === "low").length,
};

export function Globe3D() {
  const containerRef    = useRef<HTMLDivElement>(null);
  const globeRef        = useRef<any>(null);
  const [selected, setSelected] = useState<(typeof ALL_POINTS)[0] | null>(null);
  const [loaded, setLoaded]     = useState(false);

  // Initialisation globe.gl dans un sous-div isolé (React ne gère pas ses enfants)
  // Evite NotFoundError removeChild au démontage du composant
  useEffect(() => {
    if (!containerRef.current) return;
    let isMounted = true;

    // Sous-conteneur créé manuellement hors du DOM React
    const subDiv = document.createElement("div");
    subDiv.style.cssText = "position:absolute;inset:0;width:100%;height:100%";
    containerRef.current.appendChild(subDiv);

    import("globe.gl").then(({ default: Globe }) => {
      if (!isMounted) { subDiv.remove(); return; }

      const container = subDiv;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const GlobeFactory = Globe as any;
      const globe: any = GlobeFactory({ rendererConfig: { antialias: true, alpha: true } })(container);
      globeRef.current = globe;

      const TOOLTIP = (d: any) =>
        `<div style="font-family:monospace;font-size:11px;background:#0d1a2a;border:1px solid ${d.color};border-radius:4px;padding:6px 10px;color:#e2e8f0;min-width:190px;pointer-events:none;">
          <div style="display:flex;align-items:center;gap:5px;margin-bottom:3px;">
            <span style="font-size:13px;">${d.isVessel ? "🚢" : "📡"}</span>
            <span style="color:${d.color};font-weight:700;text-transform:uppercase;">${d.severity} · ${Math.round(d.confidence * 100)}%</span>
          </div>
          <div style="font-weight:600;margin:2px 0;">${d.vessel}</div>
          <div style="color:#94a3b8;font-size:10px;">${d.flag}</div>
          <div style="color:#64748b;font-size:10px;margin-top:2px;">${d.type}</div>
          <div style="color:#334155;font-size:9px;margin-top:2px;">${d.source}</div>
        </div>`;

      const onPointClick = (point: any) => {
        if (isMounted) setSelected(point);
        globe.controls().autoRotate = false;
        globe.pointOfView({ lat: point.lat, lng: point.lng, altitude: 1.6 }, 700);
      };

      globe
        .width(container.clientWidth || 800)
        .height(container.clientHeight || 600)
        .backgroundColor("#000d1a")
        .globeImageUrl("//unpkg.com/three-globe/example/img/earth-blue-marble.jpg")
        .bumpImageUrl("//unpkg.com/three-globe/example/img/earth-topology.png")
        .showAtmosphere(true)
        .atmosphereColor("#0ea5e9")
        .atmosphereAltitude(0.15)
        /* ── Navires identifiés → sphères pleines colorées ── */
        .pointsData(VESSEL_POINTS)
        .pointColor((d: any) => d.color)
        .pointRadius((d: any) => d.radius)
        .pointAltitude(0.02)
        .pointResolution(8)
        .pointLabel(TOOLTIP)
        .onPointClick(onPointClick)
        /* ── Émetteurs non identifiés → marqueurs HTML losange blanc ── */
        .htmlElementsData(UNKNOWN_POINTS)
        .htmlElement((d: any) => {
          const size = d.severity === "critical" ? 14 : d.severity === "high" ? 12 : 10;
          const el = document.createElement("div");
          el.innerHTML = `
            <svg width="${size + 4}" height="${size + 4}" viewBox="0 0 ${size + 4} ${size + 4}" style="cursor:pointer;filter:drop-shadow(0 0 3px ${d.color})">
              <polygon points="${(size + 4) / 2},2 ${size + 2},${(size + 4) / 2} ${(size + 4) / 2},${size + 2} 2,${(size + 4) / 2}"
                fill="none" stroke="${d.color}" stroke-width="1.8"/>
              <line x1="4" y1="4" x2="${size}" y2="${size}" stroke="${d.color}" stroke-width="1.2"/>
              <line x1="${size}" y1="4" x2="4" y2="${size}" stroke="${d.color}" stroke-width="1.2"/>
            </svg>`;
          el.style.cssText = "position:absolute;transform:translate(-50%,-50%);pointer-events:auto";
          el.title = `${d.vessel} — ${d.type}`;
          el.addEventListener("click", () => onPointClick(d));
          return el;
        })
        /* ── Anneaux pulsants critiques + high ── */
        .ringsData(CRITICAL_POINTS)
        .ringColor((d: any) => d.severity === "critical" ? "#dc2626bb" : "#f97316aa")
        .ringMaxRadius((d: any) => d.severity === "critical" ? 3.5 : 2.2)
        .ringPropagationSpeed((d: any) => d.severity === "critical" ? 3.5 : 2.5)
        .ringRepeatPeriod((d: any) => d.severity === "critical" ? 600 : 900)
        .ringAltitude(0.001);

      /* Rotation automatique */
      const controls = globe.controls();
      controls.autoRotate      = true;
      controls.autoRotateSpeed = 0.35;
      controls.enableDamping   = true;
      controls.dampingFactor   = 0.08;
      controls.minDistance     = 150;
      controls.maxDistance     = 600;

      globe.pointOfView({ lat: 20, lng: 10, altitude: 2.4 }, 800);

      if (isMounted) setLoaded(true);
    });

    return () => {
      isMounted = false;
      const g = globeRef.current;
      if (g) {
        try {
          const ctrl = g.controls?.();
          if (ctrl) ctrl.enabled = false;
        } catch (_) {}
        try {
          g.pauseAnimation?.();
        } catch (_) {}
        try {
          g._destructor?.();
        } catch (_) {}
        try {
          const r = g.renderer?.();
          const el = r?.domElement;
          if (el?.parentNode) {
            el.parentNode.removeChild(el);
          }
          r?.dispose?.();
        } catch (_) {}
        globeRef.current = null;
      }
      try {
        subDiv.remove();
      } catch (_) {}
    };
  }, []);

  // Resize observer
  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver(() => {
      const g = globeRef.current;
      const c = containerRef.current;
      if (g && c) g.width(c.clientWidth).height(c.clientHeight);
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  const handleClose = () => {
    setSelected(null);
    if (globeRef.current) globeRef.current.controls().autoRotate = true;
  };

  const handleGlobeClick = () => {
    if (!selected) return;
    handleClose();
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-[#000d1a] relative overflow-hidden"
      onClick={handleGlobeClick}
    >
      {/* Loading state */}
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div className="text-center space-y-3">
            <div className="w-10 h-10 border-2 border-[#0ea5e9]/30 border-t-[#0ea5e9] rounded-full animate-spin mx-auto" />
            <div className="text-[#4a6fa5] text-xs font-mono tracking-widest">
              CHARGEMENT GLOBE 3D...
            </div>
          </div>
        </div>
      )}

      {/* Panneau légende + stats */}
      <div className="absolute top-3 left-3 pointer-events-none z-20 space-y-2">

        {/* Légende type de point */}
        <div className="bg-[#000d1a]/90 border border-[#1e3a5f]/60 rounded-sm px-3 py-2 backdrop-blur-sm">
          <div className="text-[10px] font-mono text-[#4a6fa5] tracking-widest mb-2">LÉGENDE</div>
          {/* Navire identifié */}
          <div className="flex items-center gap-2 mb-1.5">
            <svg width="12" height="12" viewBox="0 0 12 12">
              <circle cx="6" cy="6" r="5" fill="#60a5fa"/>
            </svg>
            <span className="text-[10px] font-mono text-[#94a3b8]">Navire identifié</span>
            <span className="text-[10px] font-mono text-[#60a5fa] ml-auto">{STATS.vessels}</span>
          </div>
          {/* Émetteur non identifié */}
          <div className="flex items-center gap-2">
            <svg width="12" height="12" viewBox="0 0 12 12">
              <polygon points="6,1 11,6 6,11 1,6" fill="none" stroke="#a855f7" strokeWidth="1.5"/>
              <line x1="3" y1="3" x2="9" y2="9" stroke="#a855f7" strokeWidth="1"/>
              <line x1="9" y1="3" x2="3" y2="9" stroke="#a855f7" strokeWidth="1"/>
            </svg>
            <span className="text-[10px] font-mono text-[#94a3b8]">Émetteur non identifié</span>
            <span className="text-[10px] font-mono text-[#a855f7] ml-auto">{STATS.unknown}</span>
          </div>
          {/* Séparateur */}
          <div className="border-t border-[#1e3a5f]/40 mt-2 pt-1.5 space-y-1">
            <div className="text-[9px] font-mono text-[#334155]">Couleur = niveau de menace</div>
            <div className="flex gap-2">
              {[["#dc2626","C"],["#f97316","H"],["#eab308","M"],["#84cc16","F"]].map(([c,l]) => (
                <div key={l} className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full inline-block flex-shrink-0" style={{background: c}}/>
                  <span className="text-[9px] font-mono" style={{color: c}}>{l}</span>
                </div>
              ))}
              <span className="text-[9px] font-mono text-[#334155] ml-1">Critique·Haut·Moyen·Faible</span>
            </div>
          </div>
        </div>

        {/* Stats compteurs */}
        <div className="bg-[#000d1a]/85 border border-[#1e3a5f]/60 rounded-sm px-3 py-2 backdrop-blur-sm">
          <div className="text-[10px] font-mono text-[#4a6fa5] tracking-widest mb-2">SURVEILLANCE MONDIALE</div>
          <StatRow color="#dc2626" label="CRITIQUE" count={STATS.critical} />
          <StatRow color="#f97316" label="ÉLEVÉE"   count={STATS.high} />
          <StatRow color="#eab308" label="MOYENNE"  count={STATS.medium} />
          <StatRow color="#84cc16" label="FAIBLE"   count={STATS.low} />
          <div className="border-t border-[#1e3a5f]/40 mt-2 pt-1.5 text-[10px] font-mono text-[#4a6fa5]">
            {STATS.total} anomalies · données réelles
          </div>
        </div>
      </div>

      {/* Panneau détail alerte sélectionnée */}
      {selected && (
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="bg-[#000d1a]/92 border rounded-sm px-4 py-3 min-w-[320px] backdrop-blur-sm"
            style={{ borderColor: selected.color + "66" }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base">{(selected as any).isVessel ? "🚢" : "📡"}</span>
                  <span
                    className="text-[10px] font-mono tracking-widest"
                    style={{ color: selected.color }}
                  >
                    {selected.severity.toUpperCase()} · {Math.round(selected.confidence * 100)}%
                  </span>
                  <span className="text-[9px] font-mono text-[#475569] ml-auto">
                    {(selected as any).isVessel ? "NAVIRE IDENTIFIÉ" : "ÉMETTEUR NON IDENTIFIÉ"}
                  </span>
                </div>
                <div className="text-sm font-mono text-[#e2e8f0] font-bold">{selected.vessel}</div>
                <div className="text-[11px] text-[#94a3b8] mt-0.5">{selected.flag}</div>
                <div className="text-[11px] text-[#64748b] mt-0.5">{selected.type}</div>
                <div className="text-[10px] text-[#475569] mt-1.5 leading-relaxed max-w-[260px]">
                  {selected.desc}
                </div>
                <div className="text-[9px] text-[#1e3a5f] mt-1">Source : {selected.source}</div>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="text-[#334155] hover:text-[#94a3b8] text-xs font-mono mt-0.5 flex-shrink-0"
              >
                ✕
              </button>
            </div>
            <div className="mt-2 text-[9px] font-mono text-[#1e3a5f]">
              {selected.lat.toFixed(4)}°N · {selected.lng.toFixed(4)}°E · MMSI {selected.id}
            </div>
          </div>
        </div>
      )}

      {/* Hint */}
      {loaded && !selected && (
        <div className="absolute bottom-3 right-3 pointer-events-none z-20">
          <div className="text-[9px] font-mono text-[#1e3a5f] text-right space-y-0.5">
            <div>Glisser pour tourner · Molette pour zoomer</div>
            <div>Cliquer sur une alerte pour le détail</div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatRow({
  color,
  label,
  count,
}: {
  color: string;
  label: string;
  count: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ background: color }}
      />
      <span className="text-[10px] font-mono text-[#64748b] w-14">{label}</span>
      <span className="text-[10px] font-mono" style={{ color }}>
        {count}
      </span>
    </div>
  );
}
