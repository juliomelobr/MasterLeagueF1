/**
 * Gerar SQL para corrigir status de lances com defesa
 * Execute no SQL Editor do Supabase
 */

console.log('🔧 SQL PARA CORREÇÃO DE STATUS DE LANCES COM DEFESA');
console.log('═'.repeat(80));
console.log('');

console.log('📋 PASSO 1: Verificar quantos registros precisam correção');
console.log('');
console.log(`SELECT COUNT(*) as registros_para_corrigir`);
console.log(`FROM notificacoes_admin`);
console.log(`WHERE tipo = 'nova_acusacao'`);
console.log(`  AND (dados ->> 'defesa') IS NOT NULL`);
console.log(`  AND (dados ->> 'status') != 'aguardando_analise';`);
console.log('');

console.log('📋 PASSO 2: Ver detalhes dos registros a corrigir');
console.log('');
console.log(`SELECT`);
console.log(`    id,`);
console.log(`    dados->>'codigoLance' as codigo,`);
console.log(`    dados->'acusado'->>'nome' as acusado,`);
console.log(`    dados->>'status' as status_atual,`);
console.log(`    dados->'defesa'->>'dataEnvioDefesa' as data_defesa`);
console.log(`FROM notificacoes_admin`);
console.log(`WHERE tipo = 'nova_acusacao'`);
console.log(`  AND (dados ->> 'defesa') IS NOT NULL`);
console.log(`  AND (dados ->> 'status') != 'aguardando_analise'`);
console.log(`ORDER BY created_at DESC;`);
console.log('');

console.log('🚨 PASSO 3: EXECUTAR CORREÇÃO (descomente e execute)');
console.log('');
console.log(`-- UPDATE notificacoes_admin`);
console.log(`-- SET dados = jsonb_set(dados, '{status}', '"aguardando_analise"'),`);
console.log(`--     lido = false`);
console.log(`-- WHERE tipo = 'nova_acusacao'`);
console.log(`--   AND (dados ->> 'defesa') IS NOT NULL`);
console.log(`--   AND (dados ->> 'status') != 'aguardando_analise';`);
console.log('');

console.log('✅ PASSO 4: Verificar se correção foi aplicada');
console.log('');
console.log(`SELECT COUNT(*) as total_corrigidos`);
console.log(`FROM notificacoes_admin`);
console.log(`WHERE tipo = 'nova_acusacao'`);
console.log(`  AND (dados ->> 'defesa') IS NOT NULL`);
console.log(`  AND (dados ->> 'status') = 'aguardando_analise';`);
console.log('');

console.log('═'.repeat(80));
console.log('📖 INSTRUÇÕES:');
console.log('1. Copie e execute o PASSO 1 no SQL Editor do Supabase');
console.log('2. Execute o PASSO 2 para ver detalhes');
console.log('3. Se estiver correto, execute o PASSO 3 (remova os --)');
console.log('4. Execute o PASSO 4 para confirmar');
console.log('═'.repeat(80));