/* Escalas completas — tabelas, busca por pessoa e exportação em PDF */
(function () {
  'use strict';

  var el = {
    painel: document.getElementById('painel'),
    tabelas: document.getElementById('tabelas'),
    periodo: document.getElementById('periodo'),
    folhaPeriodo: document.getElementById('folha-periodo'),
    opcoes: document.getElementById('opcoes-ministerios'),
    de: document.getElementById('de'),
    ate: document.getElementById('ate'),
    atalho: document.getElementById('atalho'),
    gerar: document.getElementById('gerar'),
    busca: document.getElementById('busca'),
    nomes: document.getElementById('nomes'),
    resultado: document.getElementById('resultado')
  };

  ['link-planilha', 'nav-planilha'].forEach(function (id) {
    var a = document.getElementById(id);
    if (a) a.href = window.CONFIG.planilhaUrl;
  });

  var modelo = null;
  var proxima = -1;
  // guarda a seleção por data (e não por posição), para sobreviver a
  // uma atualização em que a planilha ganhou ou perdeu colunas
  var selecao = { de: null, ate: null };

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function pessoaHTML(p) {
    var m = p.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
    if (!m) return esc(p);
    return esc(m[1].trim()) + ' <span class="obs">' + esc(m[2].trim()) + '</span>';
  }

  function nomesHTML(valor) {
    var ps = Escalas.pessoas(valor);
    if (!ps.length) return '';
    return ps.map(pessoaHTML).join(' / ');
  }

  /* ---------- seleção atual --------------------------------------- */

  function ministeriosMarcados() {
    return Array.prototype.slice
      .call(el.opcoes.querySelectorAll('input:checked'))
      .map(function (i) { return i.value; });
  }

  function faixa() {
    var a = +el.de.value;
    var b = +el.ate.value;
    if (isNaN(a)) a = 0;
    if (isNaN(b)) b = modelo.datas.length - 1;
    if (a > b) { var t = a; a = b; b = t; }
    return [a, b];
  }

  /* ---------- tabelas --------------------------------------------- */

  function tabelaHTML(min, ini, fim) {
    if (min.erro) {
      return '<p class="aviso">Não foi possível ler a aba <b>' + esc(min.aba) + '</b>.</p>';
    }
    if (!min.funcoes.length) {
      return '<p class="aviso">Nenhuma função cadastrada na aba ' + esc(min.aba) + '.</p>';
    }

    var html = '<div class="rolagem"><table class="escala"><thead><tr>' +
      '<th scope="col">Data</th>';

    min.funcoes.forEach(function (f) {
      html += '<th scope="col">' + esc(f.rotulo) + '</th>';
    });
    html += '</tr></thead><tbody>';

    var linhas = 0;

    for (var i = ini; i <= fim; i++) {
      var d = modelo.datas[i];
      if (!d) continue;
      // cada escala mostra só as datas que ela própria tem na planilha
      if (min.presenca && !min.presenca[i]) continue;
      linhas++;
      var destaque = (i === proxima) ? ' class="proxima"' : '';
      html += '<tr' + destaque + '><th scope="row">' +
        esc(d.curta) + ' <span class="obs" style="color:var(--tinta-3);font-size:11px">' +
        esc(d.diaSemana.replace('-feira', '')) + '</span></th>';

      min.funcoes.forEach(function (f) {
        var v = f.valores[i];
        html += v
          ? '<td>' + nomesHTML(v) + '</td>'
          : '<td class="vaga">—</td>';
      });
      html += '</tr>';
    }

    if (!linhas) {
      return '<p class="aviso">Esta escala não tem datas dentro do período escolhido.</p>';
    }

    return html + '</tbody></table></div>';
  }

  function desenharTabelas() {
    var marcados = ministeriosMarcados();
    var f = faixa();

    // memoriza a seleção pelas datas em si
    selecao.de = modelo.datas[f[0]] ? modelo.datas[f[0]].iso : null;
    selecao.ate = modelo.datas[f[1]] ? modelo.datas[f[1]].iso : null;

    var visiveis = modelo.ministerios.filter(function (m) {
      return marcados.indexOf(m.id) !== -1;
    });

    if (!visiveis.length) {
      el.tabelas.innerHTML = '<p class="aviso nao-imprime">Marque ao menos uma escala acima.</p>';
      atualizarPeriodo(f);
      return;
    }

    el.tabelas.innerHTML = visiveis.map(function (min) {
      return '<section class="secao-tabela">' +
        '<div class="secao-tabela__topo">' +
          '<h2 class="secao-tabela__nome">' + esc(min.nome) + '</h2>' +
          (min.resumo ? '<span class="secao-tabela__resumo">' + esc(min.resumo) + '</span>' : '') +
        '</div>' +
        tabelaHTML(min, f[0], f[1]) +
        '<p class="arraste nao-imprime">← arraste a tabela para o lado →</p>' +
        '</section>';
    }).join('');

    atualizarPeriodo(f);
    marcarRolagem();
  }

  // Mostra o aviso de arrastar só nas tabelas que realmente não cabem na tela.
  function marcarRolagem() {
    Array.prototype.forEach.call(
      el.tabelas.querySelectorAll('.secao-tabela'),
      function (sec) {
        var r = sec.querySelector('.rolagem');
        sec.classList.toggle('tem-rolagem', !!r && r.scrollWidth > r.clientWidth + 4);
      }
    );
  }

  function atualizarPeriodo(f) {
    var a = modelo.datas[f[0]], b = modelo.datas[f[1]];
    if (!a || !b) return;
    var txt = a.iso === b.iso
      ? Escalas.porExtenso(a.data)
      : Escalas.porExtenso(a.data) + ' a ' + Escalas.porExtenso(b.data);

    el.periodo.textContent = txt + ' · ' + (f[1] - f[0] + 1) + ' datas';

    var marcados = modelo.ministerios
      .filter(function (m) { return ministeriosMarcados().indexOf(m.id) !== -1; })
      .map(function (m) { return m.nome; }).join(' · ');

    el.folhaPeriodo.innerHTML = esc(marcados) + '<br>' + esc(txt);
  }

  /* ---------- controles ------------------------------------------- */

  function opcoesDeData() {
    return modelo.datas.map(function (d, i) {
      return '<option value="' + i + '">' + esc(d.curta) + ' · ' +
        esc(d.data.getFullYear()) + '</option>';
    }).join('');
  }

  function indiceDoIso(alvo, padrao) {
    for (var i = 0; i < modelo.datas.length; i++) {
      if (modelo.datas[i].iso === alvo) return i;
    }
    return padrao;
  }

  function montarControles() {
    el.opcoes.innerHTML = modelo.ministerios.map(function (m) {
      return '<label class="opcao">' +
        '<input type="checkbox" value="' + esc(m.id) + '" checked> ' +
        esc(m.nome) + '</label>';
    }).join('');

    el.de.innerHTML = opcoesDeData();
    el.ate.innerHTML = opcoesDeData();

    aplicarAtalho();

    el.opcoes.addEventListener('change', desenharTabelas);
    el.de.addEventListener('change', function () { el.atalho.value = ''; desenharTabelas(); });
    el.ate.addEventListener('change', function () { el.atalho.value = ''; desenharTabelas(); });
    el.atalho.addEventListener('change', function () { aplicarAtalho(); desenharTabelas(); });
    el.gerar.addEventListener('click', function () { window.print(); });
  }

  // Depois de uma atualização: refaz as listas de datas sem perder a escolha.
  function refazerControles() {
    var idsAntes = ministeriosMarcados();

    el.opcoes.innerHTML = modelo.ministerios.map(function (m) {
      var marcado = !idsAntes.length || idsAntes.indexOf(m.id) !== -1;
      return '<label class="opcao">' +
        '<input type="checkbox" value="' + esc(m.id) + '"' + (marcado ? ' checked' : '') + '> ' +
        esc(m.nome) + '</label>';
    }).join('');

    el.de.innerHTML = opcoesDeData();
    el.ate.innerHTML = opcoesDeData();

    if (el.atalho.value) {
      aplicarAtalho();
    } else {
      el.de.value = indiceDoIso(selecao.de, 0);
      el.ate.value = indiceDoIso(selecao.ate, modelo.datas.length - 1);
    }
  }

  function aplicarAtalho() {
    var v = el.atalho.value;
    var ult = modelo.datas.length - 1;
    var inicio = proxima >= 0 ? proxima : 0;

    if (v === 'tudo') { el.de.value = 0; el.ate.value = ult; }
    else if (v === 'futuras') { el.de.value = inicio; el.ate.value = ult; }
    else if (v === '4') { el.de.value = inicio; el.ate.value = Math.min(inicio + 3, ult); }
    else if (v === '8') { el.de.value = inicio; el.ate.value = Math.min(inicio + 7, ult); }
  }

  /* ---------- busca por pessoa ------------------------------------ */

  function atualizarListaDeNomes() {
    el.nomes.innerHTML = Escalas.todosOsNomes(modelo)
      .map(function (n) { return '<option value="' + esc(n) + '">'; }).join('');
  }

  function montarBusca() {
    atualizarListaDeNomes();
    var timer;
    el.busca.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(buscar, 140);
    });
  }

  function buscar() {
    var termo = el.busca.value.trim();
    if (termo.length < 2) { el.resultado.innerHTML = ''; return; }

    var achados = Escalas.escalasDe(modelo, termo);
    if (!achados.length) {
      el.resultado.innerHTML =
        '<p class="resultado__vazio">Ninguém com esse nome nas escalas cadastradas.</p>';
      return;
    }

    var hoje = Escalas.hoje();
    var futuras = achados.filter(function (a) { return a.data.data >= hoje; });
    var lista = futuras.length ? futuras : achados;

    el.resultado.innerHTML =
      '<p class="rotulo" style="margin-bottom:8px">' +
      lista.length + (lista.length === 1 ? ' escala' : ' escalas') +
      (futuras.length ? ' a partir de hoje' : ' (todas já passaram)') + '</p>' +
      '<ul>' + lista.map(function (a) {
        return '<li>' +
          '<span class="quando">' + esc(a.data.curta) + ' · ' +
            esc(a.data.diaSemana.replace('-feira', '')) + '</span>' +
          '<span class="tag">' + esc(a.ministerio) + '</span>' +
          '<span class="onde">' + esc(a.funcao) + '</span>' +
          '</li>';
      }).join('') + '</ul>';
  }

  /* ---------- início e atualizações -------------------------------- */

  function aplicar(m, primeira) {
    modelo = m;

    if (!modelo.datas.length) {
      el.painel.hidden = true;
      el.tabelas.innerHTML = '<div class="erro"><b>Nenhuma data encontrada.</b>' +
        'Verifique se a primeira linha de cada aba tem as datas dos cultos.</div>';
      return;
    }

    proxima = Escalas.proximoIndice(modelo.datas);
    el.painel.hidden = false;

    if (primeira) {
      montarControles();
      montarBusca();
      window.addEventListener('resize', marcarRolagem);
    } else {
      refazerControles();
      atualizarListaDeNomes();
    }

    desenharTabelas();
    if (el.busca.value.trim().length >= 2) buscar();

    if (primeira && location.hash === '#pdf') {
      document.getElementById('pdf').scrollIntoView({ behavior: 'smooth' });
    }
  }

  Atualizador.iniciar({
    render: aplicar,
    erro: function (e) {
      el.tabelas.innerHTML = '<div class="erro">' +
        '<b>Não consegui carregar a planilha.</b>' +
        'Confira se ela está compartilhada como “qualquer pessoa com o link pode ver”. ' +
        'Detalhe técnico: ' + esc(e && e.message) + '</div>';
    }
  });
})();
