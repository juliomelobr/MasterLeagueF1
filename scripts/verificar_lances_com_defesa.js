/**
 * Verificar lances que têm defesa mas status incorreto
 *
 * Execute com:
 * node scripts/verificar_lances_com_defesa.js
 */

import { createClient } from '@supabase/supabase-js';

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

  console.log('🔍 Verificando lances com defesa mas status incorreto...\n');

  try {
    // Buscar registros que têm defesa mas status errado
    const { data: registros, error } = await supabase
      .from('notificacoes_admin')
      .select('id, dados, created_at')
      .eq('tipo', 'nova_acusacao');

    if (error) {
      throw error;
    }

    // Filtrar registros que têm defesa mas status errado
    const registrosComDefesaStatusErrado = (registros || []).filter(registro => {
      const dados = registro.dados || {};
      const temDefesa = dados.defesa != null;
      const statusAtual = dados.status;
      return temDefesa && statusAtual !== 'aguardando_analise';
    });

    console.log(`📊 Total de registros de acusação: ${registros?.length || 0}`);
    console.log(`🎯 Registros com defesa mas status incorreto: ${registrosComDefesaStatusErrado.length}\n`);

    if (registrosComDefesaStatusErrado.length === 0) {
      console.log('✅ Nenhum registro precisa de correção!');
      return;
    }

    console.log('📋 DETALHES DOS REGISTROS QUE PRECISAM DE CORREÇÃO:');
    console.log('═'.repeat(80));

    registrosComDefesaStatusErrado.forEach((registro, index) => {
      const dados = registro.dados || {};
      const defesa = dados.defesa || {};
      const acusado = dados.acusado || {};
      const acusador = dados.acusador || {};

      console.log(`${index + 1}. 📄 REGISTRO ID: ${registro.id}`);
      console.log(`   🔖 Código: ${dados.codigoLance || 'N/A'}`);
      console.log(`   👤 Acusado: ${acusado.nome || 'N/A'} (${acusado.email || 'N/A'})`);
      console.log(`   ⚖️  Acusador: ${acusador.nome || 'N/A'}`);
      console.log(`   📅 Criado em: ${new Date(registro.created_at).toLocaleString('pt-BR')}`);
      console.log(`   🛡️  Defesa enviada em: ${defesa.dataEnvioDefesa ? new Date(defesa.dataEnvioDefesa).toLocaleString('pt-BR') : 'N/A'}`);
      console.log(`   ❌ Status atual: ${dados.status}`);
      console.log(`   ✅ Status correto: aguardando_analise`);
      console.log('   ─'.repeat(50));
    });

    console.log('\n🚨 CORREÇÃO NECESSÁRIA!');
    console.log('Para corrigir esses registros, execute o seguinte SQL no Supabase:');
    console.log('\n' + '═'.repeat(80));
    console.log('UPDATE notificacoes_admin');
    console.log('SET dados = jsonb_set(dados, \'{status}\', \'"aguardando_analise"\'),');
    console.log('    lido = false');
    console.log('WHERE tipo = \'nova_acusacao\'');
    console.log('  AND (dados ->> \'defesa\') IS NOT NULL');
    console.log('  AND (dados ->> \'status\') != \'aguardando_analise\';');
    console.log('═'.repeat(80));

  } catch (err) {
    console.error('❌ Erro:', err.message);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('❌ Erro fatal:', e);
  process.exit(1);
});