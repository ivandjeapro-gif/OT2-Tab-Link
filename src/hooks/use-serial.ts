'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useGnssStore, type GnssRole } from '@/lib/gnss-store';
import { useToast } from '@/hooks/use-toast';

export function useSerial(role: GnssRole) {
  const [supported, setSupported] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const portRef = useRef<SerialPort | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<string> | null>(null);
  const keepReadingRef = useRef(false);
  const { toast } = useToast();

  useEffect(() => {
    setSupported(typeof navigator !== 'undefined' && !!navigator.serial);
  }, []);

  const cleanup = useCallback(async () => {
    keepReadingRef.current = false;
    const reader = readerRef.current;
    if (reader) {
      try {
        await reader.cancel();
      } catch {
        /* ignoré */
      }
    }
    readerRef.current = null;
    const port = portRef.current;
    if (port) {
      try {
        port.removeEventListener('disconnect', onDisconnected);
        await port.close();
      } catch {
        /* ignoré */
      }
    }
    portRef.current = null;
    useGnssStore.getState().setConnected(false);
  }, []);

  const onDisconnected = useCallback(() => {
    void cleanup();
    toast({
      title: 'Port série déconnecté',
      description: 'La liaison USB avec le capteur a été interrompue.',
    });
  }, [cleanup, toast]);

  const readLoop = useCallback(async (port: SerialPort) => {
    if (!port.readable) return;
    const textDecoder = new TextDecoderStream();
    const readableClosed = port.readable
      .pipeTo(textDecoder.writable as WritableStream<Uint8Array>)
      .catch(() => {});
    const reader = textDecoder.readable.getReader();
    readerRef.current = reader;
    let buffer = '';
    keepReadingRef.current = true;
    try {
      while (keepReadingRef.current) {
        const { value, done } = await reader.read();
        if (done) break;
        if (!value) continue;
        buffer += value;
        let idx: number;
        while ((idx = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, idx).replace(/\r/g, '').trim();
          buffer = buffer.slice(idx + 1);
          if (line) useGnssStore.getState().ingestLine(line, role);
        }
        if (buffer.length > 4096) buffer = '';
      }
    } catch {
      /* port fermé ou déconnecté pendant la lecture */
    } finally {
      try {
        reader.releaseLock();
      } catch {
        /* ignoré */
      }
      await readableClosed;
    }
  }, [role]);

  const connect = useCallback(async () => {
    const store = useGnssStore.getState();
    if (!navigator.serial) {
      toast({
        title: 'Web Serial indisponible',
        description:
          'Utilisez Chrome ou Edge (Windows, macOS, Linux) en HTTPS. Non supporté sur mobile.',
        variant: 'destructive',
      });
      return;
    }
    setConnecting(true);
    try {
      const port = await navigator.serial.requestPort();
      await port.open({ baudRate: store.serialBaudRate || 38400 });
      port.addEventListener('disconnect', onDisconnected);
      portRef.current = port;

      store.setConnected(true, 'Port série USB', role, 'serial');
      toast({
        title: 'Capteur connecté',
        description: `Port série ouvert à ${store.serialBaudRate || 38400} bauds — écoute des trames NMEA…`,
      });

      void readLoop(port);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('cancel') || msg.includes('No port selected')) {
        toast({
          title: 'Aucun port sélectionné',
          description: 'La fenêtre de sélection du port série a été fermée sans choisir de port.',
        });
      } else {
        toast({
          title: 'Échec de connexion',
          description: msg.slice(0, 160),
          variant: 'destructive',
        });
      }
      await cleanup();
    } finally {
      setConnecting(false);
    }
  }, [onDisconnected, readLoop, cleanup, toast, role]);

  const disconnect = useCallback(() => {
    void cleanup();
    toast({ title: 'Déconnecté', description: 'Port série fermé.' });
  }, [cleanup, toast]);

  return { supported, connecting, connect, disconnect };
}
