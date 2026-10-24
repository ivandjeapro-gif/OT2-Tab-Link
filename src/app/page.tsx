'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { PositionTab } from '@/components/gnss/position-tab';
import { SensorTab } from '@/components/gnss/sensor-tab';
import { CounterTab } from '@/components/gnss/counter-tab';
import { ServerTab } from '@/components/gnss/server-tab';
import { useGnssStore } from '@/lib/gnss-store';
import { formatLat, formatLon } from '@/lib/nmea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart3,
  BluetoothConnected,
  MapPin,
  Radar,
  Satellite,
  UploadCloud,
  WifiOff,
} from 'lucide-react';

type TabKey = 'capteur' | 'position' | 'compteur' | 'serveur';

const TABS: Array<{ key: TabKey; label: string; icon: typeof Radar }> = [
  { key: 'capteur', label: 'Capteur', icon: Radar },
  { key: 'position', label: 'Position', icon: MapPin },
  { key: 'compteur', label: 'Compteur', icon: BarChart3 },
  { key: 'serveur', label: 'Serveur', icon: UploadCloud },
];

/** Boucle d'envoi vers Apps Script (tick léger toutes les 1,5 s). */
function Forwarder() {
  useEffect(() => {
    const id = setInterval(() => {
      const s = useGnssStore.getState();
      if (s.autoForward && s.gasUrl.trim() && s.queue.length > 0) {
        void s.flushQueue();
      }
    }, 1500);
    return () => clearInterval(id);
  }, []);
  return null;
}

function useHydrated() {
  return useSyncExternalStore(
    (cb) => useGnssStore.persist.onFinishHydration(cb),
    () => useGnssStore.persist.hasHydrated(),
    () => false
  );
}

export default function Home() {
  const hydrated = useHydrated();
  const [tab, setTab] = useState<TabKey>('capteur');

  const connected = useGnssStore((s) => s.connected);
  const deviceName = useGnssStore((s) => s.deviceName);
  const position = useGnssStore((s) => s.position);
  const totalCount = useGnssStore((s) => s.totalCount);
  const autoForward = useGnssStore((s) => s.autoForward);
  const queueLength = useGnssStore((s) => s.queue.length);

  if (!hydrated) {
    return (
      <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <div className="mx-auto max-w-lg p-4 space-y-4">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      </main>
    );
  }

  const hasPos = position?.lat !== undefined && position?.lon !== undefined;

  const statusBadge = connected ? (
    <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white gap-1 max-w-[45%]">
      <BluetoothConnected className="h-3 w-3 shrink-0" />
      <span className="truncate">{deviceName || 'BLE'}</span>
    </Badge>
  ) : (
    <Badge variant="secondary" className="gap-1">
      <WifiOff className="h-3 w-3" />
      Veille
    </Badge>
  );

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950">
      <Forwarder />

      {/* En-tête */}
      <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-lg px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-emerald-600 flex items-center justify-center shrink-0">
              <Satellite className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-bold leading-tight">GNSS Link</h1>
              <p className="text-xs text-muted-foreground leading-tight">
                Compteur &amp; passerelle Apps Script
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {autoForward && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
            )}
            {statusBadge}
          </div>
        </div>

        {/* Bandeau position */}
        <div className="mx-auto max-w-lg px-4 pb-2 flex items-center justify-between text-xs">
          <span className="font-mono tabular-nums text-muted-foreground truncate">
            {hasPos
              ? `${formatLat(position!.lat!)} · ${formatLon(position!.lon!)}`
              : 'Position en attente de fix…'}
          </span>
          <span className="tabular-nums text-muted-foreground shrink-0 ml-2">
            {totalCount} trame{totalCount > 1 ? 's' : ''}
          </span>
        </div>
      </header>

      {/* Contenu */}
      <main className="flex-1 mx-auto w-full max-w-lg px-4 pt-4 pb-24">
        {tab === 'capteur' && <SensorTab />}
        {tab === 'position' && <PositionTab />}
        {tab === 'compteur' && <CounterTab />}
        {tab === 'serveur' && <ServerTab />}
      </main>

      {/* Navigation basse */}
      <nav
        className="fixed bottom-0 inset-x-0 z-20 border-t bg-background/95 backdrop-blur"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-label="Navigation principale"
      >
        <div className="mx-auto max-w-lg grid grid-cols-4">
          {TABS.map(({ key, label, icon: Icon }) => {
            const active = tab === key;
            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] transition-colors ${
                  active ? 'text-emerald-600 font-semibold' : 'text-muted-foreground'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                <Icon className={`h-5 w-5 ${active ? 'stroke-[2.2]' : ''}`} />
                {label}
                {key === 'serveur' && queueLength > 0 && (
                  <span className="absolute mt-1 ml-6 h-1.5 w-1.5 rounded-full bg-amber-500" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
