# Escalas — Igreja Pão da Vida São Paulo

Site das escalas de serviço da igreja. A página inicial mostra quem serve no
**próximo culto**; a página de escalas mostra todas as datas, permite buscar
por pessoa e gerar um PDF com as escalas escolhidas.

Os dados vêm direto do Google Sheets. **Não é preciso mexer no site para
atualizar a escala** — basta editar a planilha.

## Quando a mudança aparece no site

- **Sozinho, a cada minuto**, enquanto a página estiver aberta.
- **Na hora**, clicando em **Atualizar** no topo da página.
- **Ao voltar para a aba** do navegador, se ela ficou parada por um tempo.

O link **Planilha**, também no topo, abre o Google Sheets para quem for editar.

> Se você mudou algo e não viu diferença, confira **em qual coluna de data**
> a mudança foi feita. A página inicial mostra apenas o **próximo domingo** —
> alterações em datas passadas só aparecem na página *Escalas*, escolhendo o
> atalho **"Todas as datas"**.

---

## Como atualizar as escalas

Edite a planilha:
<https://docs.google.com/spreadsheets/d/1Fki58PjY8xyGjfKvdV1oJpStEh_Q_oQzujLcOgaXMsg/edit>

A planilha tem três abas — `PREGACAO`, `LOUVOR` e `LAR` — todas no mesmo formato:

|                | 5-jul. | 12-jul. | 19-jul. |
|----------------|--------|---------|---------|
| **DIRIGENTE PT** | Kathy | Lika | Kathy |
| **VOCAL PT**     | Lika  | Pedrão | Pedrão |

- A **primeira linha** tem as datas dos cultos.
- Cada **linha seguinte** é uma função, e as células trazem quem está escalado.
- Célula vazia ou `-` aparece no site como *a definir*.
- Duas pessoas na mesma função? Separe com barra: `Luquinhas / Elias`.
- Observação entre parênteses vira uma marcação discreta: `Maga (PT) / Ester (CH)`.

### Datas aceitas

`5-jul.` · `12/07` · `12/07/2026` · `12 de julho` · `2026-07-12`

Quando o ano não é informado, o site deduz pelo contexto. Se as escalas
atravessarem a virada do ano, vale escrever o ano ao menos na primeira data.

### Acrescentar ou remover funções

Basta acrescentar ou apagar linhas na planilha — o site se ajusta sozinho.
Funções numeradas com o mesmo nome (`SANTA CEIA 1`, `SANTA CEIA 2`…) são
exibidas juntas, como uma lista de nomes.

---

## Instalar no celular

O botão **Instalar no celular** (no rodapé e abaixo das escalas) coloca um
ícone com o logo da igreja na tela inicial do aparelho. O site passa a abrir
em tela cheia, sem a barra do navegador.

- **Android e computador:** o próprio navegador abre a caixa de instalação.
- **iPhone e iPad:** o botão mostra o passo a passo do
  *Compartilhar → Adicionar à Tela de Início* (é preciso usar o **Safari**).

Uma vez instalado, o botão some sozinho.

---

## Como gerar o PDF

Na página **Escalas**, marque quais escalas quer incluir e escolha o período.
Clique em **Gerar PDF** e, na janela de impressão, selecione
*Salvar como PDF* no destino. O PDF sai em paisagem, com o logo da igreja
e o período no cabeçalho.

---

## Requisito de compartilhamento

A planilha precisa estar compartilhada como
**“Qualquer pessoa com o link — Leitor”**. Sem isso o site não consegue ler os
dados. Isso não permite que ninguém edite a planilha — apenas ler.

---

## Estrutura dos arquivos

```
index.html            página inicial (próximo culto)
escalas.html          todas as datas, busca e exportação em PDF
assets/css/app.css    estilos, incluindo o layout de impressão
assets/js/config.js   ← configuração: planilha, abas e agrupamentos
assets/js/dados.js    leitura e interpretação da planilha
assets/js/home.js     montagem da página inicial
assets/js/escalas.js  montagem da página de escalas
assets/img/           logo e ícones
```

### Adicionar um novo ministério

Abra `assets/js/config.js`, copie um bloco de `ministerios` e ajuste:

```js
{
  id: 'recepcao',
  nome: 'Recepção',
  resumo: 'Quem recebe na porta',
  gid: '123456789',     // número que aparece na URL da aba (#gid=...)
  aba: 'RECEPCAO',
  grupos: []
}
```

---

## Publicação

O site é estático e roda no GitHub Pages. Qualquer alteração enviada para a
branch `main` fica no ar em poucos minutos.
