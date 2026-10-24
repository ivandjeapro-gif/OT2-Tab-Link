/**
 * Parseur de trames NMEA 0183 (format standard des capteurs GNSS).
 * Gère les phrases courantes : GGA, RMC, GLL, VTG, GSA, GSV, ZDA.
 */

export interface NmeaParsed {
  raw: string;
  /** Type de phrase sans préfixe d'émetteur : GGA, RMC, ... */
  type: string;
  /** Préfixe d'émetteur : GP, GN, GL, GA, GB... */
  talker: string;
  fields: string[];
  checksumOk: boolean;
  /** Heure UTC au format hhmmss[.ss] */
  time?: string;
  /** Date UTC au format ddmmyy */
  date?: string;
  /** Latitude en degrés décimaux (N positif) */
  lat?: number;
  /** Longitude en degrés décimaux (E positif) */
  lon?: number;
  /** Altitude au-dessus du géoïde (mètres) */
  alt?: number;
  /** Nombre de satellites utilisés */
  sat?: number;
  /** Qualité du fix (0-8, champ GGA) */
  quality?: number;
  qualityLabel?: string;
  /** Vitesse sol en km/h */
  speedKmh?: number;
  /** Cap réel en degrés */
  course?: number;
  /** Position/fix considéré valide */
  valid?: boolean;
}

const QUALITY_LABELS: Record<number, string> = {
  0: 'Aucun fix',
  1: 'GPS (SPS)',
  2: 'DGPS',
  3: 'PPS',
  4: 'RTK',
  5: 'RTK flottant',
  6: 'Estimé (DR)',
  7: 'Manuel',
  8: 'Simulation',
};

/** Vérifie le XOR-checksum d'une phrase NMEA ($...*HH). */
export function validateChecksum(raw: string): boolean {
  const m = raw.match(/^\$([^*]+)\*([0-9A-Fa-f]{2})$/);
  if (!m) return false;
  let sum = 0;
  for (let i = 0; i < m[1].length; i++) sum ^= m[1].charCodeAt(i);
  return sum === parseInt(m[2], 16);
}

/** Construit une phrase NMEA valide avec checksum à partir d'un corps (sans $ ni *HH). */
export function buildNmea(body: string): string {
  let sum = 0;
  for (let i = 0; i < body.length; i++) sum ^= body.charCodeAt(i);
  return `$${body}*${sum.toString(16).toUpperCase().padStart(2, '0')}`;
}

/** Convertit une coordonnée NMEA (ddmm.mmmm / dddmm.mmmm) en degrés décimaux. */
function nmeaCoord(
  value: string | undefined,
  hemi: string | undefined,
  isLat: boolean
): number | undefined {
  if (!value) return undefined;
  const degDigits = isLat ? 2 : 3;
  if (value.length < degDigits + 2) return undefined;
  const deg = parseInt(value.slice(0, degDigits), 10);
  const min = parseFloat(value.slice(degDigits));
  if (!Number.isFinite(deg) || !Number.isFinite(min)) return undefined;
  let dec = deg + min / 60;
  const h = (hemi || '').toUpperCase();
  if (h === 'S' || h === 'W') dec = -dec;
  return Math.round(dec * 1e7) / 1e7;
}

function toFloat(v: string | undefined): number | undefined {
  if (v === undefined || v === '') return undefined;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : undefined;
}

function toInt(v: string | undefined): number | undefined {
  if (v === undefined || v === '') return undefined;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : undefined;
}

