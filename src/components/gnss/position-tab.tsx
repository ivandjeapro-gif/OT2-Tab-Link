'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useGnssStore, type GnssRole } from '@/lib/gnss-store';
import { formatLat, formatLon } from '@/lib/nmea';
import { latLonToUtm, formatUtm } from '@/lib/utm';
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

const ROLES: Array<{ key: GnssRole; label: string }> = [
  { key: 'rover', label: 'Rover' },
  { key: 'base', label: 'Base' },
];

export function PositionTab() {
  const [role, setRole] = useState<GnssRole>('rover');
  const channel = useGnssStore((s) => s.channels[role]);
  const { position, speedKmh, course, lastAlt, lastSat, frames } = channel;
  const { toast } = useToast();

  const hasPos = position?.lat !== undefined && position?.lon !== undefined;
  const dec = hasPos ? `${position!.lat!.toFixed(6)}, ${position!.lon!.toFixed(6)}` : '';
  const utm = hasPos ? latLonToUtm(position!.lat!, position!.lon!) : null;

  const copyCoords = async () => {
    if (!dec) return;
    try {
      await navigator.clipboard.writeText(dec);
      toast({ title: 'Coordonnées copiées', description: dec });
    } catch {
      toast({ title: 'Copie impossible', variant: 'destructive' });
    }
  };

  const copyUtm = async () => {
    if (!utm) return;
    const elev = position!.alt ?? lastAlt;
    const text = formatUtm(utm) + (elev !== undefined && elev !== null ? ` · ${elev.toFixed(1)} m` : '');
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: 'Coordonnées UTM copiées', description: text });
    } catch {
      toast({ title: 'Copie impossible', variant: 'destructive' });
    }
  };

  const posFrames = frames.filter((f) => f.lat !== undefined && f.lon !== undefined).slice(0, 30);

  return (
    <div className="space-y-4">
      {/* Sélecteur Rover / Base */}
      <div className="grid grid-cols-2 gap-2">
        {ROLES.map((r) => (
          <Button
            key={r.key}
            variant={role === r.key ? 'default' : 'outline'}
            className={role === r.key ? 'bg-amber-600 hover:bg-amber-700' : ''}
            onClick={() => setRole(r.key)}
          >
            {r.label}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-4 w-4 text-amber-600" />
            Position courante — {role === 'rover' ? 'Rover' : 'Base'}
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

              {utm && (
                <div className="rounded-lg border p-3 bg-muted/30">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs text-muted-foreground">
                      Coordonnées UTM (WGS84) · Zone {utm.zone}{utm.band}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs -mr-1.5"
                      onClick={copyUtm}
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Copier
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Est (Easting)</p>
                      <p className="font-medium tabular-nums">{utm.easting.toFixed(2)} m</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Nord (Northing)</p>
                      <p className="font-medium tabular-nums">{utm.northing.toFixed(2)} m</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Élévation</p>
                      <p className="font-medium tabular-nums">
                        {(position.alt ?? lastAlt) !== undefined && (position.alt ?? lastAlt) !== null
                          ? `${(position.alt ?? lastAlt)!.toFixed(1)} m`
                          : '—'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

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
                  <Button size="sm" className="w-full bg-amber-600 hover:bg-amber-700">
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
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
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
              Aucune position reçue pour {role === 'rover' ? 'le rover' : 'la base'}.
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
