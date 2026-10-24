'use client';

import { useGnssStore } from './gnss-store';

/**
 * Injecte un texte multi-lignes (mode manuel : trames relayées par un
 * autre canal, copiées depuis un terminal série, etc.) et retourne le
 * nombre de trames NMEA acceptées.
 */
export function injectManual(text: string): number {
  const store = useGnssStore.getState();
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.startsWith('$') || l.startsWith('!'));
  for (const line of lines) {
    store.ingestLine(line);
  }
  return lines.length;
}
