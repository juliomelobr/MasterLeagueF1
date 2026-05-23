# Power Ranking - Documentação Completa

## Visão Geral

O **Power Ranking** é um sistema de avaliação de pilotos da Master League F1 que combina 5 pilares com pesos diferentes para gerar uma nota final de 0 a 100.

---

## Fórmula Geral

```
POWER RANKING = (PERFORMANCE × 30%) + 
                (RACECRAFT × 25%) + 
                (OVERALL × 20%) + 
                (CONDUTA × 15%) + 
                (HISTÓRICO × 10%)
```

---

## Resumo dos Pilares

| Pilar | Peso | Escala | Descrição |
|-------|------|--------|-----------|
| **PERFORMANCE** | 30% | 60-100 | Desempenho em corridas e classificações |
| **RACECRAFT** | 25% | 60-100 | Habilidade de corrida (ritmo, posições) |
| **OVERALL** | 20% | 60-100 | Cumprimento de objetivos da equipe |
| **CONDUTA** | 15% | 0-100 | Comportamento e penalidades |
| **HISTÓRICO** | 10% | 60-100 | Bagagem na liga (temporadas, corridas, PR histórico) |

---

## Pilar 1: PERFORMANCE (30%)

### Descrição
Avalia o desempenho do piloto em corridas e classificações da temporada atual.

### Cálculo
```javascript
// Busca pontos de corrida, sprint e quali da planilha
// Normaliza comparando com o maior pontuador do grid

const percentual = (pontosPiloto / maiorPontuadorDoGrid) * 100;
const performance = 60 + (percentual / 100) * 24; // Escala 60-84 (normalizada)
```

### Escala
- **Mínimo:** 60 pontos
- **Máximo:** 84 pontos (normalizado pelo maior do grid)

---

## Pilar 2: RACECRAFT (25%)

### Descrição
Avalia a habilidade de corrida do piloto através de métricas de ritmo e posições.

### Composição
| Subitem | Peso | Descrição |
|---------|------|-----------|
| Ritmo de Corrida | 30% | Delta de tempo vs média |
| Posição Quali | 20% | Score baseado na posição de largada |
| Quali Score | 20% | Desempenho na classificação |
| Posição Race | 30% | Score baseado na posição final |

### Fórmula
```javascript
const racecraft = (ritmoCorrida * 0.30) + 
                  (posQScore * 0.20) + 
                  (qualyScore * 0.20) + 
                  (posRScore * 0.30);
```

### Escala
- **Mínimo:** 60 pontos
- **Máximo:** 100 pontos

---

## Pilar 3: OVERALL (20%)

### Descrição
Avalia o cumprimento dos objetivos definidos para a equipe do piloto.

### Composição
Cada piloto tem até 5 objetivos definidos pela equipe. O cumprimento de cada objetivo contribui para a nota.

| Subitem | Descrição |
|---------|-----------|
| Objetivo 1 | Primeiro objetivo da equipe |
| Objetivo 2 | Segundo objetivo da equipe |
| Objetivo 3 | Terceiro objetivo da equipe |
| Objetivo 4 | Quarto objetivo da equipe |
| Objetivo 5 | Quinto objetivo da equipe |

### Escala
- **Mínimo:** 60 pontos
- **Máximo:** 100 pontos

---

## Pilar 4: CONDUTA (15%)

### Descrição
Avalia o comportamento do piloto, considerando penalidades, advertências e infrações.

### Fatores que Reduzem a Nota
| Fator | Impacto |
|-------|---------|
| Punições (vereditos) | Reduz pontos conforme gravidade |
| Advertências | Reduz pontos por quantidade |
| Defesas faltantes | Reduz pontos por falta |
| Faltas em corridas (NC) | Reduz pontos |
| Telemetria fechada | Reduz pontos |
| Numeração errada | Reduz pontos |
| Foto não enviada | Reduz pontos |
| Lista de presença não respondida | Reduz pontos |

### Escala
- **Máximo:** 100 pontos (sem infrações)
- **Mínimo:** 0 pontos (muitas infrações)

---

## Pilar 5: HISTÓRICO (10%)

### Descrição
Avalia a bagagem do piloto na Master League F1, considerando temporadas disputadas, corridas e PR histórico.

### Composição
| Subitem | Peso | Descrição |
|---------|------|-----------|
| **HISTÓRIA** | 40% | PR histórico normalizado (média ponderada das últimas 5 temporadas) |
| **TEMPORADAS** | 30% | Quantidade de temporadas disputadas |
| **CORRIDAS** | 30% | Total de corridas participadas |

### Fórmula
```javascript
HISTÓRICO = (HISTÓRIA × 40%) + (TEMPORADAS × 30%) + (CORRIDAS × 30%)
```

---

### Subitem: HISTÓRIA (40% do Histórico)

#### Descrição
Média ponderada do Power Ranking das últimas 5 temporadas, normalizada em relação ao maior PR do grid.

#### Pesos das Temporadas
| Temporada | Peso |
|-----------|------|
| T-0 (atual) | 35% |
| T-1 | 25% |
| T-2 | 20% |
| T-3 | 15% |
| T-4 | 5% |

