// Données de référence.
// - VESSELS / SENSORS / VESSEL_POSITIONS / ANOMALIES : décor opérationnel
//   (vrais MMSI préfixés pays, routes méditerranéennes) — utilisé par S/01, S/03, S/04.
// - RADIO_PROFILES / CLUSTER_DATA / FLAG_PROFILES / ML_* : **vrais résultats ML du Sujet 3**
//   (994 navires profilés depuis radio_signatures_large.csv, K-Means K=5, profils pavillon Q10)
//   importés depuis ml-data.ts — utilisé par S/02 « Identification RF ».
import {
  ML_VESSELS,
  ML_CLUSTER_DATA,
  ML_FLAG_PROFILES,
  ML_FLAG_GLOBAL_MEAN,
  ML_META,
  ML_KMEANS_ELBOW,
  ML_PRESETS,
  ML_KPIS,
  ML_RECALL_BY_TYPE,
  ML_TEMPORAL_Q9,
  ML_SILENT_SHIPS,
  ML_TOP_OUTLIERS,
  ML_WATCHLIST,
} from "./ml-data";

export {
  ML_FLAG_GLOBAL_MEAN,
  ML_META,
  ML_KMEANS_ELBOW,
  ML_PRESETS,
  ML_KPIS,
  ML_RECALL_BY_TYPE,
  ML_TEMPORAL_Q9,
  ML_SILENT_SHIPS,
  ML_TOP_OUTLIERS,
  ML_WATCHLIST,
};

export type Vessel = {
  mmsi: number;
  imo: number;
  name: string;
  flag: string;
  type: string;
  length: number;
  width: number;
  yearBuilt: number;
  destination: string;
  historicalNames: string[];
  isSuspicious: boolean;
  // Profil radio agrégé
  freqMean: number; // MHz
  freqStd: number;
  bandwidthMean: number; // kHz
  powerMean: number; // W
  signalStrengthMean: number; // dBm
  snrMean: number; // dB
  dominantModulation: "DSC" | "SSB" | "AM" | "OFDM" | "FM";
  dominantPulse: string;
  nSignatures: number;
};

export type RadioSignature = {
  signatureId: string;
  mmsi: number;
  frequency: number;
  bandwidth: number;
  modulation: Vessel["dominantModulation"];
  power: number;
  timestamp: string;
  lat: number;
  lon: number;
  signalStrength: number;
  noiseLevel: number;
  pulsePattern: string;
  snr: number;
};

export type Sensor = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  type: "côtier" | "frégate" | "satellite";
  status: "actif" | "dégradé" | "inactif";
  rangeKm: number;
};

export type Anomaly = {
  id: string;
  mmsi: number;
  vesselName: string;
  type:
    | "Faux pavillon"
    | "MMSI orphelin"
    | "Saut de fréquence"
    | "AIS désactivé"
    | "Écart de position"
    | "Changement de nom";
  description: string;
  confidence: number; // 0-1
  severity: "critical" | "high" | "medium" | "low";
  timestamp: string;
  lat: number;
  lon: number;
  source: string;
};

