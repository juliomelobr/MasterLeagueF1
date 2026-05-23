/**
 * Script para corrigir o link do vídeo do lance STW-L2008
 * O vídeo é um YouTube Clip e precisa estar no formato correto
 * 
 * Execute:
 *   $env:SUPABASE_URL="https://ueqfmjwdijaeawvxhdtp.supabase.co"
 *   $env:SUPABASE_SERVICE_ROLE_KEY="SUA_SERVICE_ROLE_KEY"
 *   node scripts/corrigir_video_stw_l2008.js
 */

import { createClient } from '@supabase/supabase-js';

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

const CODIGO_LANCE = 'STW-L2008';
const VIDEO_LINK_CORRETO = 'https://www.youtube.com/clip/Ugkx6fAvrNFmlE6A0YzBoak5SwE8AgtdBD6m';

async function main() {
  console.log(`🔍 Buscando lance ${CODIGO_LANCE}...`);

  // 1. Buscar o registro
  const { data: registros, error: buscaError } = await supabase
    .from('notificacoes_admin')
    .select('id, dados')
    .eq('tipo', 'nova_acusacao')
    .eq('dados->>codigoLance', CODIGO_LANCE)
    .order('created_at', { ascending: false })
    .limit(1);

  if (buscaError) {
    console.error('❌ Erro ao buscar:', buscaError.message);
    process.exit(1);
  }

  if (!registros || registros.length === 0) {
    console.error(`❌ Lance ${CODIGO_LANCE} não encontrado!`);
    process.exit(1);
  }

  const registro = registros[0];
  const dados = registro.dados || {};
  const videoLinkAtual = dados.videoLink || '';

  console.log(`📋 Lance encontrado: ${CODIGO_LANCE}`);
  console.log(`   VideoLink atual: ${videoLinkAtual || '(vazio)'}`);

  // 2. Verificar se precisa atualizar
  if (videoLinkAtual === VIDEO_LINK_CORRETO) {
    console.log('✅ O link já está correto!');
    return;
  }

  // 3. Atualizar
  console.log(`🔄 Atualizando videoLink...`);
  
  const dadosAtualizados = {
    ...dados,
    videoLink: VIDEO_LINK_CORRETO,
  };

  const { data: updateData, error: updateError } = await supabase
    .from('notificacoes_admin')
    .update({ dados: dadosAtualizados })
    .eq('id', registro.id)
    .select();

  if (updateError) {
    console.error('❌ Erro ao atualizar:', updateError.message);
    process.exit(1);
  }

  console.log('✅✅✅ Link atualizado com sucesso!');
  console.log(`   Novo videoLink: ${VIDEO_LINK_CORRETO}`);
  console.log('');
  console.log('📝 O vídeo agora será exibido como YouTube Clip no site.');
}

main().catch((e) => {
  console.error('❌ Erro fatal:', e);
  process.exit(1);
});
