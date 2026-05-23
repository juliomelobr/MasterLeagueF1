# Checklist — Ciclo de temporada (MLF1)

Execute após publicar o frontend e rodar `scripts/create_season_lifecycle.sql` no Supabase.

## Pré-requisitos

- [ ] SQL aplicado (`app_config` com `current_season`, `season_phase`, `last_closed_season`, `phase_updated_at`)
- [ ] Tabela `season_lifecycle_events` criada e políticas válidas
- [ ] Valores iniciais coerentes (ex.: T20 aberta → `current_season=20`, `season_phase=OPEN`, `last_closed_season=19`)

## Fluxo recomendado

1. **Fechar temporada** (só com fase OPEN)  
   - [ ] Power Ranking ADM bloqueia edição/publicação para essa temporada  
   - [ ] `last_closed_season` = temporada fechada  

2. **Pré-temporada**  
   - [ ] Motorhome: faixa “Pré-temporada”; sem equipe da planilha até contrato  
   - [ ] Propostas/contratos usam `proposalsDraftSeason` (próxima temporada)  
   - [ ] PR no motorhome usa `motorhomePowerRankingSeason` (última encerrada)  

3. **Mudar temporada** (só após pré)  
   - [ ] `current_season` incrementa (`last_closed + 1`)  
   - [ ] Fase volta a `OPEN`  
   - [ ] `inscricao_temporada_atual` alinhada no `app_config`  

4. **Abrir temporada (atalho)**  
   - [ ] Mesmo efeito de virada sem passar pela pré — uso excepcional documentado  

## Regressão rápida

- [ ] Hall da Fama: muro / campeão não “antecipa” título da temporada nova antes do fechamento  
- [ ] Histórico PR: temporada padrão favorece `last_closed_season` quando existir nos dados  
- [ ] ADM → aba **TEMPORADA**: transições gravam auditoria (`season_lifecycle_events`)

## Observações

- O painel ADM usa o cliente Supabase como `anon`; políticas RLS são intencionalmente permissivas para `app_config` — avalie endurecer em produção (Edge Function / service role).