// ========== NAVIRES (centrés Méditerranée + zones d'intérêt) ==========
export const VESSELS: Vessel[] = [
  {
    mmsi: 227123450,
    imo: 9521647,
    name: "BOUGAINVILLE",
    flag: "France",
    type: "Bâtiment de soutien",
    length: 199,
    width: 27,
    yearBuilt: 2016,
    destination: "TOULON",
    historicalNames: [],
    isSuspicious: false,
    freqMean: 156.825,
    freqStd: 0.412,
    bandwidthMean: 25.0,
    powerMean: 250,
    signalStrengthMean: -68,
    snrMean: 24.1,
    dominantModulation: "DSC",
    dominantPulse: "Short-Long-Short",
    nSignatures: 14,
  },
  {
    mmsi: 228331600,
    imo: 9778223,
    name: "CMA CGM JACQUES SAADE",
    flag: "France",
    type: "Porte-conteneurs",
    length: 400,
    width: 61,
    yearBuilt: 2020,
    destination: "MARSEILLE",
    historicalNames: [],
    isSuspicious: false,
    freqMean: 157.045,
    freqStd: 0.231,
    bandwidthMean: 25.0,
    powerMean: 320,
    signalStrengthMean: -62,
    snrMean: 28.4,
    dominantModulation: "DSC",
    dominantPulse: "Long-Short-Long",
    nSignatures: 22,
  },
  {
    mmsi: 273456120,
    imo: 9412881,
    name: "URANIA",
    flag: "Russia",
    type: "Tanker",
    length: 244,
    width: 42,
    yearBuilt: 2009,
    destination: "INCONNU",
    historicalNames: ["NEPTUNE STAR", "OCEAN PEARL", "SILVER WAVE"],
    isSuspicious: true,
    freqMean: 162.412,
    freqStd: 1.82,
    bandwidthMean: 31.2,
    powerMean: 410,
    signalStrengthMean: -71,
    snrMean: 18.2,
    dominantModulation: "SSB",
    dominantPulse: "Continuous",
    nSignatures: 8,
  },
  {
    mmsi: 371900000,
    imo: 9302134,
    name: "PANAMA EXPRESS",
    flag: "Panama",
    type: "Cargo",
    length: 180,
    width: 28,
    yearBuilt: 2008,
    destination: "ALGER",
    historicalNames: ["ARCTIC TRADER"],
    isSuspicious: true,
    freqMean: 161.987,
    freqStd: 2.41,
    bandwidthMean: 28.5,
    powerMean: 380,
    signalStrengthMean: -74,
    snrMean: 16.8,
    dominantModulation: "SSB",
    dominantPulse: "Long-Long-Short",
    nSignatures: 11,
  },
  {
    mmsi: 247312900,
    imo: 9456112,
    name: "GRANDE ROMA",
    flag: "Italy",
    type: "Roulier",
    length: 214,
    width: 32,
    yearBuilt: 2011,
    destination: "GENOVA",
    historicalNames: [],
    isSuspicious: false,
    freqMean: 156.912,
    freqStd: 0.34,
    bandwidthMean: 25.0,
    powerMean: 270,
    signalStrengthMean: -65,
    snrMean: 26.1,
    dominantModulation: "DSC",
    dominantPulse: "Short-Long-Short",
    nSignatures: 17,
  },
  {
    mmsi: 538008412,
    imo: 9701884,
    name: "MARSHALL TIDE",
    flag: "Marshall Islands",
    type: "Tanker",
    length: 250,
    width: 44,
    yearBuilt: 2014,
    destination: "PORT-SAÏD",
    historicalNames: ["BLUE MARLIN", "ATLANTIC ROSE"],
    isSuspicious: true,
    freqMean: 159.823,
    freqStd: 1.12,
    bandwidthMean: 27.4,
    powerMean: 355,
    signalStrengthMean: -69,
    snrMean: 20.1,
    dominantModulation: "OFDM",
    dominantPulse: "Long-Short-Long",
    nSignatures: 9,
  },
  {
    mmsi: 235112456,
    imo: 9612344,
    name: "QUEEN ELIZABETH",
    flag: "United Kingdom",
    type: "Croisière",
    length: 294,
    width: 36,
    yearBuilt: 2010,
    destination: "SOUTHAMPTON",
    historicalNames: [],
    isSuspicious: false,
    freqMean: 156.745,
    freqStd: 0.28,
    bandwidthMean: 25.0,
    powerMean: 290,
    signalStrengthMean: -61,
    snrMean: 29.8,
    dominantModulation: "DSC",
    dominantPulse: "Short-Short-Short",
    nSignatures: 19,
  },
  {
    mmsi: 477234890,
    imo: 9523412,
    name: "ORIENTAL PEARL",
    flag: "Hong Kong",
    type: "Porte-conteneurs",
    length: 366,
    width: 51,
    yearBuilt: 2013,
    destination: "MARSEILLE",
    historicalNames: [],
    isSuspicious: false,
    freqMean: 157.214,
    freqStd: 0.41,
    bandwidthMean: 25.0,
    powerMean: 310,
    signalStrengthMean: -64,
    snrMean: 27.2,
    dominantModulation: "DSC",
    dominantPulse: "Long-Short-Long",
    nSignatures: 16,
  },
  {
    mmsi: 636019281,
    imo: 9612099,
    name: "AFRICA STAR",
    flag: "Liberia",
    type: "Cargo",
    length: 185,
    width: 29,
    yearBuilt: 2007,
    destination: "INCONNU",
    historicalNames: ["NORTHERN LIGHT", "PACIFIC DAWN", "SEA FALCON", "AURORA II"],
    isSuspicious: true,
    freqMean: 163.124,
    freqStd: 2.84,
    bandwidthMean: 33.1,
    powerMean: 425,
    signalStrengthMean: -76,
    snrMean: 14.2,
    dominantModulation: "SSB",
    dominantPulse: "Continuous",
    nSignatures: 6,
  },
  {
    mmsi: 226998000,
    imo: 9778991,
    name: "DIXMUDE",
    flag: "France",
    type: "PHA",
    length: 199,
    width: 32,
    yearBuilt: 2012,
    destination: "TOULON",
    historicalNames: [],
    isSuspicious: false,
    freqMean: 156.812,
    freqStd: 0.21,
    bandwidthMean: 25.0,
    powerMean: 280,
    signalStrengthMean: -63,
    snrMean: 28.9,
    dominantModulation: "DSC",
    dominantPulse: "Short-Long-Short",
    nSignatures: 24,
  },
];

