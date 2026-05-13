import { VESSELS, Vessel, SENSORS, Sensor } from "./data";

// ============================================================
// IDENTIFICATION PASSIVE
// Distance euclidienne normalisée entre une signature et chaque profil
// ============================================================
export type SignatureInput = {
  frequency: number;
  bandwidth: number;
  power: number;
  modulation?: string;
  pulsePattern?: string;
};

export type IdentificationResult = {
  rank: number;
  vessel: Vessel;
  distance: number;
  confidence: number;
  matchedFeatures: { feature: string; deviation: number }[];
};

// Mean/Std globaux pour normalisation (calculés sur la base de profils fournie)
function computeStats(profiles: Vessel[]) {
  const freqs = profiles.map((v) => v.freqMean);
  const bws = profiles.map((v) => v.bandwidthMean);
  const pws = profiles.map((v) => v.powerMean);
  const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length;
  const std = (a: number[], m: number) =>
    Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / a.length) || 1;
  const fm = mean(freqs);
  const bm = mean(bws);
  const pm = mean(pws);
  return {
    fm,
    fs: std(freqs, fm),
    bm,
    bs: std(bws, bm),
    pm,
    ps: std(pws, pm),
  };
}

// Identification passive (Q12) : k-NN — distance euclidienne sur (frequency, bandwidth,
// power) standardisés par l'écart-type des moyennes de la base, + bonus si modulation /
// pulse_pattern correspondent. Par défaut : base de profils RF réelle (994 navires).
export function identifyVessel(
  input: SignatureInput,
  topN = 5,
  profiles: Vessel[] = VESSELS
): IdentificationResult[] {
  const { fm, fs, bm, bs, pm, ps } = computeStats(profiles);

  const candidates = profiles.map((v) => {
    const df = (input.frequency - v.freqMean) / fs;
    const db = (input.bandwidth - v.bandwidthMean) / bs;
    const dp = (input.power - v.powerMean) / ps;
    let distance = Math.sqrt(df * df + db * db + dp * dp);

    // Bonus si modulation correspond
    if (input.modulation && input.modulation === v.dominantModulation) {
      distance *= 0.85;
    }
    if (input.pulsePattern && input.pulsePattern === v.dominantPulse) {
      distance *= 0.9;
    }

    const confidence = 1 / (1 + distance);

    return {
      vessel: v,
      distance,
      confidence,
      matchedFeatures: [
        { feature: "frequency", deviation: input.frequency - v.freqMean },
        { feature: "bandwidth", deviation: input.bandwidth - v.bandwidthMean },
        { feature: "power", deviation: input.power - v.powerMean },
      ],
    };
  })
    .sort((a, b) => a.distance - b.distance)
    .slice(0, topN)
    .map((c, i) => ({ ...c, rank: i + 1 }));

  return candidates;
}

// ============================================================
// TRIANGULATION RF — multilatération par RSSI
// Méthode : on a 3+ capteurs qui reçoivent le signal avec une puissance différente.
// La distance se déduit du path loss (free-space).
// Position estimée = barycentre pondéré par 1/d².
// ============================================================
export type TriangulationInput = {
  // Pour chaque capteur, la puissance reçue (RSSI) en dBm
  measurements: { sensorId: string; rssi: number }[];
  // Puissance émise estimée (par défaut 300 W = 54.77 dBm)
  emittedPowerDbm?: number;
};

export type TriangulationResult = {
  lat: number;
  lon: number;
  uncertaintyKm: number; // CEP — Circular Error Probable
  sensorsUsed: { sensor: Sensor; rssi: number; estimatedDistanceKm: number }[];
};

function pathLossToDistance(rssi: number, emittedDbm: number, freqMhz = 157): number {
  // Path loss Free-space: PL(dB) = 32.45 + 20log10(f_MHz) + 20log10(d_km)
  // PL = emitted - received
  const pl = emittedDbm - rssi;
  const exponent = (pl - 32.45 - 20 * Math.log10(freqMhz)) / 20;
  return Math.pow(10, exponent);
}

export function triangulate(input: TriangulationInput): TriangulationResult | null {
  const emitted = input.emittedPowerDbm ?? 54.77;
  const used: TriangulationResult["sensorsUsed"] = [];

  for (const m of input.measurements) {
    const sensor = SENSORS.find((s) => s.id === m.sensorId);
    if (!sensor) continue;
    const d = pathLossToDistance(m.rssi, emitted);
    used.push({ sensor, rssi: m.rssi, estimatedDistanceKm: d });
  }

  if (used.length < 2) return null;

  // Pondération par 1/distance² (capteur plus proche = plus influent)
  let sumW = 0;
  let sumLat = 0;
  let sumLon = 0;
  for (const u of used) {
    const w = 1 / Math.max(u.estimatedDistanceKm ** 2, 0.01);
    sumW += w;
    sumLat += u.sensor.lat * w;
    sumLon += u.sensor.lon * w;
  }

  const lat = sumLat / sumW;
  const lon = sumLon / sumW;

  // CEP approximé : moyenne des distances estimées / nb capteurs
  const cep =
    used.reduce((s, u) => s + u.estimatedDistanceKm, 0) / (used.length * 4);

  return { lat, lon, uncertaintyKm: cep, sensorsUsed: used };
}

// Haversine en km
export function haversine(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// ============================================================
// FORMATAGE
// ============================================================
export function fmtMmsi(m: number): string {
  return m.toString().replace(/(\d{3})(\d{3})(\d{3})/, "$1·$2·$3");
}

export function severityColor(sev: string): string {
  return (
    {
      critical: "text-alert-critical",
      high: "text-alert-high",
      medium: "text-alert-medium",
      low: "text-alert-low",
    }[sev] ?? "text-steel-300"
  );
}

export function severityBg(sev: string): string {
  return (
    {
      critical: "bg-alert-critical/10 border-alert-critical/40",
      high: "bg-alert-high/10 border-alert-high/30",
      medium: "bg-alert-medium/10 border-alert-medium/30",
      low: "bg-alert-low/10 border-alert-low/30",
    }[sev] ?? "bg-ink-800 border-ink-600"
  );
}

export function formatTimeAgo(iso: string): string {
  const now = Date.now();
  const t = new Date(iso).getTime();
  const diff = Math.max(0, (now - t) / 1000);
  if (diff < 60) return `${Math.round(diff)}s`;
  if (diff < 3600) return `${Math.round(diff / 60)}m`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h`;
  return `${Math.round(diff / 86400)}j`;
}
