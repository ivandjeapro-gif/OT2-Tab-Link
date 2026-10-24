'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useGnssStore } from '@/lib/gnss-store';
import { CheckCircle2, Eraser, Radio, XCircle } from 'lucide-react';

const TYPE_COLORS: Record<string, string> = {
  GGA: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  RMC: 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300',
  GLL: 'bg-lime-100 text-lime-800 dark:bg-lime-950 dark:text-lime-300',
  VTG: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  GSA: 'bg-stone-100 text-stone-700 dark:bg-stone-900 dark:text-stone-300',
  GSV: 'bg-stone-100 text-stone-700 dark:bg-stone-900 dark:text-stone-300',
  AUTRE: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400',
};

export function FrameLog({ limit, className }: { limit?: number; className?: string }) {
  const frames = useGnssStore((s) => s.frames);
  const clearFrames = useGnssStore((s) => s.clearFrames);
  const shown = limit ? frames.slice(0, limit) : frames;

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium flex items-center gap-1.5">
          <Radio className="h-4 w-4 text-emerald-600" />
          Journal des trames
          <span className="text-muted-foreground font-normal">
            ({frames.length})
          </span>
        </p>
        <Button variant="ghost" size="sm" onClick={clearFrames} className="h-8 text-muted-foreground">
          <Eraser className="h-3.5 w-3.5 mr-1" />
          Effacer
        </Button>
      </div>

      {shown.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Aucune trame reçue pour l&apos;instant.
          <br />
          Connectez un capteur ou collez des trames manuellement.
        </div>
      ) : (
        <ScrollArea className="h-72 rounded-lg border">
          <div className="divide-y text-xs font-mono">
            {shown.map((f) => (
              <div key={f.id} className="flex items-start gap-2 px-3 py-1.5">
                <span className="text-muted-foreground shrink-0 pt-0.5 tabular-nums">
                  {new Date(f.receivedAt).toLocaleTimeString('fr-FR', { hour12: false })}
                </span>
                <Badge variant="outline" className={`shrink-0 ${TYPE_COLORS[f.type] || TYPE_COLORS.AUTRE}`}>
                  {f.type}
                </Badge>
                <span className="truncate flex-1 pt-0.5" title={f.raw}>
                  {f.raw}
                </span>
                {f.checksumOk ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
