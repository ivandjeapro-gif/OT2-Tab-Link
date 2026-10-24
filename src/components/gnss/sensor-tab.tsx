'use client';

import { useState } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FrameLog } from '@/components/gnss/frame-log';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useBle } from '@/hooks/use-ble';
import { injectManual } from '@/lib/gnss-engine';
import { useGnssStore } from '@/lib/gnss-store';
import {
  Bluetooth,
  BluetoothConnected,
  ClipboardPaste,
  Keyboard,
  Pause,
  Play,
  Plug,
  PlugZap,
  Settings2,
} from 'lucide-react';

export function SensorTab() {
  const { supported, connecting, connect, disconnect } = useBle();
  const connected = useGnssStore((s) => s.connected);
  const deviceName = useGnssStore((s) => s.deviceName);
  const listeningPaused = useGnssStore((s) => s.listeningPaused);
  const toggleListeningPaused = useGnssStore((s) => s.toggleListeningPaused);
  const customServiceUuid = useGnssStore((s) => s.customServiceUuid);
  const customCharUuid = useGnssStore((s) => s.customCharUuid);
  const setCustomServiceUuid = useGnssStore((s) => s.setCustomServiceUuid);
  const setCustomCharUuid = useGnssStore((s) => s.setCustomCharUuid);
  const [manualText, setManualText] = useState('');
  const { toast } = useToast();

  const handleInject = () => {
    const n = injectManual(manualText);
    if (n > 0) {
      toast({ title: 'Trames injectées', description: `${n} trame(s) NMEA traitée(s).` });
      setManualText('');
    } else {
      toast({
        title: 'Aucune trame valide',
        description: "Chaque ligne doit commencer par '$' (ex. $GPGGA,…).",
        variant: 'destructive',
      });
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setManualText((prev) => (prev ? prev + '\n' + text : text));
    } catch {
      toast({ title: 'Presse-papiers inaccessible', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4">
      {/* Connexion Bluetooth LE */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bluetooth className="h-4 w-4 text-emerald-600" />
            Capteur Bluetooth LE
          </CardTitle>
          <CardDescription>
            Connectez votre module GNSS (Nordic UART, HM-10/JDY-31, nRF…).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {connected ? (
            <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40 p-3">
              <div className="flex items-center gap-2 min-w-0">
                <BluetoothConnected className="h-5 w-5 text-emerald-600 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{deviceName || 'Périphérique BLE'}</p>
                  <p className="text-xs text-muted-foreground">
                    {listeningPaused ? 'Écoute en pause' : 'Écoute des trames en cours…'}
                  </p>
                </div>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <Button variant="outline" size="icon" onClick={toggleListeningPaused} aria-label={listeningPaused ? 'Reprendre' : 'Pause'}>
                  {listeningPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                </Button>
                <Button variant="destructive" size="sm" onClick={disconnect}>
                  Quitter
                </Button>
              </div>
            </div>
          ) : (
            <Button
              onClick={connect}
              disabled={connecting}
              className="w-full h-11 bg-emerald-600 hover:bg-emerald-700"
            >
              {connecting ? (
                <>
                  <PlugZap className="h-4 w-4 mr-2 animate-pulse" />
                  Recherche…
                </>
              ) : (
                <>
                  <Plug className="h-4 w-4 mr-2" />
                  Connecter le capteur
                </>
              )}
            </Button>
          )}
          {!supported && (
            <p className="text-xs text-muted-foreground leading-relaxed">
              <Badge variant="secondary" className="mr-1">Info</Badge>
              Web Bluetooth requiert Chrome/Edge (Android, Windows, macOS) en HTTPS. iOS n&apos;est
              pas supporté. Le Bluetooth Classique (SPP, ex. HC-05) n&apos;est pas accessible depuis
              un navigateur : utilisez un module BLE ou la saisie manuelle.
            </p>
          )}

          <Accordion type="single" collapsible>
            <AccordionItem value="uuid">
              <AccordionTrigger className="text-sm py-2">
                <span className="flex items-center gap-1.5">
                  <Settings2 className="h-3.5 w-3.5" />
                  UUID personnalisés (optionnel)
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="svc" className="text-xs">
                    UUID du service UART
                  </Label>
                  <Input
                    id="svc"
                    placeholder="6e400001-b5a3-f393-e0a9-e50e24dcca9e"
                    value={customServiceUuid}
                    onChange={(e) => setCustomServiceUuid(e.target.value)}
                    className="font-mono text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="chr" className="text-xs">
                    UUID de la caractéristique TX (notifications)
                  </Label>
                  <Input
                    id="chr"
                    placeholder="6e400003-b5a3-f393-e0a9-e50e24dcca9e"
                    value={customCharUuid}
                    onChange={(e) => setCustomCharUuid(e.target.value)}
                    className="font-mono text-xs"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Laissez vide pour la détection automatique parmi les modules les plus courants.
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* Saisie manuelle */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Keyboard className="h-4 w-4 text-teal-600" />
            Saisie manuelle
          </CardTitle>
          <CardDescription>
            Collez une ou plusieurs trames NMEA (une par ligne) pour les traiter.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            placeholder={'$GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*47\n$GPRMC,123519,A,4807.038,N,01131.000,E,022.4,084.4,230394,003.1,W*6A'}
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
            rows={4}
            className="font-mono text-xs"
          />
          <div className="flex gap-2">
            <Button
              onClick={handleInject}
              className="flex-1 h-10 bg-teal-600 hover:bg-teal-700"
              disabled={!manualText.trim()}
            >
              Injecter les trames
            </Button>
            <Button variant="outline" size="icon" onClick={handlePaste} aria-label="Coller">
              <ClipboardPaste className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Journal */}
      <Card>
        <CardContent className="pt-4">
          <FrameLog limit={20} />
        </CardContent>
      </Card>
    </div>
  );
}
