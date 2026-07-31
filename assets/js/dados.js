/* =====================================================================
   Camada de dados — lê as abas do Google Sheets e devolve um modelo
   pronto para as páginas usarem.

   Caminho principal: baixa a planilha inteira (.xlsx) e descobre sozinho
   quais abas existem e como se chamam. Renomear uma aba ou criar um
   ministério novo já aparece no site, sem mexer em código.

   Caminho reserva: se isso falhar, lê aba por aba em CSV, usando os gid
   que estão em config.js.
   ===================================================================== */

window.Escalas = (function () {
  'use strict';

  /* ---------- utilidades de texto -------------------------------- */

  function semAcento(s) {
    return String(s == null ? '' : s)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  function chave(s) {
    return semAcento(s).toUpperCase().replace(/\s+/g, ' ').trim();
  }

  var CORRECOES = {
    PORTUGUES: 'Português',
    CHINES: 'Chinês',
    PREGACAO: 'Pregação',
    OFERTA: 'Oferta',
    CEIA: 'Ceia',
    MUSICA: 'Música',
    RECEPCAO: 'Recepção',
    INTERCESSAO: 'Intercessão',
    INFANTIL: 'Infantil',
    ZELADORIA: 'Zeladoria',
    DIACONIA: 'Diaconia',
    BERCARIO: 'Berçário',
    AUXILIAR: 'Auxiliar',
    PROFESSOR: 'Professor',
    PROFESSORA: 'Professora'
  };

  // "DIRIGENTE PT" -> "Dirigente PT" ; "PPT PORTUGUES" -> "PPT Português"
  function rotular(bruto) {
    var siglas = (window.CONFIG && window.CONFIG.siglas) || [];
    return String(bruto)
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .map(function (p) {
        var k = chave(p);
        if (siglas.indexOf(k) !== -1) return k;
        if (CORRECOES[k]) return CORRECOES[k];
        if (/^\d+$/.test(p)) return p;
        return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
      })
      .join(' ');
  }

  // "Min. Zeladoria" -> "Zeladoria" ; "MINISTÉRIO DE LOUVOR" -> "LOUVOR"
  function semPrefixo(titulo) {
    return String(titulo == null ? '' : titulo)
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^(min\.?|minist(é|e)rios?)\s*(de|do|da|dos|das)?\s*[.:-]?\s*/i, '')
      .trim();
  }

  function apelido(titulo) {
    return chave(semPrefixo(titulo));
  }

  function identificador(titulo) {
    return semAcento(semPrefixo(titulo)).toLowerCase()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'aba';
  }

  // "SANTA CEIA 3" -> "SANTA CEIA"  (usado para juntar funções irmãs)
  function base(nomeFuncao) {
    return chave(nomeFuncao).replace(/\s*\d+\s*$/, '').trim();
  }

  function paraTexto(v) {
    if (v instanceof Date && !isNaN(v)) return curta(v);
    return String(v == null ? '' : v).trim();
  }

  function vazio(v) {
    var t = paraTexto(v);
    return t === '' || t === '-' || t === '--' || t === '—' || t === 'x' || t === 'X';
  }

  /* ---------- CSV ------------------------------------------------- */

  function lerCSV(texto) {
    var linhas = [], linha = [], campo = '', i = 0, aspas = false;
    while (i < texto.length) {
      var c = texto[i];
      if (aspas) {
        if (c === '"') {
          if (texto[i + 1] === '"') { campo += '"'; i += 2; continue; }
          aspas = false; i++; continue;
        }
        campo += c; i++; continue;
      }
      if (c === '"') { aspas = true; i++; continue; }
      if (c === ',') { linha.push(campo); campo = ''; i++; continue; }
      if (c === '\r') { i++; continue; }
      if (c === '\n') { linha.push(campo); campo = ''; linhas.push(linha); linha = []; i++; continue; }
      campo += c; i++;
    }
    if (campo.length || linha.length) { linha.push(campo); linhas.push(linha); }
    return linhas;
  }

  /* ---------- datas ----------------------------------------------- */

  var MESES = {
    jan: 0, fev: 1, mar: 2, abr: 3, mai: 4, jun: 5,
    jul: 6, ago: 7, set: 8, out: 9, nov: 10, dez: 11
  };

  var MES_LONGO = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  var MES_CURTO = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun',
    'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  var DIA_SEMANA = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira',
    'quinta-feira', 'sexta-feira', 'sábado'];

  // Devolve {d, m, a} — "a" pode ser null quando a planilha não traz o ano.
  function lerData(bruto) {
    // vindo do .xlsx, a data já chega pronta
    if (bruto instanceof Date && !isNaN(bruto)) {
      return { d: bruto.getDate(), m: bruto.getMonth(), a: bruto.getFullYear() };
    }

    var t = semAcento(bruto).toLowerCase().replace(/\s+/g, ' ').trim().replace(/\.$/, '');
    if (!t) return null;

    var m;

    // 2026-08-02
    m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (m) return { d: +m[3], m: +m[2] - 1, a: +m[1] };

    // 02/08/2026  ou  02/08  ou  02.08
    m = t.match(/^(\d{1,2})[\/.](\d{1,2})(?:[\/.](\d{2,4}))?$/);
    if (m) {
      var ano = m[3] ? +m[3] : null;
      if (ano !== null && ano < 100) ano += 2000;
      return { d: +m[1], m: +m[2] - 1, a: ano };
    }

    // 2-ago  |  2 ago  |  2 de agosto  |  2 de agosto de 2026
    m = t.match(/^(\d{1,2})\s*(?:de\s+|[-\/\s])\s*([a-z]{3,})(?:\s*(?:de\s+)?(\d{2,4}))?$/);
    if (m) {
      var mes = MESES[m[2].slice(0, 3)];
      if (mes === undefined) return null;
      var a2 = m[3] ? +m[3] : null;
      if (a2 !== null && a2 < 100) a2 += 2000;
      return { d: +m[1], m: mes, a: a2 };
    }

    return null;
  }

  // Resolve o ano das datas que vieram sem ano, mantendo a ordem crescente
  // e ancorando a primeira delas no ano mais próximo de hoje.
  function resolverAnos(brutas) {
    var hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    var partes = brutas.map(lerData);
    var anoAtual = hoje.getFullYear();
    var anterior = null;

    return partes.map(function (p, i) {
      if (!p) return null;
      var ano = p.a;

      if (ano == null) {
        if (anterior == null) {
          // âncora: escolhe o ano que deixa a data mais perto de hoje
          var melhor = null, menor = Infinity;
          [anoAtual - 1, anoAtual, anoAtual + 1].forEach(function (y) {
            var dist = Math.abs(new Date(y, p.m, p.d) - hoje);
            if (dist < menor) { menor = dist; melhor = y; }
          });
          ano = melhor;
        } else {
          ano = anterior.getFullYear();
          if (new Date(ano, p.m, p.d) < anterior) ano += 1;
        }
      }

      var data = new Date(ano, p.m, p.d);
      data.setHours(0, 0, 0, 0);
      if (isNaN(data)) return null;
      anterior = data;
      return { data: data, indice: i };
    });
  }

  function iso(d) {
    var mm = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + mm + '-' + dd;
  }

  function porExtenso(d) {
    return d.getDate() + ' de ' + MES_LONGO[d.getMonth()] + ' de ' + d.getFullYear();
  }

  function curta(d) {
    return String(d.getDate()).padStart(2, '0') + ' ' + MES_CURTO[d.getMonth()];
  }

  function diaDaSemana(d) { return DIA_SEMANA[d.getDay()]; }

  function hojeZerado() { var h = new Date(); h.setHours(0, 0, 0, 0); return h; }

  function diasAte(d) { return Math.round((d - hojeZerado()) / 86400000); }

  /* ---------- orientação da aba ------------------------------------ */

  // Aceita a planilha nas duas orientações:
  //  A) primeira LINHA com as datas  (é como as abas estão hoje)
  //  B) primeira COLUNA com as datas
  // Sempre devolve { colunas: [data], linhas: [{funcao, valores[]}] }
  function orientar(grade) {
    grade = (grade || []).filter(function (l) {
      return l && l.some(function (c) { return paraTexto(c) !== ''; });
    });
    if (!grade.length) return null;

    function quantasDatas(arr) {
      return arr.filter(function (v) { return lerData(v); }).length;
    }

    var primeiraLinha = quantasDatas(grade[0].slice(1));
    var primeiraColuna = quantasDatas(grade.slice(1).map(function (l) { return l[0]; }));

    if (primeiraColuna > primeiraLinha) {
      var largura = Math.max.apply(null, grade.map(function (l) { return l.length; }));
      var t = [];
      for (var c = 0; c < largura; c++) {
        t.push(grade.map(function (l) { return l[c] == null ? '' : l[c]; }));
      }
      grade = t;
    }

    var cabecalho = grade[0];
    return {
      colunas: cabecalho.slice(1),
      linhas: grade.slice(1)
        .filter(function (l) { return paraTexto(l[0]) !== ''; })
        .map(function (l) {
          return { funcao: paraTexto(l[0]).replace(/\s+/g, ' '), valores: l.slice(1) };
        })
    };
  }

  // Uma aba só entra no site se parecer mesmo uma escala.
  function ehEscala(r) {
    if (!r || !r.linhas.length) return false;
    var comData = r.colunas.filter(function (v) { return lerData(v); }).length;
    return comData >= 2;
  }

  /* ---------- configuração por aba --------------------------------- */

  function ajustesDaAba(titulo) {
    var lista = (window.CONFIG && window.CONFIG.ministerios) || [];
    var alvo = apelido(titulo);
    for (var i = 0; i < lista.length; i++) {
      var c = lista[i];
      if (apelido(c.aba || '') === alvo) return c;
      if (c.id && identificador(titulo) === c.id) return c;
      if (c.nome && apelido(c.nome) === alvo) return c;
    }
    return null;
  }

  function ignorada(titulo) {
    var lista = (window.CONFIG && window.CONFIG.ignorarAbas) || [];
    var alvo = apelido(titulo);
    return lista.some(function (n) { return apelido(n) === alvo; });
  }

  /* ---------- grupos ------------------------------------------------ */

  function montarGrupos(cfg, funcoes) {
    var usadas = {};
    var grupos = [];

    ((cfg && cfg.grupos) || []).forEach(function (g) {
      var itens = [];
      g.funcoes.forEach(function (nome) {
        var f = funcoes.find(function (x) { return x.chave === chave(nome); });
        if (f && !usadas[f.chave]) { usadas[f.chave] = true; itens.push(f); }
      });
      if (itens.length) grupos.push({ nome: g.nome, funcoes: itens });
    });

    // Funções que existem na planilha mas não foram citadas na configuração:
    // agrupa automaticamente as numeradas ("OFERTA 1", "OFERTA 2"...).
    var sobra = funcoes.filter(function (f) { return !usadas[f.chave]; });
    var i = 0;
    while (i < sobra.length) {
      var b = base(sobra[i].funcao);
      var lote = [sobra[i]];
      var j = i + 1;
      while (j < sobra.length && base(sobra[j].funcao) === b && b !== chave(sobra[j].funcao)) {
        lote.push(sobra[j]); j++;
      }
      grupos.push({ nome: lote.length > 1 ? rotular(b) : null, funcoes: lote });
      i = j;
    }

    // Um grupo é "lista simples" quando todas as funções compartilham a mesma
    // raiz (Santa Ceia 1..4) — aí mostramos só os nomes, sem repetir o rótulo.
    grupos.forEach(function (g) {
      var raizes = {};
      g.funcoes.forEach(function (f) { raizes[base(f.funcao)] = true; });
      g.lista = g.funcoes.length > 1 && Object.keys(raizes).length === 1;
    });

    return grupos;
  }

  /* ---------- montagem do modelo ----------------------------------- */

  // entradas: [{ titulo, cfg, dados|null, erro|null }]
  function montarModelo(entradas) {
    var mapa = {};

    var preparadas = entradas.map(function (e) {
      if (!e.dados) return e;
      e.datas = resolverAnos(e.dados.colunas);
      e.datas.forEach(function (d) { if (d) mapa[iso(d.data)] = d.data; });
      return e;
    });

    var datasOrdenadas = Object.keys(mapa).sort().map(function (k) {
      var d = mapa[k];
      return {
        iso: k, data: d,
        curta: curta(d), extenso: porExtenso(d), diaSemana: diaDaSemana(d)
      };
    });

    var indicePorIso = {};
    datasOrdenadas.forEach(function (d, i) { indicePorIso[d.iso] = i; });

    var ministerios = preparadas.map(function (e) {
      var cfg = e.cfg || {};

      var funcoes = ((e.dados && e.dados.linhas) || []).map(function (l) {
        var valores = new Array(datasOrdenadas.length).fill('');
        (e.datas || []).forEach(function (d) {
          if (!d) return;
          var pos = indicePorIso[iso(d.data)];
          if (pos == null) return;
          var v = l.valores[d.indice];
          valores[pos] = vazio(v) ? '' : paraTexto(v);
        });
        return {
          funcao: l.funcao,
          chave: chave(l.funcao),
          rotulo: rotular(l.funcao),
          valores: valores
        };
      });

      return {
        id: cfg.id || identificador(e.titulo),
        nome: cfg.nome || rotular(semPrefixo(e.titulo)),
        resumo: cfg.resumo || null,
        lembrete: cfg.lembrete || null,
        aba: e.titulo,
        erro: e.erro || null,
        funcoes: funcoes,
        grupos: montarGrupos(cfg, funcoes),
        preenchido: funcoes.some(function (f) {
          return f.valores.some(function (v) { return v !== ''; });
        })
      };
    });

    return { datas: datasOrdenadas, ministerios: ministerios };
  }

  /* ---------- caminho principal: planilha inteira ------------------- */

  function viaPlanilha() {
    if (!window.Planilha) return Promise.reject(new Error('sem-leitor'));

    return window.Planilha.ler().then(function (abas) {
      var entradas = [];

      abas.forEach(function (aba) {
        if (ignorada(aba.nome)) return;
        var r = orientar(aba.grade);
        if (!ehEscala(r)) return;
        entradas.push({ titulo: aba.nome, cfg: ajustesDaAba(aba.nome), dados: r, erro: null });
      });

      if (!entradas.length) throw new Error('nenhuma-aba-de-escala');
      return montarModelo(entradas);
    });
  }

  /* ---------- caminho reserva: CSV por aba -------------------------- */

  function urlsDaAba(min) {
    var b = 'https://docs.google.com/spreadsheets/d/' + window.CONFIG.planilhaId;
    var agora = Date.now();
    var urls = [];
    if (min.gid != null && min.gid !== '') {
      urls.push(b + '/export?format=csv&gid=' + encodeURIComponent(min.gid) + '&_=' + agora);
      urls.push(b + '/gviz/tq?tqx=out:csv&gid=' + encodeURIComponent(min.gid) + '&_=' + agora);
    }
    if (min.aba) {
      urls.push(b + '/gviz/tq?tqx=out:csv&sheet=' + encodeURIComponent(min.aba) + '&_=' + agora);
    }
    return urls;
  }

  function buscarAba(min) {
    var urls = urlsDaAba(min);

    function tentar(i) {
      if (i >= urls.length) return Promise.reject(new Error('sem-acesso'));
      return fetch(urls[i], { cache: 'no-store' })
        .then(function (r) {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return r.text();
        })
        .then(function (txt) {
          if (/<html/i.test(txt)) throw new Error('sem-acesso');
          return orientar(lerCSV(txt));
        })
        .catch(function (e) {
          if (i + 1 < urls.length) return tentar(i + 1);
          throw e;
        });
    }

    return tentar(0);
  }

  function viaCsv() {
    var mins = (window.CONFIG && window.CONFIG.ministerios) || [];
    if (!mins.length) return Promise.reject(new Error('sem-configuracao'));

    return Promise.all(mins.map(function (m) {
      return buscarAba(m).then(
        function (r) { return { titulo: m.aba || m.nome, cfg: m, dados: r, erro: null }; },
        function (e) {
          return { titulo: m.aba || m.nome, cfg: m, dados: null, erro: (e && e.message) || 'erro' };
        }
      );
    })).then(function (entradas) {
      if (entradas.every(function (e) { return !e.dados; })) throw new Error('sem-acesso');
      return montarModelo(entradas);
    });
  }

  function carregar() {
    return viaPlanilha().catch(function () { return viaCsv(); });
  }

  /* ---------- consultas ------------------------------------------- */

  function proximoIndice(datas) {
    var hoje = hojeZerado();
    for (var i = 0; i < datas.length; i++) {
      if (datas[i].data >= hoje) return i;
    }
    return -1;
  }

  function pessoas(valor) {
    if (!valor) return [];
    return String(valor).split(/\s*[\/;]\s*/)
      .map(function (s) { return s.trim(); })
      .filter(Boolean);
  }

  function nomeLimpo(pessoa) {
    return pessoa.replace(/\(.*?\)/g, '').replace(/\s+/g, ' ').trim();
  }

  function escalasDe(modelo, termo) {
    var alvo = chave(termo);
    if (!alvo) return [];
    var achados = [];
    modelo.ministerios.forEach(function (min) {
      min.funcoes.forEach(function (f) {
        f.valores.forEach(function (v, i) {
          if (!v) return;
          var bate = pessoas(v).some(function (p) {
            return chave(nomeLimpo(p)).indexOf(alvo) !== -1;
          });
          if (bate) {
            achados.push({
              data: modelo.datas[i], ministerio: min.nome,
              funcao: f.rotulo, valor: v
            });
          }
        });
      });
    });
    return achados.sort(function (a, b) { return a.data.data - b.data.data; });
  }

  function todosOsNomes(modelo) {
    var set = {};
    modelo.ministerios.forEach(function (min) {
      min.funcoes.forEach(function (f) {
        f.valores.forEach(function (v) {
          pessoas(v).forEach(function (p) {
            var n = nomeLimpo(p);
            if (n) set[n] = true;
          });
        });
      });
    });
    return Object.keys(set).sort(function (a, b) { return a.localeCompare(b, 'pt-BR'); });
  }

  return {
    carregar: carregar,
    proximoIndice: proximoIndice,
    pessoas: pessoas,
    nomeLimpo: nomeLimpo,
    escalasDe: escalasDe,
    todosOsNomes: todosOsNomes,
    diasAte: diasAte,
    porExtenso: porExtenso,
    curta: curta,
    diaDaSemana: diaDaSemana,
    hoje: hojeZerado,
    chave: chave,
    rotular: rotular
  };
})();