// ========== CAPTEURS (stations d'écoute fictives DGA) ==========
export const SENSORS: Sensor[] = [
  {
    id: "STN-TLN-01",
    name: "Toulon — Cap Sicié",
    lat: 43.0698,
    lon: 5.8649,
    type: "côtier",
    status: "actif",
    rangeKm: 80,
  },
  {
    id: "STN-MRS-01",
    name: "Marseille — Pomègues",
    lat: 43.2724,
    lon: 5.3037,
    type: "côtier",
    status: "actif",
    rangeKm: 75,
  },
  {
    id: "STN-AJC-01",
    name: "Ajaccio — La Parata",
    lat: 41.8978,
    lon: 8.6021,
    type: "côtier",
    status: "actif",
    rangeKm: 70,
  },
  {
    id: "FRG-FREMM-AQT",
    name: "FREMM Aquitaine",
    lat: 42.1543,
    lon: 6.8721,
    type: "frégate",
    status: "actif",
    rangeKm: 120,
  },
  {
    id: "SAT-CSO-3",
    name: "Satellite CSO-3 (overpass)",
    lat: 41.5,
    lon: 7.2,
    type: "satellite",
    status: "dégradé",
    rangeKm: 400,
  },
];

// ========== POSITIONS ACTUELLES (pour la carte) ==========
export const VESSEL_POSITIONS: Record<
  number,
  { lat: number; lon: number; speed: number; course: number; aisActive: boolean }
> = {
  227123450: { lat: 43.085, lon: 5.892, speed: 0, course: 0, aisActive: true },
  228331600: { lat: 43.298, lon: 5.341, speed: 12.4, course: 270, aisActive: true },
  273456120: { lat: 42.42, lon: 6.78, speed: 11.2, course: 95, aisActive: false }, // suspect
  371900000: { lat: 41.8, lon: 5.4, speed: 8.5, course: 180, aisActive: false }, // suspect
  247312900: { lat: 43.55, lon: 7.32, speed: 18.1, course: 75, aisActive: true },
  538008412: { lat: 40.9, lon: 7.85, speed: 13.7, course: 105, aisActive: true }, // suspect
  235112456: { lat: 43.71, lon: 4.92, speed: 19.3, course: 280, aisActive: true },
  477234890: { lat: 43.12, lon: 5.61, speed: 15.8, course: 245, aisActive: true },
  636019281: { lat: 41.2, lon: 6.4, speed: 6.2, course: 200, aisActive: false }, // suspect
  226998000: { lat: 43.105, lon: 5.911, speed: 0, course: 0, aisActive: true },
};

