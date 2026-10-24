'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useGnssStore } from '@/lib/gnss-store';
import { formatLat, formatLon } from '@/lib/nmea';
import {
  ArrowUpRight,
  Clock,
  Copy,
  Gauge,
  MapPin,
  Mountain,
  Navigation,
  Satellite,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function PositionTab() {
  const position = useGnssStore((s) => s.position);
  const speedKmh = useGnssStore((s) => s.speedKmh);
  const course = useGnssStore((s) => s.course);
  const lastAlt = useGnssStore((s) => s.lastAlt);
  const lastSat = useGnssStore((s) => s.lastSat);
  const frames = useGnssStore((s) => s.frames);
  const { toast } = useToast();

  const hasPos = position?.lat !== undefined && position?.lon !== undefined;
  const dec = hasPos ? `${position!.lat!.toFixed(6)}, ${position!.lon!.toFixed(6)}` : '';

  const copyCoords = async () => {
    if (!dec) return;
    try {
      await navigator.clipboard.writeText(dec);
      toast({ title: 'Coordonnées copiées', description: dec });
    } catch {
      toast({ title: 'Copie impossible', variant: 'destructive' });
    }
  };

  const posFrames = frames.filter((f) => f.lat !== undefined && f.lon !== undefined).slice(0, 30);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-4 w-4 text-emerald-600" />
            Position courante
          </CardTitle>
          <CardDescription>
            Dernière trame de position reçue (GGA / RMC / GLL).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasPos && position ? (
            <>
              <div className="grid gap-3">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground mb-1">Latitude</p>
                  <p className="text-lg font-semibold tabular-nums">{formatLat(position.lat!)}</p>
                  <p className="text-xs text-muted-foreground tabular-nums mt-0.5">
                    {position.lat!.toFixed(7)}°
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground mb-1">Longitude</p>
                  <p className="text-lg font-semibold tabular-nums">{formatLon(position.lon!)}</p>
                  <p className="text-xs text-muted-foreground tabular-nums mt-0.5">
                    {position.lon!.toFixed(7)}°
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={copyCoords}
                  disabled={!dec}
                >
                  <Copy className="h-3.5 w-3.5 mr-1.5" />
                  Copier
                </Button>
                <a
                  href={`https://www.google.com/maps?q=${position.lat},${position.lon}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1"
                >
                  <Button size="sm" className="w-full bg-emerald-600 hover:bg-emerald-700">
                    <ArrowUpRight className="h-3.5 w-3.5 mr-1.5" />
                    Ouvrir la carte
                  </Button>
                </a>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <Mountain className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Altitude</p>
                    <p className="font-medium tabular-nums">
                      {(position.alt ?? lastAlt) !== undefined && (position.alt ?? lastAlt) !== null
                        ? `${(position.alt ?? lastAlt)!.toFixed(1)} m`
                        : '—'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Gauge className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Vitesse</p>
                    <p className="font-medium tabular-nums">
                      {speedKmh !== null ? `${speedKmh.toFixed(1)} km/h` : '—'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Navigation className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Cap</p>
                    <p className="font-medium tabular-nums">
                      {course !== null ? `${course.toFixed(1)}°` : '—'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Satellite className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Satellites</p>
                    <p className="font-medium tabular-nums">{position.sat ?? lastSat ?? '—'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Heure UTC</p>
                    <p className="font-medium tabular-nums">
                      {position.time ? `${position.time.slice(0, 6)}` : '—'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    className={
                      position.valid
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400'
                    }
                  >
                    {position.qualityLabel || (position.valid ? 'Fix valide' : 'Aucun fix')}
                  </Badge>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Reçu à {new Date(position.receivedAt).toLocaleTimeString('fr-FR', { hour12: false })}{' '}
                · trame {position.type} · checksum {position.checksumOk ? 'valide' : 'invalide'}
              </p>
            </>
          ) : (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              Aucune position reçue.
              <br />
              Attendez une trame GGA, RMC ou GLL du capteur.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Historique des positions</CardTitle>
          <CardDescription>30 dernières trames géolocalisées.</CardDescription>
        </CardHeader>
        <CardContent>
          {posFrames.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Aucune donnée.</p>
          ) : (
            <div className="max-h-72 overflow-y-auto rounded-lg border divide-y text-xs">
              {posFrames.map((f) => (
                <div key={f.id} className="flex items-center justify-between gap-2 px-3 py-2 font-mono">
                  <span className="text-muted-foreground tabular-nums shrink-0">
                    {new Date(f.receivedAt).toLocaleTimeString('fr-FR', { hour12: false })}
                  </span>
                  <span className="tabular-nums truncate">
                    {f.lat!.toFixed(5)}, {f.lon!.toFixed(5)}
                  </span>
                  <Badge variant="outline" className="shrink-0">
                    {f.type}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
