'use client';

import { useState } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useGnssStore } from '@/lib/gnss-store';
import {
  CheckCircle2,
  Clock,
  CloudUpload,
  Copy,
  FileSpreadsheet,
  ListChecks,
  PlugZap,
  Send,
  KeyRound,
  Trash2,
  Wrench,
  XCircle,
} from 'lucide-react';

const GAS_CODE = `/**
 * Récepteur GNSS — Google Apps Script
 * Reçoit les trames envoyées par l'application mobile
 * et les enregistre dans la feuille "GNSS" du classeur.
 *
 * Déploiement : Application Web — Exécuter en tant que "Moi",
 * Accès : "Tout le monde". Collez l'URL .../exec dans l'app.
 */
const SHEET_NAME = 'GNSS';
const SECRET = ''; // Optionnel : même valeur que dans l'app (onglet Serveur)

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    if (SECRET && data.secret !== SECRET) {
      return json({ ok: false, error: 'Secret invalide' });
    }
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['Reçu le', 'Type', 'Heure UTC', 'Date UTC', 'Latitude',
        'Longitude', 'Altitude (m)', 'Satellites', 'Qualité', 'Vitesse (km/h)',
        'Cap (°)', 'Fix valide', 'Checksum', 'Trame brute']);
    }
    const messages = Array.isArray(data.messages) ? data.messages : [];
    const now = new Date();
    const rows = messages.map(function (m) {
      return [
        m.receivedAt || now.toISOString(),
        m.type || '', m.time || '', m.date || '',
        m.lat === undefined ? '' : m.lat,
        m.lon === undefined ? '' : m.lon,
        m.alt === undefined ? '' : m.alt,
        m.sat === undefined ? '' : m.sat,
        m.quality === undefined ? '' : m.quality,
        m.speedKmh === undefined ? '' : m.speedKmh,
        m.course === undefined ? '' : m.course,
        m.valid ? 'OUI' : 'NON',
        m.checksumOk ? 'OK' : 'KO',
        m.raw || ''
      ];
    });
    if (rows.length > 0) {
      sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length)
        .setValues(rows);
    }
    return json({ ok: true, inserted: rows.length });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

function doGet() {
  return json({ ok: true, service: 'Récepteur GNSS', time: new Date().toISOString() });
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}`;