// ========== ANOMALIES DÉTECTÉES ==========
export const ANOMALIES: Anomaly[] = [
  {
    id: "ANO-2026-0421",
    mmsi: 273456120,
    vesselName: "URANIA",
    type: "Faux pavillon",
    description:
      "Empreinte radio (162.4 MHz, SSB) incohérente avec pavillon russe déclaré. Profil typique d'émetteurs ex-soviétiques modifiés.",
    confidence: 0.94,
    severity: "critical",
    timestamp: "2026-05-12T08:14:22Z",
    lat: 42.42,
    lon: 6.78,
    source: "Cross-check flag/RF",
  },
  {
    id: "ANO-2026-0419",
    mmsi: 636019281,
    vesselName: "AFRICA STAR",
    type: "Changement de nom",
    description:
      "4 noms historiques enregistrés depuis 2018. Pattern récurrent d'identity laundering observé sur tankers/cargos sanctionnés.",
    confidence: 0.91,
    severity: "critical",
    timestamp: "2026-05-12T07:42:18Z",
    lat: 41.2,
    lon: 6.4,
    source: "Equasis + OFAC",
  },
  {
    id: "ANO-2026-0418",
    mmsi: 371900000,
    vesselName: "PANAMA EXPRESS",
    type: "AIS désactivé",
    description:
      "AIS coupé depuis 32h. Position radio détectée mais aucun signalement AIS. Suspect — destination Alger non confirmée.",
    confidence: 0.87,
    severity: "high",
    timestamp: "2026-05-12T06:15:00Z",
    lat: 41.8,
    lon: 5.4,
    source: "AIS gap detection",
  },
  {
    id: "ANO-2026-0417",
    mmsi: 538008412,
    vesselName: "MARSHALL TIDE",
    type: "Saut de fréquence",
    description:
      "Saut de 156.8 → 159.8 MHz en 4h. Modulation passée de DSC à OFDM. Possible substitution d'équipement RF.",
    confidence: 0.78,
    severity: "high",
    timestamp: "2026-05-12T04:22:11Z",
    lat: 40.9,
    lon: 7.85,
    source: "RF temporal analysis",
  },
  {
    id: "ANO-2026-0416",
    mmsi: 273456120,
    vesselName: "URANIA",
    type: "Écart de position",
    description:
      "Écart 14.2 km entre position AIS déclarée (42.55, 6.92) et triangulation RF (42.42, 6.78).",
    confidence: 0.82,
    severity: "high",
    timestamp: "2026-05-12T03:51:42Z",
    lat: 42.485,
    lon: 6.85,
    source: "AIS vs RF triangulation",
  },
  {
    id: "ANO-2026-0415",
    mmsi: 0,
    vesselName: "INCONNU",
    type: "MMSI orphelin",
    description:
      "Signature radio SIG-04421 (158.2 MHz) sans MMSI associé. Aucun match dans le registre Equasis. Émetteur non-coopératif.",
    confidence: 0.69,
    severity: "medium",
    timestamp: "2026-05-12T02:33:08Z",
    lat: 42.85,
    lon: 7.12,
    source: "Orphan signature",
  },
  {
    id: "ANO-2026-0414",
    mmsi: 636019281,
    vesselName: "AFRICA STAR",
    type: "AIS désactivé",
    description: "AIS off depuis 47h. Trajectoire reconstituée par RF triangulation.",
    confidence: 0.85,
    severity: "high",
    timestamp: "2026-05-11T23:18:00Z",
    lat: 41.2,
    lon: 6.4,
    source: "AIS gap detection",
  },
];

// ========== HISTORIQUE FRÉQUENTIEL (pour onglet 4 — détection saut) ==========
export function generateFrequencyTimeSeries(mmsi: number) {
  const vessel = VESSELS.find((v) => v.mmsi === mmsi);
  if (!vessel) return [];

  const points = 48; // 48h
  const result: { t: string; freq: number; signal: number; anomaly: boolean }[] = [];
  const baseFreq = vessel.freqMean;
  const jumpAt = vessel.mmsi === 538008412 ? 28 : -1; // saut sur MARSHALL TIDE

  for (let i = 0; i < points; i++) {
    const hour = i;
    let freq = baseFreq + (Math.sin(i / 4) * vessel.freqStd) / 3;
    let anomaly = false;
    if (jumpAt > 0 && i >= jumpAt) {
      freq = baseFreq + 3.0 + (Math.random() - 0.5) * 0.4;
      if (i === jumpAt) anomaly = true;
    }
    freq += (Math.random() - 0.5) * 0.3;
    const signal = vessel.signalStrengthMean + (Math.random() - 0.5) * 4;
    result.push({
      t: `H-${(47 - hour).toString().padStart(2, "0")}`,
      freq: parseFloat(freq.toFixed(3)),
      signal: parseFloat(signal.toFixed(1)),
      anomaly,
    });
  }
  return result;
}

// ========== BASE DE PROFILS RADIO (Q1) — données réelles ==========
// 994 navires profilés depuis radio_signatures_large.csv (5 000 signatures).
// Source : sujet3/scripts/export_dashboard_ml.py → src/lib/ml-data.ts
export const RADIO_PROFILES: Vessel[] = ML_VESSELS as unknown as Vessel[];

// ========== CLUSTERS K-MEANS (Q3) — K=5, pipeline StandardScaler + KMeans++ ==========
// Étiquettes réelles du KMeans(n_clusters=5, n_init=10, random_state=42) sur
// (freq_mean, bandwidth_mean, power_mean) standardisés — identique à sujet3/src/cluster.py.
export const CLUSTER_DATA = ML_CLUSTER_DATA;

// ========== FRÉQUENCE MOYENNE PAR PAVILLON (Q10) — données réelles ==========
export const FLAG_PROFILES: { flag: string; meanFreq: number; std: number; n: number }[] =
  ML_FLAG_PROFILES;
