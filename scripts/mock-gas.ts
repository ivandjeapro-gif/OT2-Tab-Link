// Mock local d'un endpoint Google Apps Script (CORS ouvert) pour la vérification E2E.
Bun.serve({
  port: 3999,
  fetch(req) {
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (req.method === 'POST') {
      return new Response(JSON.stringify({ ok: true, inserted: 999 }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }
    return new Response(
      JSON.stringify({ ok: true, service: 'Mock GAS', time: new Date().toISOString() }),
      { headers: { ...cors, 'Content-Type': 'application/json' } }
    );
  },
});
console.log('Mock GAS en écoute sur le port 3999');
