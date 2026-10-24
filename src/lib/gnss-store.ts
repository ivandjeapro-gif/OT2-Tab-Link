'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuid } from 'uuid';
import { parseNmea } from './nmea';

export interface GnssFrame {
  id: string;
  /** Époque ms de réception */
  receivedAt: number;
  raw: string;
  type: string;
  talker: string;
  checksumOk: boolean;
  time?: string;
  date?: string;
  lat?: number;
  lon?: number;
  alt?: number;
  sat?: number;
  quality?: number;
  qualityLabel?: string;
  speedKmh?: number;
  course?: number;
  valid?: boolean;
}

export interface QueueItem {
  id: string;
  frame: GnssFrame;
  attempts: number;
  nextAttemptAt: number;
}

export interface SendLogEntry {
  id: string;
  at: number;
  ok: boolean;
  count: number;
  detail: string;
}

const FRAMES_CAP = 80;
const QUEUE_CAP = 1000;

interface GnssState {
  // ── Connexion / source ──────────────────────────────
  connected: boolean;
  deviceName: string;
  demoRunning: boolean;
  listeningPaused: boolean;

  // ── Données volatiles ───────────────────────────────
  frames: GnssFrame[];
  position: GnssFrame | null;
  speedKmh: number | null;
  course: number | null;
  lastAlt: number | null;
  lastSat: number | null;
  rateWindow: number[];

  // ── Compteurs (persistés) ───────────────────────────
  totalCount: number;
  typeCounts: Record<string, number>;
  checksumOkCount: number;
  checksumBadCount: number;
  startedAt: number | null;

  // ── Redirection (persistés sauf file récente) ───────
  queue: QueueItem[];
  forwardedCount: number;
  failedCount: number;
  lastSendAt: number | null;
  lastSendOk: boolean | null;
  lastResponse: string;
  sending: boolean;
  sendLog: SendLogEntry[];

  // ── Réglages (persistés) ────────────────────────────
  gasUrl: string;
  secret: string;
  autoForward: boolean;
  batchMode: boolean;
  batchIntervalSec: number;
  customServiceUuid: string;
  customCharUuid: string;

  // ── Actions ─────────────────────────────────────────
  ingestLine: (line: string) => void;
  resetCounters: () => void;
  clearFrames: () => void;
  flushQueue: (force?: boolean) => Promise<void>;
  clearQueue: () => void;
  resetSendStats: () => void;
  testConnection: () => Promise<void>;
  setConnected: (v: boolean, name?: string) => void;
  setDemoRunning: (v: boolean) => void;
  toggleListeningPaused: () => void;
  setGasUrl: (v: string) => void;
  setSecret: (v: string) => void;
  setAutoForward: (v: boolean) => void;
  setBatchMode: (v: boolean) => void;
  setBatchIntervalSec: (v: number) => void;
  setCustomServiceUuid: (v: string) => void;
  setCustomCharUuid: (v: string) => void;
}

