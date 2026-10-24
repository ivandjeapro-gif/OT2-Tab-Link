/**
 * Conversion WGS84 (latitude/longitude) → UTM (Universal Transverse Mercator).
 * Formules de Snyder (ellipsoïde WGS84), précision centimétrique sous 3° du méridien central.
 */

const A = 6378137.0; // demi-grand axe WGS84 (m)
const F = 1 / 298.257223563; // aplatissement WGS84
const E2 = F * (2 - F); // excentricité au carré
const K0 = 0.9996; // facteur d'échelle UTM

const BAND_LETTERS = 'CDEFGHJKLMNPQRSTUVWX';

export interface UtmCoord {
  zone: number;
  band: string;
  hemisphere: 'N' | 'S';
  easting: number;
  northing: number;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function latBand(lat: number): string {
  if (lat < -80 || lat > 84) return '';
  const idx = Math.floor((lat + 80) / 8);
  return BAND_LETTERS[Math.min(idx, BAND_LETTERS.length - 1)];
}

/** Convertit une position WGS84 en coordonnées UTM. */
export function latLonToUtm(lat: number, lon: number): UtmCoord {
  const zone = Math.floor((lon + 180) / 6) + 1;
  const lonOrigin = (zone - 1) * 6 - 180 + 3;

  const latRad = toRad(lat);
  const lonRad = toRad(lon);
  const lonOriginRad = toRad(lonOrigin);

  const eccPrimeSq = E2 / (1 - E2);
  const N = A / Math.sqrt(1 - E2 * Math.sin(latRad) * Math.sin(latRad));
  const T = Math.tan(latRad) * Math.tan(latRad);
  const C = eccPrimeSq * Math.cos(latRad) * Math.cos(latRad);
  const Aterm = Math.cos(latRad) * (lonRad - lonOriginRad);

  const M =
    A *
    ((1 - E2 / 4 - (3 * E2 * E2) / 64 - (5 * E2 * E2 * E2) / 256) * latRad -
      ((3 * E2) / 8 + (3 * E2 * E2) / 32 + (45 * E2 * E2 * E2) / 1024) * Math.sin(2 * latRad) +
      ((15 * E2 * E2) / 256 + (45 * E2 * E2 * E2) / 1024) * Math.sin(4 * latRad) -
      ((35 * E2 * E2 * E2) / 3072) * Math.sin(6 * latRad));

  let easting =
    K0 *
      N *
      (Aterm +
        ((1 - T + C) * Aterm ** 3) / 6 +
        ((5 - 18 * T + T * T + 72 * C - 58 * eccPrimeSq) * Aterm ** 5) / 120) +
    500000.0;

  let northing =
    K0 *
    (M +
      N *
        Math.tan(latRad) *
        ((Aterm * Aterm) / 2 +
          ((5 - T + 9 * C + 4 * C * C) * Aterm ** 4) / 24 +
          ((61 - 58 * T + T * T + 600 * C - 330 * eccPrimeSq) * Aterm ** 6) / 720));

  if (lat < 0) northing += 10000000.0;

  easting = Math.round(easting * 100) / 100;
  northing = Math.round(northing * 100) / 100;

  return { zone, band: latBand(lat), hemisphere: lat >= 0 ? 'N' : 'S', easting, northing };
}

/** Formate en chaîne compacte : "31T 500000.00 E · 4649776.12 N". */
export function formatUtm(u: UtmCoord): string {
  return `${u.zone}${u.band} ${u.easting.toFixed(2)} E · ${u.northing.toFixed(2)} N`;
}
