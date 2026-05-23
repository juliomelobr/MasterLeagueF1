# Highlights do Mural (Home)

## Estrutura de pastas

- `public/highlights/gp-<slug>/`  
  Histórico por etapa (ex.: `gp-bahrein`, `gp-arabia-saudita`, `gp-imola`).
- `public/highlights/atual/`  
  Opcional. Mantido apenas para organizacao interna.

## Nomes de arquivos (padrao)

Em **cada pasta de GP**:

- `vencedor-carreira.png`
- `top10-carreira.png`
- `vencedor-light.png`
- `top10-light.png`

## Regra da corrida atual (automatica)

No `Home`, a corrida atual e detectada automaticamente pelo calendario:

1. Japao
2. Mexico
3. Canada
4. Brasil
5. Azerbaijao
6. Imola
7. Arabia Saudita
8. Bahrein

> A busca acontece de tras para frente no calendario real do codigo  
> (`gp-japao` -> ... -> `gp-bahrein`).

A primeira pasta que tiver arquivo de **carreira** valido vira a corrida atual.
Se `gp-japao` nao tiver artes, ele cai para `gp-mexico`, depois `gp-canada` e assim por diante.

## Ordem de exibicao no carrossel

Para cada etapa (da mais nova para a mais antiga):

- Se ja tiver artes de **carreira**:
  1. `vencedor-carreira`
  2. `top10-carreira`
  3. `top10-light`
  4. `vencedor-light`

- Se ainda **nao** tiver carreira (semana da light):
  1. `top10-light`
  2. `vencedor-light`

## Regra simples por grid

- **Grid Carreira:** `vencedor` sempre a esquerda do `top10`.
- **Grid Light:** `top10` sempre a esquerda do `vencedor`.

## Como adicionar um novo GP

1. Crie a pasta:
   - `public/highlights/gp-<slug>/`
2. Coloque os 4 arquivos com os nomes padrao acima.
3. Em `src/pages/Home.jsx`, adicione o GP no calendario `HIGHLIGHTS_CALENDAR`.
4. Opcional: atualize os vencedores em `HIGHLIGHTS_WINNERS`.

Exemplo:

```js
{ slug: 'gp-japao', category: 'GP DO JAPAO' }
```

## Observacoes

- O carrossel do mural e continuo no desktop.
- No mobile, o mural funciona em arraste horizontal.
- O feed ordena primeiro por calendario (corrida mais nova), depois por data dos arquivos.
- O arquivo mais novo de carreira define qual GP passa a ser o "atual" automaticamente.
