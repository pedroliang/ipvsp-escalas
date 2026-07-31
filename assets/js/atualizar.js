/* =====================================================================
   Atualização dos dados

   - busca a planilha ao abrir a página
   - repete sozinho de tempos em tempos (ver CONFIG.atualizacaoSegundos)
   - busca de novo quando a pessoa volta para a aba do navegador
   - botão "Atualizar" no topo, para forçar na hora
   ===================================================================== */

window.Atualizador = (function () {
  'use strict';

  var INTERVALO = ((window.CONFIG && window.CONFIG.atualizacaoSegundos) || 60) * 1000;

  var estado = { modelo: null, ultima: 0, carregando: false, primeira: true };
  var alvo = null;
  var timer = null;

  function $(id) { return document.getElementById(id); }

  /* -- resumo do conteúdo, para saber se algo mudou de verdade ----- */
  function assinatura(m) {
    return m.ministerios.map(function (min) {
      return min.id + ':' + min.funcoes.map(function (f) {
        return f.chave + '=' + f.valores.join('|');
      }).join(';');
    }).join('||') + '#' + m.datas.map(function (d) { return d.iso; }).join(',');
  }

  /* -- relógio ----------------------------------------------------- */
  function doisDigitos(n) { return String(n).padStart(2, '0'); }

  function mostrarHora() {
    var el = $('hora-atualizacao');
    if (!el || !estado.ultima) return;
    var d = new Date(estado.ultima);
    el.textContent = 'atualizado ' + doisDigitos(d.getHours()) + ':' + doisDigitos(d.getMinutes());
    el.title = 'Última leitura da planilha: ' + d.toLocaleString('pt-BR');
  }

  /* -- avisinho flutuante ------------------------------------------ */
  var aviso;
  function piscar(texto, tipo) {
    if (!aviso) {
      aviso = document.createElement('div');
      aviso.className = 'toast';
      document.body.appendChild(aviso);
    }
    aviso.textContent = texto;
    aviso.className = 'toast toast--visivel' + (tipo ? ' toast--' + tipo : '');
    clearTimeout(aviso._t);
    aviso._t = setTimeout(function () { aviso.className = 'toast'; }, 2600);
  }

  /* -- busca ------------------------------------------------------- */
  function buscar(manual) {
    if (estado.carregando) return Promise.resolve();
    estado.carregando = true;

    var botao = $('btn-atualizar');
    if (botao) { botao.classList.add('girando'); botao.disabled = true; }

    return Escalas.carregar().then(function (m) {
      var antes = estado.modelo ? assinatura(estado.modelo) : null;
      var agora = assinatura(m);

      estado.ultima = Date.now();
      estado.modelo = m;

      if (estado.primeira || antes !== agora) {
        alvo.render(m, estado.primeira);
      }

      if (manual) {
        piscar(antes !== null && antes === agora
          ? 'Tudo já estava em dia'
          : 'Escalas atualizadas');
      }

      estado.primeira = false;
      mostrarHora();
    }, function (e) {
      if (estado.primeira && alvo.erro) alvo.erro(e);
      else piscar('Não consegui falar com a planilha agora', 'ruim');
    }).then(function () {
      estado.carregando = false;
      if (botao) { botao.classList.remove('girando'); botao.disabled = false; }
    });
  }

  /* -- agenda ------------------------------------------------------ */
  function reagendar() {
    clearTimeout(timer);
    timer = setTimeout(function () {
      if (!document.hidden) buscar(false).then(reagendar);
      else reagendar();
    }, INTERVALO);
  }

  function iniciar(opcoes) {
    alvo = opcoes;

    var botao = $('btn-atualizar');
    if (botao) {
      botao.addEventListener('click', function () { buscar(true); });
    }

    document.addEventListener('visibilitychange', function () {
      // ao voltar para a aba, se faz mais de 20s que não lemos, lê de novo
      if (!document.hidden && Date.now() - estado.ultima > 20000) buscar(false);
    });

    // mantém o horário sempre coerente
    setInterval(mostrarHora, 30000);

    buscar(false).then(reagendar);
  }

  return { iniciar: iniciar, agora: function () { return buscar(true); } };
})();
