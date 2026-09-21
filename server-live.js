'use strict';

const http = require('http');
const { URL } = require('url');
const { fetchSuperLigFixtures } = require('./lib/sofascore-provider');

// Keep the existing custom-provider path intact: if MATCHES_API_URL is set,
// server-auth.js remains authoritative. Otherwise install a no-key SofaScore
// provider in front of the auth/game server.
if (!String(process.env.MATCHES_API_URL || '').trim()) {
  const originalCreateServer = http.createServer.bind(http);

  http.createServer = function createLiveAwareServer(appHandler) {
    return originalCreateServer(async (req, res) => {
      try {
        const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
        if (req.method === 'GET' && url.pathname === '/api/live-fixtures') {
          const requestedWeek = Number(url.searchParams.get('week') || 0);
          const week = Number.isInteger(requestedWeek) && requestedWeek > 0 && requestedWeek <= 40 ? requestedWeek : null;
          const data = await fetchSuperLigFixtures({ week });
          res.writeHead(200, {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'no-store',
            'X-Content-Type-Options': 'nosniff'
          });
          return res.end(JSON.stringify({ ok:true, ...data }));
        }
        return appHandler(req, res);
      } catch (err) {
        console.error('Canlı maç katmanı hatası:', err);
        if (!res.headersSent) {
          res.writeHead(500, {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'no-store',
            'X-Content-Type-Options': 'nosniff'
          });
          return res.end(JSON.stringify({ ok:false, error:'Canlı maç verisi alınamadı.' }));
        }
        return res.end();
      }
    });
  };
}

require('./server-auth');
