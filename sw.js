/* =====================================================================
   Service worker — só existe para o site poder ser instalado como app
   e continuar abrindo sem internet.

   Regra importante: a planilha NUNCA passa por aqui. Só arquivos do
   próprio site são guardados, e sempre tentando a rede primeiro, para
   não correr o risco de mostrar uma versão velha das escalas.
   ===================================================================== */

var VERSAO = 'ipvsp-escalas-v8';

var ESSENCIAIS = [
  './',
  './index.html',
  './escalas.html',
  './manifest.webmanifest',
  './assets/css/app.css',
  './assets/js/config.js',
  './assets/js/planilha.js',
  './assets/js/dados.js',
  './assets/js/atualizar.js',
  './assets/js/instalar.js',
  './assets/js/home.js',
  './assets/js/escalas.js',
  './assets/img/logo.png',
  './assets/img/icone-192.png',
  './assets/img/icone-512.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(VERSAO)
      .then(function (c) { return c.addAll(ESSENCIAIS); })
      .catch(function () { /* se algum arquivo falhar, instala mesmo assim */ })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (nomes) {
      return Promise.all(nomes.map(function (n) {
        if (n !== VERSAO) return caches.delete(n);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;

  // só GET, só do próprio site — a planilha do Google fica de fora
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;

  e.respondWith(
    fetch(req)
      .then(function (res) {
        var copia = res.clone();
        caches.open(VERSAO).then(function (c) { c.put(req, copia); });
        return res;
      })
      .catch(function () {
        return caches.match(req).then(function (r) {
          return r || caches.match('./index.html');
        });
      })
  );
});
