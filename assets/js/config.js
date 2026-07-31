/* =====================================================================
   CONFIGURAÇÃO DO SITE
   ---------------------------------------------------------------------
   Este é o único arquivo que normalmente precisa ser editado.
   Para adicionar um novo ministério, copie um bloco de "ministerios"
   e troque o gid (o número que aparece na URL da aba no Google Sheets).
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
      aba: 'LOUVOR',
      grupos: [
        { nome: 'Culto em Português', funcoes: ['DIRIGENTE PT', 'VOCAL PT'] },
        { nome: 'Culto em Chinês', funcoes: ['DIRIGENTE CH', 'VOCAL CH'] },
        { nome: 'Banda', funcoes: ['CORDA', 'BATERIA', 'TECLADO'] },
        { nome: 'Técnica', funcoes: ['SOM', 'PPT PORTUGUES', 'PPT CHINES'] }
      ]
    },
    {
      id: 'lar',
      nome: 'Cuidando do Lar',
      resumo: 'Quem prepara a casa',
      gid: '1206500158',
      aba: 'LAR',
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
    }
  ],

  // Siglas que devem continuar em maiúsculas ao formatar os nomes das funções
  siglas: ['PT', 'CH', 'PPT', 'EBD']
};
