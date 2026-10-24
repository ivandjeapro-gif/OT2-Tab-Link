'use client';

import { useGnssStore } from './gnss-store';
import { buildNmea, toNmeaLat, toNmeaLon, utcNmeaTime, utcNmeaDate } from './nmea';

/** Injecte un texte multi-lignes (mode manuel) et retourne le nombre de trames acceptées. */
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

// ─────────────────────────────────────────────────────────
// Mode démo : simule un récepteur GNSS à 1 Hz (7 trames/s)
// ─────────────────────────────────────────────────────────
let timer: ReturnType<typeof setInterval> | null = null;
const sim = {
  lat: 43.60452,
  lon: 1.44424,
  alt: 146.0,
  sat: 9,
  speed: 12.4,
  course: 87.4,
  hdop: 0.9,
};

function tickDemo() {
  const s = useGnssStore.getState();
  if (!s.demoRunning) return;
  if (s.listeningPaused) return;

  sim.course = (sim.course + (Math.random() - 0.5) * 4 + 360) % 360;
  const rad = (sim.course * Math.PI) / 180;
  const step = (sim.speed / 3_600) * 0.0003;
  sim.lat += Math.cos(rad) * step * 30;
  sim.lon += (Math.sin(rad) * step * 30) / Math.cos((sim.lat * Math.PI) / 180);
  sim.speed = Math.max(0, Math.min(50, sim.speed + (Math.random() - 0.5) * 1.5));
  sim.alt += (Math.random() - 0.5) * 0.4;
  if (Math.random() < 0.1) {
    sim.sat = Math.max(4, Math.min(14, sim.sat + (Math.random() < 0.5 ? -1 : 1)));
  }

  const now = new Date();
  const t = utcNmeaTime(now);
  const date = utcNmeaDate(now);
  const latS = toNmeaLat(sim.lat);
  const latH = sim.lat >= 0 ? 'N' : 'S';
  const lonS = toNmeaLon(sim.lon);
  const lonH = sim.lon >= 0 ? 'E' : 'W';
  const fix = sim.sat >= 4 ? 1 : 0;
  const knots = (sim.speed / 1.852).toFixed(2);
  const magCourse = ((sim.course + 2.1 + 360) % 360).toFixed(1);

  s.ingestLine(
    buildNmea(
      `GPGGA,${t},${latS},${latH},${lonS},${lonH},${fix},${String(sim.sat).padStart(2, '0')},${sim.hdop.toFixed(1)},${sim.alt.toFixed(1)},M,46.9,M,,`
    )
  );
  s.ingestLine(
    buildNmea(`GPRMC,${t},A,${latS},${latH},${lonS},${lonH},${knots},${sim.course.toFixed(1)},${date},,,A`)
  );
  s.ingestLine(buildNmea('GPGSA,A,3,04,05,,09,12,,,24,,,,,2.5,1.3,2.1'));
  s.ingestLine(
    buildNmea(`GPVTG,${sim.course.toFixed(1)},T,${magCourse},M,${(sim.speed / 1.852).toFixed(1)},N,${sim.speed.toFixed(1)},K`)
  );
  s.ingestLine(buildNmea(`GPGLL,${latS},${latH},${lonS},${lonH},${t},A`));
  s.ingestLine(buildNmea('GPGSV,3,1,11,03,03,111,00,04,15,270,42,06,01,010,00,13,06,292,35'));
  s.ingestLine(buildNmea('GPGSV,3,2,11,23,28,092,38,07,42,141,44,08,09,181,26,09,52,302,41'));
}

export function startDemo() {
  if (timer) return;
  useGnssStore.getState().setDemoRunning(true);
  tickDemo();
  timer = setInterval(tickDemo, 1000);
}

export function stopDemo() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  useGnssStore.getState().setDemoRunning(false);
}