/** Analyse une ligne NMEA et en extrait les informations utiles. */
export function parseNmea(rawLine: string): NmeaParsed {
  const clean = rawLine.trim();
  const base: NmeaParsed = {
    raw: clean,
    type: 'AUTRE',
    talker: '',
    fields: [],
    checksumOk: false,
  };
  if (!clean.startsWith('$') && !clean.startsWith('!')) return base;

  const star = clean.indexOf('*');
  const body = star >= 0 ? clean.slice(1, star) : clean.slice(1);
  const fields = body.split(',');
  const addr = fields[0] || '';
  const talker = addr.length > 2 ? addr.slice(0, 2) : '';
  const type = addr.length > 2 ? addr.slice(2) : addr;
  const f = (i: number) => fields[i];

  const p: NmeaParsed = { ...base, type, talker, fields, checksumOk: validateChecksum(clean) };

  switch (type) {
    case 'GGA': {
      p.time = f(1);
      p.lat = nmeaCoord(f(2), f(3), true);
      p.lon = nmeaCoord(f(4), f(5), false);
      p.quality = toInt(f(6)) ?? 0;
      p.qualityLabel = QUALITY_LABELS[p.quality] ?? `Qualité ${p.quality}`;
      p.sat = toInt(f(7));
      p.alt = toFloat(f(9));
      p.valid = p.quality > 0;
      break;
    }
    case 'RMC': {
      p.time = f(1);
      p.valid = f(2) === 'A';
      p.lat = nmeaCoord(f(3), f(4), true);
      p.lon = nmeaCoord(f(5), f(6), false);
      const knots = toFloat(f(7));
      if (knots !== undefined) p.speedKmh = Math.round(knots * 1.852 * 10) / 10;
      p.course = toFloat(f(8));
      p.date = f(9);
      break;
    }
    case 'GLL': {
      p.lat = nmeaCoord(f(1), f(2), true);
      p.lon = nmeaCoord(f(3), f(4), false);
      p.time = f(5);
      p.valid = f(6) === 'A';
      break;
    }
    case 'VTG': {
      p.course = toFloat(f(1));
      const kmh = toFloat(f(7));
      if (kmh !== undefined) p.speedKmh = kmh;
      p.valid = f(2) === 'A';
      break;
    }
    case 'GSV': {
      p.sat = toInt(f(3));
      break;
    }
    case 'ZDA': {
      p.time = f(1);
      p.date = f(2) + f(3) + f(4);
      break;
    }
    default:
      break;
  }
  return p;
}

/** Formate une latitude décimale en "43° 36.270' N". */
export function formatLat(lat: number): string {
  const h = lat >= 0 ? 'N' : 'S';
  const abs = Math.abs(lat);
  const d = Math.floor(abs);
  const min = (abs - d) * 60;
  return `${d}° ${min.toFixed(3).padStart(6, '0')}' ${h}`;
}

/** Formate une longitude décimale en "1° 26.652' E". */
export function formatLon(lon: number): string {
  const h = lon >= 0 ? 'E' : 'W';
  const abs = Math.abs(lon);
  const d = Math.floor(abs);
  const min = (abs - d) * 60;
  return `${d}° ${min.toFixed(3).padStart(6, '0')}' ${h}`;
}

/** Heure UTC courante au format NMEA hhmmss.ss */
export function utcNmeaTime(d: Date): string {
  const pad = (n: number, l = 2) => String(n).padStart(l, '0');
  return `${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}.00`;
}

/** Date UTC courante au format NMEA ddmmyy */
export function utcNmeaDate(d: Date): string {
  const pad = (n: number, l = 2) => String(n).padStart(l, '0');
  return `${pad(d.getUTCDate())}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCFullYear() % 100)}`;
}

/** Latitude/longitude en chaîne NMEA "ddmm.mmmm" / "dddmm.mmmm" */
export function toNmeaLat(lat: number): string {
  const abs = Math.abs(lat);
  const d = Math.floor(abs);
  const min = (abs - d) * 60;
  return `${String(d).padStart(2, '0')}${min.toFixed(4).padStart(7, '0')}`;
}

export function toNmeaLon(lon: number): string {
  const abs = Math.abs(lon);
  const d = Math.floor(abs);
  const min = (abs - d) * 60;
  return `${String(d).padStart(3, '0')}${min.toFixed(4).padStart(7, '0')}`;
}
