'use client';

import { useGnssStore, type GnssRole } from './gnss-store';

/**
 * Injecte un texte multi-lignes (mode manuel : trames relayées par un
 * autre canal, copiées depuis un terminal série, etc.) et retourne le
 * nombre de trames NMEA acceptées.
 */
export function injectManual(text: string, role: GnssRole): number {
  const store = useGnssStore.getState();
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.startsWith('$') || l.startsWith('!'));
  for (const line of lines) {
    store.ingestLine(line, role);
  }
  return lines.length;
}