#### Cálculo
```javascript
// 1. Calcular média ponderada do PR histórico
const mediaPonderada = (PR_T0 * 0.35) + (PR_T1 * 0.25) + (PR_T2 * 0.20) + (PR_T3 * 0.15) + (PR_T4 * 0.05);

// 2. Normalizar para escala 60-100 (vs maior PR do grid)
const percentual = (mediaPonderada / maiorPRDoGrid) * 100;
const historiaNormalizada = 60 + (percentual / 100) * 40;
```

#### Escala
- **Mínimo:** 60 pontos
- **Máximo:** 100 pontos

---

### Subitem: TEMPORADAS (30% do Histórico)

#### Descrição
Pontuação baseada na quantidade de temporadas disputadas pelo piloto.

#### Fórmula
```javascript
// Quantidade de temporadas + 80 (máximo 100)
const pontuacaoTemporadas = Math.min(100, quantidadeTemporadas + 80);
```

#### Exemplos
| Temporadas | Pontuação |
|------------|-----------|
| 0 | 80 |
| 5 | 85 |
| 10 | 90 |
| 15 | 95 |
| 20+ | 100 |

#### Escala
- **Mínimo:** 60 pontos (garantido)
- **Máximo:** 100 pontos

---

### Subitem: CORRIDAS (30% do Histórico)

#### Descrição
Pontuação baseada no total de corridas que o piloto participou nas últimas 5 temporadas.

#### Máximo de Corridas por Grid
| Grid | Temporadas Anteriores | T-0 | Total Máximo |
|------|----------------------|-----|--------------|
| Carreira | 32 (4 × 8) | 2 | **34** |
| Light | 32 (4 × 8) | 3 | **35** |

#### Fórmula
```javascript
if (totalCorridas === 0) {
    pontuacao = 60;
} else {
    const percentual = totalCorridas / maxCorridas; // 0 a 1
    pontuacao = 70 + (percentual * 30); // 70 a 100
}
```

#### Exemplos (Grid Carreira - máx 34)
| Corridas | Percentual | Pontuação |
|----------|------------|-----------|
| 0 | 0% | 60 |
| 1 | 2.9% | 71 |
| 17 | 50% | 85 |
| 34 | 100% | 100 |

#### Escala
- **Mínimo:** 60 pontos (se 0 corridas)
- **Mínimo com participação:** 70 pontos (se 1+ corridas)
- **Máximo:** 100 pontos

---

## Exemplo Completo de Cálculo

### Dados do Piloto

| Pilar | Valor |
|-------|-------|
| PERFORMANCE | 85 |
| RACECRAFT | 78 |
| OVERALL | 82 |
| CONDUTA | 95 |
| HISTÓRICO | 84 |

### Cálculo do Histórico

| Subitem | Valor | Peso | Contribuição |
|---------|-------|------|--------------|
| HISTÓRIA (normalizada) | 90.56 | 40% | 36.22 |
| TEMPORADAS | 82 | 30% | 24.60 |
| CORRIDAS | 75 | 30% | 22.50 |
| **HISTÓRICO FINAL** | - | - | **84** (arredondado) |

### Cálculo do Power Ranking

| Pilar | Valor | Peso | Contribuição |
|-------|-------|------|--------------|
| PERFORMANCE | 85 | 30% | 25.50 |
| RACECRAFT | 78 | 25% | 19.50 |
| OVERALL | 82 | 20% | 16.40 |
| CONDUTA | 95 | 15% | 14.25 |
| HISTÓRICO | 84 | 10% | 8.40 |
| **POWER RANKING** | - | - | **85** (arredondado) |

---

## Arquivos Relevantes

| Arquivo | Descrição |
|---------|-----------|
| `src/pages/AdminPowerRanking.jsx` | Cálculo completo do Power Ranking e pilares |
| `src/pages/PowerRanking.jsx` | Exibição dos cards de Power Ranking |
| `src/pages/PowerRankingCards.css` | Estilos dos cards |
| `src/pages/Cards.css` | Estilos base dos cards |
| `src/utils/powerRankingObjectives.js` | Objetivos por equipe |

---

## Fontes de Dados

| Dado | Origem |
|------|--------|
| Resultados de corridas | Google Sheets (via Supabase cache) |
| PR histórico | Google Sheets (planilhas por temporada) |
| Pilotos cadastrados | Supabase (tabela `pilotos`) |
| Punições/Vereditos | Supabase (tabela `notificacoes_admin`) |
| Objetivos | Supabase (tabela configurável) |

---

## Observações Importantes

1. **Todos os valores são arredondados para cima** (`Math.ceil`)
2. **Escalas mínimas são garantidas** - nenhum pilar fica abaixo do mínimo definido
3. **O cálculo é feito em tempo real** - sempre que a página Admin é carregada
4. **Dados são salvos no Supabase** - tabela `power_ranking_cache` para performance
5. **Cada grid (Carreira/Light) é calculado separadamente**
6. **Desconto por faltas (W.O.)** - Cada falta do piloto (ausência em etapa) desconta 1 ponto no número final do Power Ranking. Ex.: nota 95 com 2 faltas = PR final 93.

---

## Histórico de Alterações

| Data | Alteração |
|------|-----------|
| 29/01/2026 | Adicionada coluna CORRIDAS no pilar Histórico |
| 29/01/2026 | Ajustados pesos do Histórico: 40% História + 30% Temporadas + 30% Corridas |
| 03/02/2026 | Desconto de 1 ponto no PR final por cada falta (W.O.) do piloto; regra incluída no regulamento do site |

---

*Documento gerado em 29/01/2026*
