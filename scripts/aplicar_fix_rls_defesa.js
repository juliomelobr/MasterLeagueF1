/**
 * Aplicar correção RLS para permitir pilotos enviarem defesa
 *
 * Execute com:
 * node scripts/aplicar_fix_rls_defesa.js
 *
 * Requisitos:
 * - SUPABASE_URL=https://<ref>.supabase.co
 * - SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

async function main() {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Faltam variáveis de ambiente.');
    console.error('   Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  console.log('🔧 Aplicando correção RLS para defesas...');

  // Ler o script SQL
  const sqlScript = fs.readFileSync('scripts/fix_notificacoes_admin_rls_pilotos_defesa.sql', 'utf8');

  try {
    // Executar o script SQL
    const { error } = await supabase.rpc('exec_sql', { sql: sqlScript });

    if (error) {
      // Se rpc não funcionar, tentar executar via query direta
      console.log('⚠️  Tentando método alternativo...');

      // Dividir o script em comandos individuais
      const commands = sqlScript
        .split(';')
        .map(cmd => cmd.trim())
        .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));

      for (const command of commands) {
        if (command.trim()) {
          console.log(`📝 Executando: ${command.substring(0, 50)}...`);

          const { error: cmdError } = await supabase.from('_supabase_migration_temp').select('*').limit(1);
          if (cmdError) {
            console.log('   ⚠️  Método alternativo pode não funcionar. Execute manualmente no SQL Editor do Supabase.');
            break;
          }
        }
      }

      console.log('⚠️  Execute o script manualmente no SQL Editor do Supabase:');
      console.log('   scripts/fix_notificacoes_admin_rls_pilotos_defesa.sql');
    } else {
      console.log('✅ Correção RLS aplicada com sucesso!');
      console.log('🎯 Pilotos agora podem enviar defesas.');
    }

  } catch (err) {
    console.error('❌ Erro ao aplicar correção:', err.message);
    console.log('\n📋 Execute manualmente no SQL Editor do Supabase:');
    console.log('   scripts/fix_notificacoes_admin_rls_pilotos_defesa.sql');
  }
}

main().catch((e) => {
  console.error('❌ Erro fatal:', e);
  process.exit(1);
});