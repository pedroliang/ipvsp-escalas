/* =====================================================================
   CONFIGURAÇÃO DO SITE
   ---------------------------------------------------------------------
   O site descobre as abas da planilha sozinho. Renomear uma aba ou criar
   um ministério novo JÁ APARECE no site, sem mexer aqui.

   A lista "ministerios" abaixo é só um conjunto de ajustes finos, para
   quando você quiser mudar o nome exibido, a frase de apoio, a ordem dos
   grupos de funções ou acrescentar um lembrete. Cada bloco é ligado a uma
   aba pelo campo "aba" (o prefixo "Min." é ignorado na comparação).

   Uma aba entra no site quando tem pelo menos duas datas na primeira
   linha. Abas de anotações, portanto, ficam de fora automaticamente.
   ===================================================================== */

window.CONFIG = {
  // ID da planilha (o trecho entre /d/ e /edit na URL)
  planilhaId: '1Fki58PjY8xyGjfKvdV1oJpStEh_Q_oQzujLcOgaXMsg',

  planilhaUrl:
    'https://docs.google.com/spreadsheets/d/1Fki58PjY8xyGjfKvdV1oJpStEh_Q_oQzujLcOgaXMsg/edit',

  igreja: {
    nome: 'Igreja Pão da Vida',
    cidade: 'São Paulo'
  },

  // Dia da semana do culto: 0 = domingo, 1 = segunda ... 6 = sábado
  diaDoCulto: 0,

  // De quantos em quantos segundos o site relê a planilha sozinho
  // (só enquanto a aba está aberta e visível).
  atualizacaoSegundos: 60,

  // Abas que nunca devem virar escala no site, mesmo que tenham datas.
  // Ex.: ignorarAbas: ['Rascunho', 'Contatos']
  ignorarAbas: [],

  // Ajustes opcionais por aba. Uma aba que não aparecer aqui entra no site
  // do mesmo jeito, com o nome da própria aba e agrupamento automático.
  // O "gid" só é usado no modo reserva, se a leitura da planilha falhar.
  ministerios: [
    {
      id: 'pregacao',
      nome: 'Pregação',
      resumo: 'A Palavra do domingo',
      gid: '1326078536',
      aba: 'PREGACAO',
      // Sem grupos: todas as funções aparecem em sequência.
      grupos: []
    },
    {
      id: 'louvor',
      nome: 'Louvor',
      resumo: 'Quem conduz e quem toca',
      gid: '0',
      aba: 'Min. Louvor',
      grupos: [
        { nome: 'Culto em Português', funcoes: ['DIRIGENTE PT', 'VOCAL PT'] },
        { nome: 'Culto em Chinês', funcoes: ['DIRIGENTE CH', 'VOCAL CH'] },
        { nome: 'Banda', funcoes: ['CORDA', 'BATERIA', 'TECLADO'] },
        { nome: 'Técnica', funcoes: ['SOM', 'PPT PORTUGUES', 'PPT CHINES'] }
      ]
    },
    {
      id: 'zeladoria',
      nome: 'Zeladoria',
      resumo: 'Quem prepara a casa',
      gid: '1206500158',
      aba: 'Min. Zeladoria',
      grupos: [
        { nome: 'Limpeza e organização', funcoes: ['COLABORADOR 1', 'COLABORADOR 2'] },
        { nome: 'Oferta', funcoes: ['OFERTA 1', 'OFERTA 2'] },
        {
          nome: 'Santa Ceia',
          funcoes: ['SANTA CEIA 1', 'SANTA CEIA 2', 'SANTA CEIA 3', 'SANTA CEIA 4']
        }
      ],
      // Lembrete fixo exibido no cartão deste ministério
      lembrete:
        'Ao final, confira o estoque de material de limpeza e da mesa de café e chá — e avise a liderança se algo precisar de reposição.'
    },
    {
      id: 'infantil',
      nome: 'Infantil',
      resumo: 'Quem cuida das crianças',
      gid: '950246262',
      aba: 'Min. Infantil',
      // Sem grupos definidos: o site agrupa sozinho as funções numeradas
      // (PROFESSOR 1, PROFESSOR 2...) conforme você montar a aba.
      grupos: []
    }
  ],

  // Siglas que devem continuar em maiúsculas ao formatar os nomes das funções
  siglas: ['PT', 'CH', 'PPT', 'EBD']
};
