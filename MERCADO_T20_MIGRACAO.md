# 🔄 Migração: Mercado de Pilotos T20

## ⚠️ IMPORTANTE: Mudanças Implementadas

O sistema de mercado foi **completamente reescrito** para seguir as regras da Temporada 20. O sistema anterior (venda/compra) foi substituído por um sistema de **manifestação de interesse** com matchmaking automático.

## 📋 Passos para Migração

### 1. Backup do Banco de Dados
```sql
-- Fazer backup das tabelas antigas (se existirem)
-- As tabelas antigas serão substituídas pelas novas
```

### 2. Executar Novo Schema SQL
Execute o arquivo `supabase-schema-mercado-t20.sql` no SQL Editor do Supabase:

1. Acesse o painel do Supabase
2. Vá para **SQL Editor**
3. Cole o conteúdo completo de `supabase-schema-mercado-t20.sql`
4. Clique em **Run**

Este script irá:
- ✅ Criar tabela `equipes` com as 10 equipes (GOLD, SILVER, BRONZE)
- ✅ Adicionar coluna `draft_priority` na tabela `pilotos`
- ✅ Criar tabela `interests` (manifestações de interesse)
- ✅ Criar tabela `contracts` (contratos assinados)
- ✅ Criar trigger de matchmaking automático
- ✅ Configurar políticas RLS

### 3. Popular draft_priority dos Pilotos

**IMPORTANTE**: A prioridade de draft T20 é **INVERSA** ao Power Ranking T19:
- Prioridade 1 = Maior prioridade (escolhe primeiro)
- Prioridade 20 = Menor prioridade (campeão escolhe por último)

Você precisa atualizar a coluna `draft_priority` na tabela `pilotos` baseado no Power Ranking da Temporada 19.

Exemplo de script (ajuste conforme seus dados):
```sql
-- Exemplo: Atualizar draft_priority baseado no Power Ranking T19
-- Substitua os nomes e prioridades pelos valores reais

UPDATE pilotos SET draft_priority = 1 WHERE nome = 'Leandro Sopeña';
UPDATE pilotos SET draft_priority = 2 WHERE nome = 'Edvan Paiva';
-- ... continue para todos os pilotos
UPDATE pilotos SET draft_priority = 20 WHERE nome = 'Lucas Raiol'; -- Campeão (último a escolher)
```

### 4. Verificar Dados das Equipes
As 10 equipes já são inseridas automaticamente pelo script SQL:
- **GOLD**: Ferrari, Red Bull Racing, McLaren
- **SILVER**: Mercedes-AMG, Aston Martin, Alpine
- **BRONZE**: Racing Bulls, Williams, Haas, Sauber

## 🔄 Diferenças entre Sistema Antigo e Novo

### Sistema Antigo (Removido)
- ❌ Tabela `mercado_pilotos` (venda/compra)
- ❌ Tabela `propostas_mercado` (propostas monetárias)
- ❌ Tabela `historico_transferencias` (com valores)
- ❌ Interface de "fazer proposta" com valores

### Sistema Novo (T20)
- ✅ Tabela `equipes` (10 equipes com tiers)
- ✅ Tabela `interests` (manifestações de interesse)
- ✅ Tabela `contracts` (contratos assinados)
- ✅ Matchmaking automático baseado em `draft_priority`
- ✅ Timer de 24h para assinar contrato
- ✅ Validação de tier gate (Top 10 para GOLD)
- ✅ Limite de 3 interesses simultâneos

## 🎯 Funcionalidades do Novo Sistema

### Para Pilotos
1. **Manifestar Interesse**: Até 3 equipes simultaneamente
2. **Receber Proposta**: Sistema envia automaticamente baseado em prioridade
3. **Assinar Contrato**: 24h para assinar após receber proposta
4. **Visualizar Status**: Ver todas as equipes e vagas disponíveis

### Para o Sistema (Automático)
1. **Matchmaking**: Prioriza pilotos com menor `draft_priority`
2. **Expiração**: Propostas expiradas passam para o próximo da fila
3. **Validações**: Bloqueia aplicações inválidas (tier gate, limite de 3)

## 📝 Notas Importantes

1. **draft_priority é obrigatório**: Pilotos sem `draft_priority` não podem participar
2. **Tier Gate**: Apenas Top 10 (prioridade 1-10) pode aplicar para GOLD
3. **Timer de 24h**: Propostas expiram automaticamente após 24 horas
4. **Matchmaking em tempo real**: Trigger do banco processa automaticamente

## 🐛 Troubleshooting

### Erro: "Piloto não encontrado"
- Verifique se o email da sessão corresponde a um piloto na tabela `pilotos`
- Confirme que o piloto tem `draft_priority` preenchido

### Erro: "Tier Gate bloqueado"
- Pilotos com `draft_priority > 10` não podem aplicar para equipes GOLD
- Isso é uma regra de negócio da T20

### Matchmaking não funciona
- Verifique se o trigger `trigger_matchmaking` foi criado
- Confirme que a função `process_matchmaking()` existe
- Verifique os logs do Supabase

## ✅ Checklist de Migração

- [ ] Backup do banco de dados feito
- [ ] Script `supabase-schema-mercado-t20.sql` executado
- [ ] Coluna `draft_priority` populada para todos os pilotos
- [ ] Equipes inseridas corretamente (10 equipes)
- [ ] Trigger de matchmaking funcionando
- [ ] Teste de manifestação de interesse
- [ ] Teste de matchmaking automático
- [ ] Teste de assinatura de contrato
- [ ] Validações de tier gate funcionando

## 🎉 Conclusão

Após a migração, o sistema estará pronto para a Temporada 20 com todas as regras implementadas. O matchmaking é automático e baseado na prioridade de draft inversa ao Power Ranking T19.

🏁 *Boa sorte na Silly Season!* 🏁








