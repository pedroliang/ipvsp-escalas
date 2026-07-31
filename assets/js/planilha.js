/* =====================================================================
   Leitor da planilha inteira

   Baixa a planilha do Google em formato .xlsx (um pedido só, poucos KB)
   e lê ali dentro os nomes de TODAS as abas e o conteúdo de cada uma.

   É isso que permite renomear uma aba, ou criar um ministério novo,
   sem precisar mexer em nada no site.

   Não usa nenhuma biblioteca externa: o .xlsx é um ZIP com XML dentro,
   e o próprio navegador sabe descompactar (DecompressionStream).
   ===================================================================== */

window.Planilha = (function () {
  'use strict';

  function suportado() {
    return typeof DecompressionStream === 'function' &&
      typeof DOMParser === 'function';
  }

  /* ---------- ZIP -------------------------------------------------- */

  function inflar(buf, metodo) {
    if (metodo === 0) return Promise.resolve(buf);          // guardado, sem compressão
    if (metodo !== 8) return Promise.reject(new Error('compressao ' + metodo));
    var fluxo = new Blob([buf]).stream()
      .pipeThrough(new DecompressionStream('deflate-raw'));
    return new Response(fluxo).arrayBuffer();
  }

  // Devolve { 'caminho/arquivo.xml': Promise<string> }
  function abrirZip(buffer) {
    var v = new DataView(buffer);
    var bytes = new Uint8Array(buffer);
    var texto = new TextDecoder('utf-8');

    // fim do diretório central (assinatura 0x06054b50), procurando de trás para frente
    var fim = -1;
    for (var i = buffer.byteLength - 22; i >= 0 && i > buffer.byteLength - 66000; i--) {
      if (v.getUint32(i, true) === 0x06054b50) { fim = i; break; }
    }
    if (fim < 0) throw new Error('zip invalido');

    var total = v.getUint16(fim + 10, true);
    var ponteiro = v.getUint32(fim + 16, true);

    var arquivos = {};

    for (var n = 0; n < total; n++) {
      if (v.getUint32(ponteiro, true) !== 0x02014b50) break;

      var metodo = v.getUint16(ponteiro + 10, true);
      var tamComprimido = v.getUint32(ponteiro + 20, true);
      var tamNome = v.getUint16(ponteiro + 28, true);
      var tamExtra = v.getUint16(ponteiro + 30, true);
      var tamComentario = v.getUint16(ponteiro + 32, true);
      var inicioLocal = v.getUint32(ponteiro + 42, true);

      var nome = texto.decode(bytes.subarray(ponteiro + 46, ponteiro + 46 + tamNome));

      // cabeçalho local: o tamanho do "extra" costuma ser diferente do central
      var nomeLocal = v.getUint16(inicioLocal + 26, true);
      var extraLocal = v.getUint16(inicioLocal + 28, true);
      var dados = inicioLocal + 30 + nomeLocal + extraLocal;

      arquivos[nome] = (function (ini, tam, met) {
        return function () {
          return inflar(buffer.slice(ini, ini + tam), met)
            .then(function (b) { return new TextDecoder('utf-8').decode(b); });
        };
      })(dados, tamComprimido, metodo);

      ponteiro += 46 + tamNome + tamExtra + tamComentario;
    }

    return arquivos;
  }

  /* ---------- XML -------------------------------------------------- */

  function xml(txt) {
    var d = new DOMParser().parseFromString(txt, 'application/xml');
    if (d.querySelector('parsererror')) throw new Error('xml invalido');
    return d;
  }

  function filhos(no, tag) {
    return Array.prototype.slice.call(no.getElementsByTagName(tag));
  }

  /* ---------- datas ------------------------------------------------ */

  // Formatos de data embutidos no padrão do Excel
  var FORMATOS_DATA = [14, 15, 16, 17, 18, 19, 20, 21, 22,
    27, 28, 29, 30, 31, 32, 33, 34, 35, 36,
    45, 46, 47, 50, 51, 52, 53, 54, 55, 56, 57, 58];

  function ehFormatoDeData(id, codigo) {
    if (FORMATOS_DATA.indexOf(id) !== -1) return true;
    if (!codigo) return false;
    // tira trechos entre aspas e colchetes antes de procurar d/m/a
    var limpo = codigo.replace(/"[^"]*"/g, '').replace(/\[[^\]]*\]/g, '');
    return /[dmy]/i.test(limpo) && !/^general$/i.test(limpo.trim());
  }

  // Número de série do Excel para Data (a base é 30/12/1899)
  function serialParaData(n) {
    var ms = Math.round((n - 25569) * 86400000);
    var d = new Date(ms);
    return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  }

  /* ---------- planilha --------------------------------------------- */

  function indiceDaColuna(ref) {
    var m = /^([A-Z]+)/.exec(ref || '');
    if (!m) return -1;
    var n = 0;
    for (var i = 0; i < m[1].length; i++) n = n * 26 + (m[1].charCodeAt(i) - 64);
    return n - 1;
  }

  function lerEstilos(txt) {
    var estilos = { data: {} };
    if (!txt) return estilos;

    var d = xml(txt);
    var codigos = {};
    filhos(d, 'numFmt').forEach(function (f) {
      codigos[+f.getAttribute('numFmtId')] = f.getAttribute('formatCode');
    });

    var cellXfs = d.getElementsByTagName('cellXfs')[0];
    if (!cellXfs) return estilos;

    filhos(cellXfs, 'xf').forEach(function (xf, i) {
      var id = +(xf.getAttribute('numFmtId') || 0);
      estilos.data[i] = ehFormatoDeData(id, codigos[id]);
    });

    return estilos;
  }

  function lerTextos(txt) {
    if (!txt) return [];
    return filhos(xml(txt), 'si').map(function (si) {
      // ignora anotações fonéticas (rPh), que não fazem parte do texto
      return filhos(si, 't')
        .filter(function (t) { return !t.parentNode || t.parentNode.nodeName !== 'rPh'; })
        .map(function (t) { return t.textContent; })
        .join('');
    });
  }

  function lerAba(txt, textos, estilos) {
    var d = xml(txt);
    var grade = [];

    filhos(d, 'row').forEach(function (linha) {
      var celulas = [];
      filhos(linha, 'c').forEach(function (c) {
        var col = indiceDaColuna(c.getAttribute('r'));
        if (col < 0) col = celulas.length;

        var tipo = c.getAttribute('t');
        var valor = '';

        if (tipo === 'inlineStr') {
          valor = filhos(c, 't').map(function (t) { return t.textContent; }).join('');
        } else {
          var v = c.getElementsByTagName('v')[0];
          var bruto = v ? v.textContent : '';
          if (bruto === '') {
            valor = '';
          } else if (tipo === 's') {
            valor = textos[+bruto] != null ? textos[+bruto] : '';
          } else if (tipo === 'b') {
            valor = bruto === '1' ? 'VERDADEIRO' : 'FALSO';
          } else if (tipo === 'e') {
            valor = '';
          } else if (tipo === 'str') {
            valor = bruto;
          } else {
            var num = parseFloat(bruto);
            var s = c.getAttribute('s');
            if (!isNaN(num) && s != null && estilos.data[+s]) {
              valor = serialParaData(num);                  // vira uma Data de verdade
            } else {
              valor = isNaN(num) ? bruto : String(num);
            }
          }
        }

        while (celulas.length < col) celulas.push('');
        celulas[col] = valor;
      });

      var r = +(linha.getAttribute('r') || (grade.length + 1));
      while (grade.length < r - 1) grade.push([]);
      grade[r - 1] = celulas;
    });

    return grade;
  }

  /* ---------- entrada ---------------------------------------------- */

  function url() {
    return 'https://docs.google.com/spreadsheets/d/' + window.CONFIG.planilhaId +
      '/export?format=xlsx&_=' + Date.now();
  }

  // Devolve [{ nome, grade }] na mesma ordem das abas da planilha.
  function ler() {
    if (!suportado()) return Promise.reject(new Error('navegador-antigo'));

    return fetch(url(), { cache: 'no-store' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.arrayBuffer();
      })
      .then(function (buffer) {
        var zip = abrirZip(buffer);

        function talvez(caminho) {
          return zip[caminho] ? zip[caminho]() : Promise.resolve(null);
        }

        return Promise.all([
          zip['xl/workbook.xml'](),
          talvez('xl/_rels/workbook.xml.rels'),
          talvez('xl/sharedStrings.xml'),
          talvez('xl/styles.xml')
        ]).then(function (partes) {
          var wb = xml(partes[0]);
          var estilos = lerEstilos(partes[3]);
          var textos = lerTextos(partes[2]);

          var destinos = {};
          if (partes[1]) {
            filhos(xml(partes[1]), 'Relationship').forEach(function (rel) {
              destinos[rel.getAttribute('Id')] = rel.getAttribute('Target').replace(/^\/?xl\//, '');
            });
          }

          var abas = filhos(wb, 'sheet').filter(function (s) {
            return s.getAttribute('state') !== 'hidden' &&
              s.getAttribute('state') !== 'veryHidden';
          });

          return Promise.all(abas.map(function (s, i) {
            var rid = s.getAttribute('r:id') ||
              s.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
            var caminho = 'xl/' + (destinos[rid] || ('worksheets/sheet' + (i + 1) + '.xml'));
            if (!zip[caminho]) caminho = 'xl/worksheets/sheet' + (i + 1) + '.xml';
            if (!zip[caminho]) return null;

            return zip[caminho]().then(function (t) {
              return { nome: s.getAttribute('name'), grade: lerAba(t, textos, estilos) };
            });
          })).then(function (lista) {
            return lista.filter(Boolean);
          });
        });
      });
  }

  return { ler: ler, suportado: suportado };
})();
