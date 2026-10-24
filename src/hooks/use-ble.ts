'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useGnssStore, type GnssRole } from '@/lib/gnss-store';
import { useToast } from '@/hooks/use-toast';

/** Services UART série Bluetooth LE courants (modules GNSS / ponts série). */
const KNOWN_SERVICES = [
  '6e400001-b5a3-f393-e0a9-e50e24dcca9e', // Nordic UART Service (nRF52, Adafruit, M5Stack...)
  '0000ffe0-0000-1000-8000-00805f9b34fb', // HM-10, JDY-31, AT-09...
  '0000fee7-0000-1000-8000-00805f9b34fb', // TI / clones
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // Microchip RN4870/RN4871
  '713d0000-503e-4c75-ba94-3148f18d941e', // RedBearLab
];

function isValidUuid(v: string): boolean {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
    v.trim()
  );
}

export function useBle(role: GnssRole) {
  const [supported, setSupported] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const deviceRef = useRef<BleDevice | null>(null);
  const charRef = useRef<BleCharacteristic | null>(null);
  const bufferRef = useRef('');
  const { toast } = useToast();

  useEffect(() => {
    setSupported(typeof navigator !== 'undefined' && !!navigator.bluetooth);
  }, []);

  const cleanup = useCallback(() => {
    const char = charRef.current;
    const device = deviceRef.current;
    if (char) {
      try {
        char.removeEventListener('characteristicvaluechanged', onValue);
        void char.stopNotifications();
      } catch {
        /* ignoré */
      }
    }
    if (device) {
      try {
        device.removeEventListener('gattserverdisconnected', onDisconnected);
        if (device.gatt?.connected) device.gatt.disconnect();
      } catch {
        /* ignoré */
      }
    }
    charRef.current = null;
    deviceRef.current = null;
    bufferRef.current = '';
    useGnssStore.getState().setConnected(false);
  }, []);

  const onValue = useCallback((event: Event) => {
    const target = event.target as BleCharacteristic;
    const data = target.value;
    if (!data) return;
    const decoder = new TextDecoder();
    bufferRef.current += decoder.decode(data, { stream: true });
    let idx: number;
    while ((idx = bufferRef.current.indexOf('\n')) >= 0) {
      const line = bufferRef.current
        .slice(0, idx)
        .replace(/\r/g, '')
        .trim();
      bufferRef.current = bufferRef.current.slice(idx + 1);
      if (line) useGnssStore.getState().ingestLine(line, role);
    }
    // Garde-fou : trames sans fin de ligne
    if (bufferRef.current.length > 4096) bufferRef.current = '';
  }, [role]);

  const onDisconnected = useCallback(() => {
    cleanup();
    toast({
      title: 'Bluetooth déconnecté',
      description: 'La liaison avec le capteur a été interrompue.',
    });
  }, [cleanup]);

  const connect = useCallback(async () => {
    const store = useGnssStore.getState();
    if (!navigator.bluetooth) {
      toast({
        title: 'Web Bluetooth indisponible',
        description:
          'Utilisez Chrome ou Edge (Android, Windows, macOS) en HTTPS. Non supporté sur iOS.',
        variant: 'destructive',
      });
      return;
    }
    setConnecting(true);
    try {
      const optionalServices = [...KNOWN_SERVICES];
      if (isValidUuid(store.customServiceUuid)) {
        optionalServices.unshift(store.customServiceUuid.trim().toLowerCase());
      }
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices,
      });

      device.addEventListener('gattserverdisconnected', onDisconnected);
      if (!device.gatt) throw new Error('Serveur GATT indisponible');
      const server = await device.gatt.connect();

      // Détection de la caractéristique TX (notifications)
      let tx: BleCharacteristic | null = null;
      if (isValidUuid(store.customServiceUuid) && isValidUuid(store.customCharUuid)) {
        try {
          const svc = await server.getPrimaryService(store.customServiceUuid.trim().toLowerCase());
          tx = await svc.getCharacteristic(store.customCharUuid.trim().toLowerCase());
        } catch {
          tx = null;
        }
      }
      if (!tx) {
        const services = await server.getPrimaryServices();
        for (const svc of services) {
          const chars = await svc.getCharacteristics();
          const found = chars.find((c) => c.properties.notify || c.properties.indicate);
          if (found) {
            tx = found;
            break;
          }
        }
      }
      if (!tx) throw new Error('Aucune caractéristique série (notify) trouvée sur cet appareil');

      await tx.startNotifications();
      tx.addEventListener('characteristicvaluechanged', onValue);
      charRef.current = tx;
      deviceRef.current = device;

      store.setConnected(true, device.name || 'Périphérique BLE', role, 'ble');
      toast({
        title: 'Capteur connecté',
        description: `${device.name || 'Périphérique BLE'} — écoute des trames NMEA…`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('User cancelled') || msg.includes('cancel')) {
        toast({
          title: 'Aucun appareil sélectionné',
          description: 'La fenêtre de sélection Bluetooth a été fermée sans choisir de capteur.',
        });
      } else {
        toast({
          title: 'Échec de connexion',
          description: msg.slice(0, 160),
          variant: 'destructive',
        });
      }
      cleanup();
    } finally {
      setConnecting(false);
    }
  }, [onValue, onDisconnected, cleanup, toast, role]);

  const disconnect = useCallback(() => {
    cleanup();
    toast({ title: 'Déconnecté', description: 'Liaison Bluetooth fermée.' });
  }, [cleanup, toast]);

  return { supported, connecting, connect, disconnect };
}
