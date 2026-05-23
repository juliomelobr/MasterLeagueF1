/**
 * Corrigir status de lances que já têm defesa mas estão com status errado
 *
 * Execute com:
 * node scripts/corrigir_status_lances_com_defesa.js
 *
 * Requisitos:
 * - SUPABASE_URL=https://<ref>.supabase.co
 * - SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
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

  console.log('🔍 Buscando lances com defesa mas status incorreto...');

  try {
    // Buscar todos os registros de nova_acusacao
    const { data: registros, error: buscaError } = await supabase
      .from('notificacoes_admin')
      .select('id, dados, created_at')
      .eq('tipo', 'nova_acusacao');

    if (buscaError) {
      throw buscaError;
    }

    console.log(`📊 Encontrados ${registros?.length || 0} registros de acusação.`);

    // Filtrar registros que têm defesa mas status errado
    const registrosParaCorrigir = (registros || []).filter(registro => {
      const dados = registro.dados || {};

      // Tem defesa?
      const temDefesa = dados.defesa != null;

      // Status atual
      const statusAtual = dados.status;

      // Deve estar aguardando_analise se tem defesa
      const statusCorreto = temDefesa ? 'aguardando_analise' : 'aguardando_defesa';

      return temDefesa && statusAtual !== statusCorreto;
    });

    console.log(`🎯 Encontrados ${registrosParaCorrigir.length} registros para corrigir.`);

    if (registrosParaCorrigir.length === 0) {
      console.log('✅ Nenhum registro precisa de correção.');
      return;
    }

    // Mostrar detalhes dos registros a corrigir
    console.log('\n📋 Registros a corrigir:');
    registrosParaCorrigir.forEach((registro, index) => {
      const dados = registro.dados || {};
      const defesa = dados.defesa || {};
      console.log(`${index + 1}. ID: ${registro.id}`);
      console.log(`   Código: ${dados.codigoLance || 'N/A'}`);
      console.log(`   Acusado: ${dados.acusado?.nome || 'N/A'}`);
      console.log(`   Status atual: ${dados.status}`);
      console.log(`   Status correto: aguardando_analise`);
      console.log(`   Data defesa: ${defesa.dataEnvioDefesa || 'N/A'}`);
      console.log('');
    });

    // Perguntar se quer prosseguir (simulado)
    console.log('⚠️  ATENÇÃO: Esta operação irá atualizar o status dos registros acima.');
    console.log('   Pressione Enter para continuar ou Ctrl+C para cancelar...');

    // Em Node.js, podemos usar process.stdin para aguardar input
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', async () => {
      process.stdin.setRawMode(false);
      process.stdin.pause();

      console.log('\n🔧 Iniciando correção...');

      let corrigidos = 0;
      let erros = 0;

      for (const registro of registrosParaCorrigir) {
        try {
          const dadosAtualizados = {
            ...registro.dados,
            status: 'aguardando_analise'
          };

          const { error: updateError } = await supabase
            .from('notificacoes_admin')
            .update({
              dados: dadosAtualizados,
              lido: false, // Resetar flag de lido para aparecer como novo
            })
            .eq('id', registro.id);

          if (updateError) {
            console.log(`❌ Erro ao corrigir ID ${registro.id}:`, updateError.message);
            erros++;
          } else {
            console.log(`✅ Corrigido: ${registro.dados?.codigoLance || registro.id}`);
            corrigidos++;
          }
        } catch (err) {
          console.log(`❌ Exceção ao corrigir ID ${registro.id}:`, err.message);
          erros++;
        }

        // Pequena pausa para não sobrecarregar
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      console.log('\n—'.repeat(50));
      console.log(`✅ Corrigidos: ${corrigidos}`);
      console.log(`❌ Erros: ${erros}`);
      console.log('\n🎯 Agora os lances com defesa devem aparecer no Painel de Veredicto!');

      process.exit(0);
    });

  } catch (err) {
    console.error('❌ Erro:', err.message);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('❌ Erro fatal:', e);
  process.exit(1);
});