export function ServerTab() {
  const gasUrl = useGnssStore((s) => s.gasUrl);
  const setGasUrl = useGnssStore((s) => s.setGasUrl);
  const secret = useGnssStore((s) => s.secret);
  const setSecret = useGnssStore((s) => s.setSecret);
  const autoForward = useGnssStore((s) => s.autoForward);
  const setAutoForward = useGnssStore((s) => s.setAutoForward);
  const batchMode = useGnssStore((s) => s.batchMode);
  const setBatchMode = useGnssStore((s) => s.setBatchMode);
  const batchIntervalSec = useGnssStore((s) => s.batchIntervalSec);
  const setBatchIntervalSec = useGnssStore((s) => s.setBatchIntervalSec);
  const queue = useGnssStore((s) => s.queue);
  const forwardedCount = useGnssStore((s) => s.forwardedCount);
  const failedCount = useGnssStore((s) => s.failedCount);
  const lastSendAt = useGnssStore((s) => s.lastSendAt);
  const lastSendOk = useGnssStore((s) => s.lastSendOk);
  const lastResponse = useGnssStore((s) => s.lastResponse);
  const sendLog = useGnssStore((s) => s.sendLog);
  const flushQueue = useGnssStore((s) => s.flushQueue);
  const clearQueue = useGnssStore((s) => s.clearQueue);
  const resetSendStats = useGnssStore((s) => s.resetSendStats);
  const testConnection = useGnssStore((s) => s.testConnection);
  const [testing, setTesting] = useState(false);
  const { toast } = useToast();

  const handleTest = async () => {
    if (!gasUrl.trim()) {
      toast({
        title: 'URL manquante',
        description: "Collez d'abord l'URL /exec de votre application web Apps Script.",
        variant: 'destructive',
      });
      return;
    }
    setTesting(true);
    await testConnection();
    setTesting(false);
    const st = useGnssStore.getState();
    toast({
      title: st.lastSendOk ? 'Serveur joignable' : 'Échec du test',
      description: st.lastResponse.slice(0, 140),
      variant: st.lastSendOk ? 'default' : 'destructive',
    });
  };

  const handleFlush = async () => {
    if (!gasUrl.trim()) {
      toast({
        title: 'URL manquante',
        description: 'Configurez d’abord l’URL Apps Script.',
        variant: 'destructive',
      });
      return;
    }
    await flushQueue(true);
    const st = useGnssStore.getState();
    toast({
      title: st.lastSendOk ? 'Envoi réussi' : 'Échec de l’envoi',
      description: st.lastResponse.slice(0, 140),
      variant: st.lastSendOk ? 'default' : 'destructive',
    });
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(GAS_CODE);
      toast({ title: 'Script copié', description: 'Collez-le dans l’éditeur Apps Script.' });
    } catch {
      toast({ title: 'Copie impossible', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4">
      {/* Destination */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CloudUpload className="h-4 w-4 text-emerald-600" />
            Destination Apps Script
          </CardTitle>
          <CardDescription>
            URL de l&apos;application web Google Apps Script (se termine par <code>/exec</code>).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="gasurl" className="text-xs">
              URL du déploiement
            </Label>
            <Input
              id="gasurl"
              type="url"
              placeholder="https://script.google.com/macros/s/AKfy…/exec"
              value={gasUrl}
              onChange={(e) => setGasUrl(e.target.value)}
              className="text-sm"
            />
          </div>
          <Button
            variant="outline"
            className="w-full"
            onClick={handleTest}
            disabled={testing || !gasUrl.trim()}
          >
            <PlugZap className="h-4 w-4 mr-2" />
            {testing ? 'Test en cours…' : 'Tester la connexion'}
          </Button>

          <Accordion type="single" collapsible>
            <AccordionItem value="sec">
              <AccordionTrigger className="text-sm py-2">
                <span className="flex items-center gap-1.5">
                  <KeyRound className="h-3.5 w-3.5" />
                  Clé secrète (optionnel)
                </span>
              </AccordionTrigger>
              <AccordionContent className="pt-2">
                <Input
                  type="password"
                  placeholder="ma-clé-secrète"
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  className="text-sm"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Si définie, la même valeur doit figurer dans <code>SECRET</code> du script côté
                  Apps Script. Elle protège votre feuille contre les envois tiers.
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* Mode d'envoi */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Mode d&apos;envoi</CardTitle>
          <CardDescription>Comment les trames comptées sont redirigées.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Redirection automatique</p>
              <p className="text-xs text-muted-foreground">
                Les trames reçues partent dès que possible.
              </p>
            </div>
            <Switch checked={autoForward} onCheckedChange={setAutoForward} />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Stratégie</Label>
            <Select value={batchMode ? 'batch' : 'live'} onValueChange={(v) => setBatchMode(v === 'batch')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="live">À la réception (1 requête par trame)</SelectItem>
                <SelectItem value="batch">Par lots (1 requête groupée)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {batchMode && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  Intervalle d&apos;envoi
                </Label>
                <span className="text-sm font-medium tabular-nums">{batchIntervalSec} s</span>
              </div>
              <Slider
                min={5}
                max={120}
                step={5}
                value={[batchIntervalSec]}
                onValueChange={([v]) => setBatchIntervalSec(v)}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statistiques d'envoi */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ListChecks className="h-4 w-4 text-emerald-600" />
            État de la redirection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg border p-2.5">
              <p className="text-xl font-semibold tabular-nums text-emerald-600">
                {forwardedCount}
              </p>
              <p className="text-xs text-muted-foreground">envoyées</p>
            </div>
            <div className="rounded-lg border p-2.5">
              <p className="text-xl font-semibold tabular-nums">{queue.length}</p>
              <p className="text-xs text-muted-foreground">en attente</p>
            </div>
            <div className="rounded-lg border p-2.5">
              <p className="text-xl font-semibold tabular-nums text-red-500">{failedCount}</p>
              <p className="text-xs text-muted-foreground">échecs</p>
            </div>
          </div>

          {lastSendAt && (
            <div className="flex items-start gap-2 text-xs rounded-lg border p-2.5">
              {lastSendOk ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
              )}
              <div className="min-w-0">
                <p className="font-medium">
                  Dernier échange :{' '}
                  {new Date(lastSendAt).toLocaleTimeString('fr-FR', { hour12: false })}
                </p>
                <p className="text-muted-foreground break-all">{lastResponse || '—'}</p>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={handleFlush}
              disabled={queue.length === 0 || !gasUrl.trim()}
              className="flex-1 h-10 bg-emerald-600 hover:bg-emerald-700"
            >
              <Send className="h-4 w-4 mr-2" />
              Envoyer maintenant ({queue.length})
            </Button>
            <Button variant="outline" size="icon" onClick={clearQueue} aria-label="Vider la file">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={resetSendStats}>
            Réinitialiser les statistiques d&apos;envoi
          </Button>

          {sendLog.length > 0 && (
            <>
              <Separator />
              <ScrollArea className="h-36 rounded-lg border">
                <div className="divide-y text-xs">
                  {sendLog.map((l) => (
                    <div key={l.id} className="flex items-start gap-2 px-3 py-2">
                      <span className="text-muted-foreground tabular-nums shrink-0">
                        {new Date(l.at).toLocaleTimeString('fr-FR', { hour12: false })}
                      </span>
                      <Badge
                        variant="outline"
                        className={
                          l.ok
                            ? 'shrink-0 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'shrink-0 bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                        }
                      >
                        {l.ok ? `OK · ${l.count}` : 'Échec'}
                      </Badge>
                      <span className="text-muted-foreground break-all">{l.detail}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </>
          )}
        </CardContent>
      </Card>

      {/* Installation du serveur */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            Installer le serveur (5 min)
          </CardTitle>
          <CardDescription>
            Créez votre point de réception Google Sheets + Apps Script.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ol className="space-y-2.5 text-sm list-decimal list-inside text-foreground/90">
            <li>
              Ouvrez <span className="font-medium">Google Sheets</span> et créez un classeur vide.
            </li>
            <li>
              Menu <span className="font-medium">Extensions → Apps Script</span>.
            </li>
            <li>Supprimez le code par défaut et collez le script ci-dessous.</li>
            <li>
              Cliquez <span className="font-medium">Déployer → Nouveau déploiement</span>, choisissez
              le type <span className="font-medium">Application Web</span>.
            </li>
            <li>
              « Exécuter en tant que » : <span className="font-medium">Moi</span> · « Accès » :{' '}
              <span className="font-medium">Tout le monde</span>. Déployez et autorisez.
            </li>
            <li>
              Copiez l&apos;URL <code>/exec</code> et collez-la dans le champ ci-dessus.
            </li>
          </ol>

          <div className="relative">
            <Button
              size="sm"
              variant="outline"
              className="absolute top-2 right-2 z-10"
              onClick={copyCode}
            >
              <Copy className="h-3.5 w-3.5 mr-1.5" />
              Copier
            </Button>
            <pre className="rounded-lg bg-zinc-950 text-zinc-100 text-[11px] leading-relaxed p-3 pr-20 overflow-x-auto max-h-96 overflow-y-auto">
              <code>{GAS_CODE}</code>
            </pre>
          </div>

          <p className="text-xs text-muted-foreground flex items-start gap-1.5">
            <Wrench className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            Les trames arrivent dans la feuille « GNSS » : type, position, vitesse, satellites et
            texte brut. Modifiez <code>SHEET_NAME</code> ou <code>SECRET</code> si besoin — puis
            redéployez une nouvelle version.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
