/* Home — panorama do próximo culto */
(function () {
  'use strict';

  var app = document.getElementById('app');

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  ['link-planilha', 'nav-planilha'].forEach(function (id) {
    var a = document.getElementById(id);
    if (a) a.href = window.CONFIG.planilhaUrl;
  });

  /* -- pedaços de HTML -------------------------------------------- */

  // "Luquinhas (PT)" -> Luquinhas <span class="obs">PT</span>
  function pessoaHTML(p) {
    var m = p.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
    if (!m) return esc(p);
    return esc(m[1].trim()) + ' <span class="obs">' + esc(m[2].trim()) + '</span>';
  }

  function nomesHTML(valor) {
    var ps = Escalas.pessoas(valor);
    if (!ps.length) return '';
    return ps.map(pessoaHTML).join(' <span class="obs">/</span> ');
  }

  function linhaHTML(funcao, i) {
    var v = funcao.valores[i];
    return '<div class="linha">' +
      '<span class="linha__funcao">' + esc(funcao.rotulo) + '</span>' +
      '<span class="linha__guia"></span>' +
      (v
        ? '<span class="linha__nome">' + nomesHTML(v) + '</span>'
        : '<span class="linha__nome linha__nome--vazio">a definir</span>') +
      '</div>';
  }

  function grupoHTML(grupo, i) {
    var html = '<div class="grupo">';
    if (grupo.nome) html += '<div class="grupo__nome">' + esc(grupo.nome) + '</div>';

    if (grupo.lista) {
      var nomes = [];
      grupo.funcoes.forEach(function (f) {
        var v = f.valores[i];
        if (v) nomes.push('<span>' + nomesHTML(v) + '</span>');
      });
      html += nomes.length
        ? '<div class="nomes">' + nomes.join('') + '</div>'
        : '<div class="linha"><span class="linha__nome linha__nome--vazio">a definir</span></div>';
    } else {
      grupo.funcoes.forEach(function (f) { html += linhaHTML(f, i); });
    }

    return html + '</div>';
  }

  function blocoHTML(min, i, ordem, classe) {
    var html = '<section class="bloco ' + classe + '">' +
      '<div class="bloco__topo">' +
      '<span class="bloco__num">' + String(ordem).padStart(2, '0') + '</span>' +
      '<h2 class="bloco__nome">' + esc(min.nome) + '</h2>' +
      (min.resumo ? '<span class="bloco__resumo">' + esc(min.resumo) + '</span>' : '') +
      '</div>';

    if (min.erro) {
      html += '<p class="aviso">Não foi possível ler a aba <b>' + esc(min.aba) +
        '</b> da planilha.</p></section>';
      return html;
    }

    if (!min.funcoes.length) {
      html += '<p class="aviso">A aba ' + esc(min.aba) + ' ainda não tem funções cadastradas.</p></section>';
      return html;
    }

    var temAlgo = min.funcoes.some(function (f) { return f.valores[i]; });

    if (!temAlgo) {
      html += '<p class="aviso">Escala ainda não preenchida para esta data.</p>';
      html += '</section>';
      return html;
    }

    // ministério de uma função só: mostra em destaque
    if (min.funcoes.length === 1) {
      var f = min.funcoes[0];
      html += '<div class="destaque">' +
        '<div class="rotulo destaque__funcao">' + esc(f.rotulo) + '</div>' +
        '<div class="destaque__nome">' + nomesHTML(f.valores[i]) + '</div>' +
        '</div>';
    } else {
      html += '<div class="bloco__corpo">';
      min.grupos.forEach(function (g) { html += grupoHTML(g, i); });
      html += '</div>';
    }

    if (min.lembrete) {
      html += '<p class="lembrete">' + esc(min.lembrete) + '</p>';
    }

    return html + '</section>';
  }

  /* -- contagem regressiva ---------------------------------------- */

  function selo(dias) {
    if (dias === 0) return '<div class="selo"><span class="selo__num">hoje</span>' +
      '<span class="selo__txt">é o dia</span></div>';
    if (dias === 1) return '<div class="selo"><span class="selo__num">amanhã</span>' +
      '<span class="selo__txt">falta 1 dia</span></div>';
    return '<div class="selo"><span class="selo__num">' + dias + '</span>' +
      '<span class="selo__txt">dias para o culto</span></div>';
  }

  /* -- render ------------------------------------------------------ */

  function render(modelo) {
    var i = Escalas.proximoIndice(modelo.datas);

    if (i === -1) {
      var ultima = modelo.datas[modelo.datas.length - 1];
      app.innerHTML = '<div class="container"><div class="erro">' +
        '<b>Não há datas futuras na planilha.</b>' +
        (ultima
          ? 'A última escala cadastrada foi ' + esc(ultima.extenso) + '. '
          : 'Nenhuma data foi encontrada nas abas. ') +
        'Acrescente as próximas datas na planilha e o site se atualiza sozinho.' +
        '</div></div>';
      return;
    }

    var d = modelo.datas[i];
    var dias = Escalas.diasAte(d.data);
    var diaSemana = d.diaSemana.charAt(0).toUpperCase() + d.diaSemana.slice(1);
    var partes = d.extenso.split(' de ');
    var titulo = partes[0] + ' de ' + partes[1];

    var html =
      '<div class="container">' +
        '<section class="abertura">' +
          '<div class="abertura__grade">' +
            '<div>' +
              '<p class="rotulo rotulo--tijolo">Próximo culto</p>' +
              '<h1 class="abertura__data"><em>' + esc(diaSemana) + '</em>, ' + esc(titulo) + '</h1>' +
              '<p class="abertura__meta">Quem serve em ' +
                modelo.ministerios.map(function (m) { return '<b>' + esc(m.nome) + '</b>'; })
                  .join(', ').replace(/, ([^,]*)$/, ' e $1') +
              ' · ' + esc(d.data.getFullYear()) + '</p>' +
            '</div>' +
            selo(dias) +
          '</div>' +
        '</section>' +

        '<section class="escalas"><div class="grade">';

    var larguras = ['bloco--largo', 'bloco--estreito'];
    var contador = 0;

    modelo.ministerios.forEach(function (min, k) {
      var classe;
      if (min.funcoes.length === 1) {
        classe = '';                                   // ocupa a largura toda
      } else {
        classe = larguras[contador % 2]; contador++;
      }
      html += blocoHTML(min, i, k + 1, classe);
    });

    html += '</div>' +
      '<p style="margin:34px 0 0"><a class="btn btn--vazado" href="escalas.html">' +
      'Ver todas as datas</a></p>' +
      '</section></div>';

    app.innerHTML = html;
  }

  Atualizador.iniciar({
    render: render,
    erro: function (e) {
      app.innerHTML = '<div class="container"><div class="erro">' +
        '<b>Não consegui carregar a planilha.</b>' +
        'Confira se ela está compartilhada como “qualquer pessoa com o link pode ver”. ' +
        'Detalhe técnico: ' + esc(e && e.message) + '</div></div>';
    }
  });
})();
