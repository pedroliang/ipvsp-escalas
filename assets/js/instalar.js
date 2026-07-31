/* =====================================================================
   "Instalar no celular"

   No Android/Chrome e no computador, o próprio navegador oferece a
   instalação — aqui só guardamos o convite e disparamos no clique.
   No iPhone/iPad não existe esse recurso para sites, então mostramos
   o passo a passo do Compartilhar > Adicionar à Tela de Início.
   ===================================================================== */

(function () {
  'use strict';

  var convite = null;               // evento beforeinstallprompt

  function jaInstalado() {
    return window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
  }

  function ehApple() {
    var ua = navigator.userAgent;
    return /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }

  /* ---------- registro do service worker -------------------------- */

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () { });
    });
  }

  /* ---------- passo a passo --------------------------------------- */

  var PASSOS = {
    apple: {
      titulo: 'No iPhone ou iPad',
      itens: [
        'Abra este site no <b>Safari</b> (não funciona pelo Chrome no iPhone).',
        'Toque no botão <b>Compartilhar</b> — o quadradinho com a seta para cima.',
        'Role a lista e escolha <b>Adicionar à Tela de Início</b>.',
        'Toque em <b>Adicionar</b>. O ícone da igreja aparece junto com os seus apps.'
      ]
    },
    android: {
      titulo: 'No Android',
      itens: [
        'Toque no menu do navegador — os <b>três pontinhos</b> no canto.',
        'Escolha <b>Instalar aplicativo</b> ou <b>Adicionar à tela inicial</b>.',
        'Confirme. O ícone da igreja aparece junto com os seus apps.'
      ]
    },
    computador: {
      titulo: 'No computador',
      itens: [
        'No Chrome ou Edge, clique no ícone de <b>instalar</b> na barra de endereço.',
        'Ou abra o menu do navegador e escolha <b>Instalar</b>.'
      ]
    }
  };

  function abrirAjuda() {
    var qual = ehApple() ? 'apple'
      : /Android/i.test(navigator.userAgent) ? 'android'
        : 'computador';
    var p = PASSOS[qual];

    var fundo = document.createElement('div');
    fundo.className = 'modal';
    fundo.innerHTML =
      '<div class="modal__caixa" role="dialog" aria-modal="true" aria-label="Como instalar">' +
        '<div class="modal__topo">' +
          '<img src="assets/img/icone-192.png" alt="">' +
          '<div>' +
            '<p class="rotulo rotulo--tijolo" style="margin:0 0 2px">Adicionar à tela inicial</p>' +
            '<h2 class="modal__titulo">' + p.titulo + '</h2>' +
          '</div>' +
        '</div>' +
        '<ol class="modal__passos">' +
          p.itens.map(function (t) { return '<li>' + t + '</li>'; }).join('') +
        '</ol>' +
        '<p class="modal__nota">Depois de instalado, o site abre em tela cheia, ' +
          'sem a barra do navegador — e continua atualizando pela planilha.</p>' +
        '<button type="button" class="btn modal__fechar">Entendi</button>' +
      '</div>';

    function fechar() {
      fundo.classList.remove('modal--visivel');
      setTimeout(function () { fundo.remove(); }, 200);
      document.removeEventListener('keydown', tecla);
    }
    function tecla(e) { if (e.key === 'Escape') fechar(); }

    fundo.addEventListener('click', function (e) {
      if (e.target === fundo || e.target.classList.contains('modal__fechar')) fechar();
    });
    document.addEventListener('keydown', tecla);

    document.body.appendChild(fundo);
    requestAnimationFrame(function () { fundo.classList.add('modal--visivel'); });
  }

  /* ---------- botão ------------------------------------------------ */

  function clicar() {
    if (convite) {
      convite.prompt();
      convite.userChoice.then(function (r) {
        if (r && r.outcome === 'accepted') esconder();
        convite = null;
      });
    } else {
      abrirAjuda();
    }
  }

  function esconder() {
    document.documentElement.classList.remove('pode-instalar');
  }

  // Delegação: funciona também para botões criados depois, pelas páginas.
  function ligar() {
    if (jaInstalado()) { esconder(); return; }
    document.documentElement.classList.add('pode-instalar');

    document.addEventListener('click', function (e) {
      var alvo = e.target.closest && e.target.closest('.instalar');
      if (alvo) { e.preventDefault(); clicar(); }
    });
  }

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    convite = e;
  });

  window.addEventListener('appinstalled', function () {
    convite = null;
    esconder();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ligar);
  } else {
    ligar();
  }
})();
