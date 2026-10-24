# Worklog

---
Task ID: 1
Agent: main (Z.ai)
Task: Application mobile « GNSS Link » — réception de trames d'un capteur GNSS, comptage et redirection vers Google Apps Script

Work Log:
- Chargé le skill fullstack-dev et initialisé l'environnement Next.js 16 (init-fullstack.sh)
- Créé `src/types/ble.d.ts` : déclarations TypeScript Web Bluetooth (BleDevice, BleCharacteristic…)
- Créé `src/lib/nmea.ts` : parseur NMEA 0183 (checksum XOR, GGA/RMC/GLL/VTG/GSA/GSV/ZDA, conversion coordonnées ddmm.mmmm → degrés décimaux, helpers de formatage)
- Créé `src/lib/gnss-store.ts` : store Zustand persisté (localStorage) — compteurs, répartition par type, file d'envoi plafonnée (1000), réglages, flushQueue avec retry/backoff exponentiel
- Créé `src/lib/gnss-engine.ts` : mode démo (7 trames/s checksums valides) + injection manuelle
- Créé `src/hooks/use-ble.ts` : Web Bluetooth LE — requestDevice (acceptAllDevices + services UART connus : Nordic UART, HM-10/JDY, RN4870, RedBear), auto-détection caractéristique notify, reconstitution des lignes depuis le flux de notifications
- Créé les 4 onglets UI : sensor-tab (BLE/démo/manuel), position-tab (coordonnées, lien Google Maps, historique), counter-tab (compteur XXL, cadence recharts, répartition, intégrité), server-tab (URL GAS, test, mode live/lots + slider, stats d'envoi, script Code.gs + guide de déploiement en 6 étapes)
- Créé `src/app/page.tsx` : shell mobile (header sticky avec statut + bandeau position, nav basse 4 onglets, boucle Forwarder 1,5 s, gating d'hydratation via useSyncExternalStore)
- Corrigé : import FrameLog manquant, setState dans effect (→ useSyncExternalStore), icône lucide ShieldKey inexistante (→ KeyRound)
- Vérifié E2E avec agent-browser (viewport mobile 390×844 puis desktop) : démo → comptage (1772 trames), position, répartition, intégrité 100 %, mock GAS local (scripts/mock-gas.ts, CORS) → test HTTP 200, envoi par lots validé (658+ envoyées), échecs comptés avec retry, injection manuelle, reset compteurs, persistance localStorage après reload
- Lint propre, aucune erreur JS console, captures d'écran dans download/

Stage Summary:
- App livrée : route `/` unique, UI 100 % française, accent emerald, mobile-first avec safe-area
- Flux validé : capteur BLE/démo → parseur NMEA → compteurs → file → POST text/plain vers Apps Script (évite le preflight CORS)
- Script Google Apps Script prêt à déployer (feuille « GNSS », en-têtes automatiques, secret optionnel)
- Artefacts : code source complet + scripts/mock-gas.ts + captures de vérification dans /home/z/my-project/download/

---
Task ID: 2
Agent: main (Z.ai)
Task: Retrait du mode démo + préparation au build de production

Work Log:
- Store gnss-store.ts : suppression de demoRunning/setDemoRunning, fallback device « GNSS » dans le payload
- gnss-engine.ts : conservé uniquement injectManual (générateur de démo supprimé)
- sensor-tab.tsx : carte « Mode démo » et références supprimées ; page.tsx : badge « Démo » retiré (statut = connecté/veille)
- frame-log.tsx : texte d'état vide corrigé ; zéro référence « démo » dans src/ (vérifié par grep)
- Artefacts de test supprimés (scripts/mock-gas.ts, captures de vérification)
- PWA : manifest.json + icônes 192/512/apple-touch générées via sharp (scripts/make-icons.ts), metadata manifest + appleWebApp dans layout.tsx
- Compilabilité vérifiée : bunx tsc --noEmit → 0 erreur dans src/ (seuls examples/ et skills/ du scaffold ont des erreurs, hors build) ; lint propre ; serveur HTTP 200
- Re-test navigateur : injection manuelle → compteurs → position (48° 51.667' N) → file d'attente ; manifest/icônes servies en 200 ; aucune erreur console
- Emballé le projet : download/gnss-link.zip (92 fichiers : src/, public/, prisma/, configs, lockfile — sans node_modules/.next/artefacts sandbox)

Stage Summary:
- App « production-ready » : plus aucun mode démo, sources propres, PWA installable (écran d'accueil Android/iOS)
- Livrables : application sur la route / (port 3000) + gnss-link.zip dans /home/z/my-project/download/
- Build utilisateur : npm install && npm run build && npm start (ou bun), HTTPS requis pour Web Bluetooth
