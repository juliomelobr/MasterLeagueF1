# Configuração da Tabela `power_ranking_conduta`

## ⚠️ IMPORTANTE

A tabela `power_ranking_conduta` **precisa ser criada no Supabase** para que o sistema de Power Ranking funcione corretamente.

## 📋 Passos para Criar a Tabela

1. **Acesse o Supabase Studio**
   - Vá para: https://supabase.com/dashboard/project/[SEU_PROJECT_ID]/editor

2. **Abra o SQL Editor**
   - No menu lateral, clique em "SQL Editor"

3. **Execute o Script SQL**
   - Copie TODO o conteúdo do arquivo `create_power_ranking_conduta.sql`
   - Cole no editor SQL
   - Clique em "Run" para executar

4. **Verifique a Criação**
   - Vá para a aba "Table Editor"
   - Você deverá ver a nova tabela `power_ranking_conduta`

## 🏗️ Estrutura da Tabela

A tabela armazena o checklist de conduta de cada piloto por etapa:

- **Flags de Infração** (por etapa):
  - `lista_presenca_respondida` - Piloto respondeu lista de presença
  - `telemetria_fechada` - Telemetria foi fechada fora do prazo
  - `numeracao_errada` - Numeração do carro incorreta
  - `defesa_nao_enviada` - Defesa não enviada quando necessária
  - `falta_wo` - Falta (W.O.) detectada automaticamente

- **Flag Especial** (por temporada):
  - `foto_oficial_enviada` - Piloto enviou foto oficial (apenas uma vez por temporada)

- **Metadados**:
  - `pontos_descontados` - Total de pontos descontados nesta etapa
  - `observacoes` - Notas dos Stewards
  - `steward_id` - ID do Steward que marcou (se manual)

## 🔐 Permissões (RLS)

A tabela já vem com Row Level Security configurado:

- **Stewards**: Podem ler e escrever tudo
- **Todos**: Podem ler (visualização pública)

## 🚀 Próximos Passos

Após criar a tabela:

1. O sistema irá parar de mostrar erros de "tabela não encontrada"
2. Os Stewards poderão começar a marcar infrações
3. O Pilar 02 (CONDUTA) do Power Ranking será calculado automaticamente

## 🐛 Solução de Problemas

Se após executar o script você ainda vê erros:

1. **Verifique no Supabase Studio** se a tabela realmente foi criada
2. **Refresh** a página do aplicativo (Ctrl + F5)
3. **Verifique as Policies RLS**:
   - Vá para: Table Editor > power_ranking_conduta > Policies
   - Deve haver 2 policies: `power_ranking_conduta_all` e `power_ranking_conduta_read`

Se o problema persistir, verifique:
- Se a coluna `is_steward` existe na tabela `pilotos`
- Se as foreign keys estão corretas (`piloto_id` referencia `pilotos(id)`)
