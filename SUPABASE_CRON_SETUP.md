# Configuração de Cron Jobs no Supabase

Este documento explica como configurar os cron jobs para sincronização automática das planilhas do Google Sheets.

## Opção 1: Usando pg_cron (Recomendado)

O Supabase usa PostgreSQL com extensão `pg_cron`. Você pode configurar os cron jobs diretamente no SQL Editor.

### Passo 1: Habilitar pg_cron

Execute no SQL Editor do Supabase:

```sql
-- Verificar se pg_cron está habilitado
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- Se não estiver, habilitar (pode requerer permissões de superuser)
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

### Passo 2: Criar Função Helper para Chamar Edge Function

```sql
-- Função para chamar Edge Function via HTTP
CREATE OR REPLACE FUNCTION call_sync_function(sheet_type TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    response_status INT;
    response_body TEXT;
BEGIN
    -- Chamar Edge Function
    SELECT status, content INTO response_status, response_body
    FROM http((
        'POST',
        'https://ueqfmjwdijaeawvxhdtp.supabase.co/functions/v1/sync-google-sheets',
        ARRAY[
            http_header('Content-Type', 'application/json'),
            http_header('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true))
        ],
        'application/json',
        json_build_object('sheetType', sheet_type, 'force', false)::text
    )::http_request);
    
    -- Log do resultado
    RAISE NOTICE 'Sync %: Status %, Response %', sheet_type, response_status, response_body;
END;
$$;
```

**Nota:** Você precisará habilitar a extensão `http` do Supabase também.

### Passo 3: Configurar Cron Jobs

```sql
-- Sincronizar classificação a cada 5 minutos
SELECT cron.schedule(
    'sync-classificacao',
    '*/5 * * * *', -- A cada 5 minutos
    $$SELECT call_sync_function('classificacao')$$
);

-- Sincronizar Power Ranking a cada 15 minutos
SELECT cron.schedule(
    'sync-power-ranking',
    '*/15 * * * *', -- A cada 15 minutos
    $$SELECT call_sync_function('power_ranking')$$
);

-- Sincronizar calendário a cada 1 hora
SELECT cron.schedule(
    'sync-calendario',
    '0 * * * *', -- A cada hora
    $$SELECT call_sync_function('calendario')$$
);

-- Sincronizar tracks a cada 2 horas
SELECT cron.schedule(
    'sync-tracks',
    '0 */2 * * *', -- A cada 2 horas
    $$SELECT call_sync_function('tracks')$$
);

-- Sincronizar Minicup a cada 10 minutos
SELECT cron.schedule(
    'sync-minicup',
    '*/10 * * * *', -- A cada 10 minutos
    $$SELECT call_sync_function('minicup')$$
);
```

## Opção 2: Usando Serviço Externo (GitHub Actions, Vercel Cron, etc.)

Se `pg_cron` não estiver disponível, você pode usar um serviço externo para chamar a Edge Function periodicamente.

### Exemplo com GitHub Actions

Crie `.github/workflows/sync-sheets.yml`:

```yaml
name: Sync Google Sheets

on:
  schedule:
    - cron: '*/5 * * * *' # A cada 5 minutos
  workflow_dispatch: # Permitir execução manual

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Sync Classificacao
        run: |
          curl -X POST \
            https://ueqfmjwdijaeawvxhdtp.supabase.co/functions/v1/sync-google-sheets \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}" \
            -d '{"sheetType": "classificacao", "force": false}'
      
      - name: Sync Power Ranking
        run: |
          curl -X POST \
            https://ueqfmjwdijaeawvxhdtp.supabase.co/functions/v1/sync-google-sheets \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}" \
            -d '{"sheetType": "power_ranking", "force": false}'
```

## Opção 3: Usar o Scheduler Edge Function

A Edge Function `sync-scheduler` pode ser chamada periodicamente por um serviço externo:

```bash
# Exemplo de chamada
curl -X POST \
  https://ueqfmjwdijaeawvxhdtp.supabase.co/functions/v1/sync-scheduler \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -d '{}'
```

## Verificar Cron Jobs

Para ver os cron jobs agendados:

```sql
SELECT * FROM cron.job;
```

Para ver o histórico de execuções:

```sql
SELECT * FROM cron.job_run_details 
ORDER BY start_time DESC 
LIMIT 20;
```

## Remover Cron Jobs

```sql
-- Remover um job específico
SELECT cron.unschedule('sync-classificacao');

-- Remover todos os jobs
SELECT cron.unschedule(jobid) FROM cron.job;
```

## Notas Importantes

1. **Service Role Key**: As Edge Functions precisam da `SUPABASE_SERVICE_ROLE_KEY` para acessar o banco de dados. Configure isso nas variáveis de ambiente do Supabase.

2. **Rate Limiting**: Google Sheets tem limites de requisições. Não configure intervalos muito curtos (< 1 minuto).

3. **Monitoramento**: Use a tabela `sync_log` para monitorar o sucesso das sincronizações.

4. **Falhas**: Se uma sincronização falhar, ela será registrada em `sync_log` com `status = 'error'`. Configure alertas se necessário.










