export const useGnssStore = create<GnssState>()(
  persist(
    (set, get) => ({
      connected: false,
      deviceName: '',
      demoRunning: false,
      listeningPaused: false,

      frames: [],
      position: null,
      speedKmh: null,
      course: null,
      lastAlt: null,
      lastSat: null,
      rateWindow: [],

      totalCount: 0,
      typeCounts: {},
      checksumOkCount: 0,
      checksumBadCount: 0,
      startedAt: null,

      queue: [],
      forwardedCount: 0,
      failedCount: 0,
      lastSendAt: null,
      lastSendOk: null,
      lastResponse: '',
      sending: false,
      sendLog: [],

      gasUrl: '',
      secret: '',
      autoForward: false,
      batchMode: true,
      batchIntervalSec: 30,
      customServiceUuid: '',
      customCharUuid: '',

      // ──────────────────────────────────────────────────
      ingestLine: (line) => {
        const s = get();
        if (s.listeningPaused) return;
        const clean = line.trim();
        if (!clean.startsWith('$') && !clean.startsWith('!')) return;

        const parsed = parseNmea(clean);
        const frame: GnssFrame = { id: uuid(), receivedAt: Date.now(), ...parsed };
        const isPos =
          parsed.type === 'GGA' || parsed.type === 'RMC' || parsed.type === 'GLL';

        set((st) => {
          const now = frame.receivedAt;
          const rateWindow = [...st.rateWindow, now].filter((t) => now - t <= 60_000);
          const frames = [frame, ...st.frames].slice(0, FRAMES_CAP);
          const queue = [
            ...st.queue,
            {
              id: frame.id,
              frame,
              attempts: 0,
              nextAttemptAt: now,
            } as QueueItem,
          ].slice(-QUEUE_CAP);

          return {
            frames,
            queue,
            rateWindow,
            position: isPos ? frame : st.position,
            speedKmh: parsed.speedKmh !== undefined ? parsed.speedKmh : st.speedKmh,
            course: parsed.course !== undefined ? parsed.course : st.course,
            lastAlt:
              parsed.type === 'GGA' && parsed.alt !== undefined ? parsed.alt : st.lastAlt,
            lastSat:
              parsed.type === 'GGA' && parsed.sat !== undefined ? parsed.sat : st.lastSat,
            totalCount: st.totalCount + 1,
            typeCounts: {
              ...st.typeCounts,
              [parsed.type]: (st.typeCounts[parsed.type] || 0) + 1,
            },
            checksumOkCount: st.checksumOkCount + (parsed.checksumOk ? 1 : 0),
            checksumBadCount: st.checksumBadCount + (parsed.checksumOk ? 0 : 1),
            startedAt: st.startedAt ?? now,
          };
        });
      },

      resetCounters: () =>
        set({
          totalCount: 0,
          typeCounts: {},
          checksumOkCount: 0,
          checksumBadCount: 0,
          startedAt: null,
        }),

      clearFrames: () =>
        set({
          frames: [],
          position: null,
          speedKmh: null,
          course: null,
          lastAlt: null,
          lastSat: null,
          rateWindow: [],
        }),

      // ──────────────────────────────────────────────────
      flushQueue: async (force = false) => {
        const s = get();
        if (s.sending) return;
        if (!s.gasUrl.trim()) return;
        if (!force && !s.autoForward) return;
        const now = Date.now();
        const ready = s.queue.filter((q) => q.nextAttemptAt <= now);
        if (!ready.length) return;

        set({ sending: true });
        const payload = {
          secret: s.secret || undefined,
          device: s.deviceName || (s.demoRunning ? 'Mode démo' : 'inconnu'),
          sentAt: new Date().toISOString(),
          messages: ready.map((q) => ({
            receivedAt: new Date(q.frame.receivedAt).toISOString(),
            type: q.frame.type,
            talker: q.frame.talker,
            time: q.frame.time,
            date: q.frame.date,
            lat: q.frame.lat,
            lon: q.frame.lon,
            alt: q.frame.alt,
            sat: q.frame.sat,
            quality: q.frame.quality,
            speedKmh: q.frame.speedKmh,
            course: q.frame.course,
            valid: q.frame.valid,
            checksumOk: q.frame.checksumOk,
            raw: q.frame.raw,
          })),
        };

        try {
          const res = await fetch(s.gasUrl.trim(), {
            method: 'POST',
            redirect: 'follow',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload),
          });
          const text = (await res.text()).slice(0, 200);
          if (!res.ok) throw new Error(`HTTP ${res.status} — ${text}`);
          const readyIds = new Set(ready.map((q) => q.id));
          set((st) => ({
            queue: st.queue.filter((q) => !readyIds.has(q.id)),
            forwardedCount: st.forwardedCount + ready.length,
            lastSendAt: Date.now(),
            lastSendOk: true,
            lastResponse: `HTTP ${res.status} — ${text}`,
            sending: false,
            sendLog: [
              {
                id: uuid(),
                at: Date.now(),
                ok: true,
                count: ready.length,
                detail: `HTTP ${res.status} — ${text}`,
              },
              ...st.sendLog,
            ].slice(0, 30),
          }));
        } catch (err) {
          const backoff = Math.min(60_000, 2_000 * Math.pow(2, Math.min(ready[0].attempts, 5)));
          const readyIds = new Set(ready.map((q) => q.id));
          const detail = String(err instanceof Error ? err.message : err).slice(0, 180);
          set((st) => ({
            queue: st.queue.map((q) =>
              readyIds.has(q.id)
                ? { ...q, attempts: q.attempts + 1, nextAttemptAt: Date.now() + backoff }
                : q
            ),
            failedCount: st.failedCount + 1,
            lastSendAt: Date.now(),
            lastSendOk: false,
            lastResponse: detail,
            sending: false,
            sendLog: [
              { id: uuid(), at: Date.now(), ok: false, count: ready.length, detail },
              ...st.sendLog,
            ].slice(0, 30),
          }));
        }
      },

      clearQueue: () => set({ queue: [] }),

      resetSendStats: () =>
        set({
          forwardedCount: 0,
          failedCount: 0,
          lastSendAt: null,
          lastSendOk: null,
          lastResponse: '',
          sendLog: [],
        }),

      testConnection: async () => {
        const s = get();
        if (!s.gasUrl.trim()) return;
        try {
          const res = await fetch(s.gasUrl.trim(), { method: 'GET', redirect: 'follow' });
          const text = (await res.text()).slice(0, 200);
          set({
            lastSendAt: Date.now(),
            lastSendOk: res.ok,
            lastResponse: `HTTP ${res.status} — ${text}`,
          });
        } catch (err) {
          set({
            lastSendAt: Date.now(),
            lastSendOk: false,
            lastResponse: String(err instanceof Error ? err.message : err).slice(0, 180),
          });
        }
      },

      // ──────────────────────────────────────────────────
      setConnected: (v, name) =>
        set((st) => ({ connected: v, deviceName: name !== undefined ? name : st.deviceName })),
      setDemoRunning: (v) => set({ demoRunning: v }),
      toggleListeningPaused: () => set((st) => ({ listeningPaused: !st.listeningPaused })),
      setGasUrl: (v) => set({ gasUrl: v }),
      setSecret: (v) => set({ secret: v }),
      setAutoForward: (v) => set({ autoForward: v }),
      setBatchMode: (v) => set({ batchMode: v }),
      setBatchIntervalSec: (v) => set({ batchIntervalSec: v }),
      setCustomServiceUuid: (v) => set({ customServiceUuid: v }),
      setCustomCharUuid: (v) => set({ customCharUuid: v }),
    }),
    {
      name: 'gnss-link-v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        // Réglages
        gasUrl: s.gasUrl,
        secret: s.secret,
        autoForward: s.autoForward,
        batchMode: s.batchMode,
        batchIntervalSec: s.batchIntervalSec,
        customServiceUuid: s.customServiceUuid,
        customCharUuid: s.customCharUuid,
        // Compteurs cumulés
        totalCount: s.totalCount,
        typeCounts: s.typeCounts,
        checksumOkCount: s.checksumOkCount,
        checksumBadCount: s.checksumBadCount,
        startedAt: s.startedAt,
        forwardedCount: s.forwardedCount,
        failedCount: s.failedCount,
        // File d'attente plafonnée
        queue: s.queue.slice(-QUEUE_CAP),
      }),
    }
  )
);
