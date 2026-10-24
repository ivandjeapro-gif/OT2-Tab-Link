'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useGnssStore, type GnssRole } from '@/lib/gnss-store';
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Activity, CheckCheck, RotateCcw, ShieldCheck, Timer, XOctagon } from 'lucide-react';

interface Point {
  t: string;
  v: number;
}

const ROLES: Array<{ key: GnssRole; label: string }> = [
  { key: 'rover', label: 'Rover' },
  { key: 'base', label: 'Base' },
];

export function CounterTab() {
  const [role, setRole] = useState<GnssRole>('rover');
  const channel = useGnssStore((s) => s.channels[role]);
  const { totalCount, typeCounts, checksumOkCount, checksumBadCount, startedAt } = channel;
  const resetCounters = useGnssStore((s) => s.resetCounters);

  const [hist, setHist] = useState<Point[]>([]);
  const [live, setLive] = useState({ cps: 0, cpm: 0, duration: '—' });

  useEffect(() => {
    const compute = () => {
      const ch = useGnssStore.getState().channels[role];
      const now = Date.now();
      const cps = ch.rateWindow.filter((t) => now - t <= 1000).length;
      const cpm = ch.rateWindow.length;
      let duration = '—';
      if (ch.startedAt) {
        const sec = Math.floor((now - ch.startedAt) / 1000);
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        const r = sec % 60;
        duration = h > 0 ? `${h} h ${m} min` : m > 0 ? `${m} min ${r} s` : `${r} s`;
      }
      setLive({ cps, cpm, duration });
      setHist((prev) => [
        ...prev.slice(-59),
        { t: new Date(now).toLocaleTimeString('fr-FR', { hour12: false }), v: cps },
      ]);
    };
    setHist([]);
    compute();
    const id = setInterval(compute, 1000);
    return () => clearInterval(id);
  }, [role]);

  const typeRows = useMemo(
    () =>
      Object.entries(typeCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([type, count]) => ({
          type,
          count,
          pct: totalCount > 0 ? Math.round((count / totalCount) * 100) : 0,
        })),
    [typeCounts, totalCount]
  );

  const okPct =
    totalCount > 0 ? Math.round((checksumOkCount / totalCount) * 100) : 100;

  return (
    <div className="space-y-4">
      {/* Sélecteur Rover / Base */}
      <div className="grid grid-cols-2 gap-2">
        {ROLES.map((r) => (
          <Button
            key={r.key}
            variant={role === r.key ? 'default' : 'outline'}
            className={role === r.key ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
            onClick={() => setRole(r.key)}
          >
            {r.label}
          </Button>
        ))}
      </div>

      {/* Compteur principal */}
      <Card>
        <CardContent className="pt-6 pb-5">
          <div className="text-center">
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
              Trames reçues — {role === 'rover' ? 'Rover' : 'Base'}
            </p>
            <p className="text-6xl font-bold tabular-nums text-emerald-600">{totalCount}</p>
            <div className="flex justify-center gap-6 mt-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Timer className="h-3.5 w-3.5" />
                Session : {live.duration}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-5">
            <div className="rounded-lg border p-3 text-center">
              <p className="text-2xl font-semibold tabular-nums">{live.cps}</p>
              <p className="text-xs text-muted-foreground">trames / s</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-2xl font-semibold tabular-nums">{live.cpm}</p>
              <p className="text-xs text-muted-foreground">trames / min</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cadence */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4 text-emerald-600" />
            Cadence de réception
          </CardTitle>
          <CardDescription>Trames par seconde — 60 dernières secondes.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-32 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hist} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="rateFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#059669" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#059669" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="t" tick={{ fontSize: 9 }} interval={19} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ fontSize: 11, borderRadius: 8 }}
                  labelStyle={{ color: '#6b7280' }}
                  formatter={(value: number) => [`${value} trame(s)`, 'Cadence']}
                />
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke="#059669"
                  strokeWidth={2}
                  fill="url(#rateFill)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Répartition par type */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Répartition par type de trame</CardTitle>
          <CardDescription>Comptage par phrase NMEA.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2.5">
          {typeRows.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-3">
              Aucune trame comptée pour le moment.
            </p>
          ) : (
            typeRows.map(({ type, count, pct }) => (
              <div key={type}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-mono font-medium">${type}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {count} <span className="text-xs">({pct} %)</span>
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${Math.max(pct, 2)}%` }}
                  />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Intégrité */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            Intégrité des données
          </CardTitle>
          <CardDescription>Validation du checksum XOR de chaque trame.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border p-3 flex items-center gap-2.5">
            <CheckCheck className="h-5 w-5 text-emerald-600 shrink-0" />
            <div>
              <p className="text-xl font-semibold tabular-nums">{checksumOkCount}</p>
              <p className="text-xs text-muted-foreground">valides ({okPct} %)</p>
            </div>
          </div>
          <div className="rounded-lg border p-3 flex items-center gap-2.5">
            <XOctagon className="h-5 w-5 text-red-500 shrink-0" />
            <div>
              <p className="text-xl font-semibold tabular-nums">{checksumBadCount}</p>
              <p className="text-xs text-muted-foreground">invalides</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Réinitialisation */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" className="w-full text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-950">
            <RotateCcw className="h-4 w-4 mr-2" />
            Réinitialiser les compteurs {role === 'rover' ? 'Rover' : 'Base'}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remettre les compteurs à zéro ?</AlertDialogTitle>
            <AlertDialogDescription>
              Les totaux, la répartition par type et les statistiques d&apos;intégrité pour{' '}
              {role === 'rover' ? 'le Rover' : 'la Base'} seront effacés. La file d&apos;attente
              d&apos;envoi et les réglages sont conservés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => resetCounters(role)}
            >
              Réinitialiser
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
