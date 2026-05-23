/**
 * Dispara notificações (WhatsApp via Edge Function send-whatsapp-code / Twilio)
 * para pilotos com ACUSAÇÃO aguardando defesa.
 *
 * Requisitos:
 * - Definir variáveis de ambiente:
 *   - SUPABASE_URL=https://<ref>.supabase.co
 *   - SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
 *
 * Uso (PowerShell):
 *   $env:SUPABASE_URL="https://ueqfmjwdijaeawvxhdtp.supabase.co"
 *   $env:SUPABASE_SERVICE_ROLE_KEY="SUA_SERVICE_ROLE_KEY_AQUI"
 *
 *   node scripts/notificar_defesas_pendentes.js --dry-run
 *   node scripts/notificar_defesas_pendentes.js --send
 *
 * Flags:
 *   --dry-run   (padrão) não envia, só lista
 *   --send      envia de verdade
 *   --limit=10  limita quantidade
 */

import { createClient } from '@supabase/supabase-js';

const SITE_URL = 'https://masterleaguef1.com.br';

function getArg(name) {
  const prefix = `--${name}=`;
  const found = process.argv.find(a => a.startsWith(prefix));
  return found ? found.slice(prefix.length) : null;
}

function hasFlag(flag) {
  return process.argv.includes(`--${flag}`);
}

function normalizePhone(phone) {
  return phone ? String(phone).replace(/\D/g, '') : '';
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const send = hasFlag('send');
  const dryRun = hasFlag('dry-run') || !send;
  const limit = parseInt(getArg('limit') || '0', 10) || null;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Faltam variáveis de ambiente.');
    console.error('   Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY e rode novamente.');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  console.log('🔎 Buscando acusações com defesa pendente (aguardando_defesa)...');

  const { data, error } = await supabase
    .from('notificacoes_admin')
    .select('id, dados, created_at')
    .eq('tipo', 'nova_acusacao')
    .eq('dados->>status', 'aguardando_defesa')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('❌ Erro ao buscar notificacoes_admin:', error.message || error);
    process.exit(1);
  }

  const pendentes = (data || []).filter(row => {
    const d = row.dados || {};
    // Filtrar apenas acusações que:
    // 1. Ainda não têm defesa enviada
    // 2. Ainda não tiveram notificação enviada (para evitar duplicatas)
    return !d.defesa && !d.notificacaoEnviada;
  });

  const alvo = limit ? pendentes.slice(0, limit) : pendentes;

  console.log(`📋 Encontradas: ${pendentes.length} pendente(s).`);
  if (limit) console.log(`➡️  Limitando para: ${alvo.length}.`);
  console.log(`🧪 Modo: ${dryRun ? 'DRY-RUN (não envia)' : 'ENVIO REAL'}`);

  let enviados = 0;
  let puladosSemWhats = 0;
  let falhas = 0;

  for (const row of alvo) {
    const d = row.dados || {};
    const codigo = d.codigoLance || d.codigo || 'N/A';
    const etapa = d.etapa?.circuit
      ? `${d.etapa.round} - ${d.etapa.circuit}`
      : `${d.etapa?.round || '-'}`;
    const acusadoNome = d.acusado?.nome || 'Piloto';
    const acusadoWhats = normalizePhone(d.acusado?.whatsapp);

    if (!acusadoWhats) {
      puladosSemWhats++;
      console.log(`⚠️  [PULAR] ${codigo} — acusado sem WhatsApp cadastrado (${acusadoNome})`);
      continue;
    }

    const motorhomeUrl = `${SITE_URL}/dashboard`;
    // Usar a mesma mensagem que o sistema usa em notifyAccusedDefenseRequest
    const msg = `*MENSAGEM AUTOMÁTICA*\n\n` +
      `🛡️ *VOCÊ FOI ACUSADO - MASTER LEAGUE F1*\n\n` +
      `🔖 *Código:* ${codigo}\n` +
      `👤 *Acusador:* ${d.acusador?.nome || '-'}\n` +
      `🏁 *Etapa:* ${etapa}\n\n` +
      `📝 *Descrição:*\n${d.descricao || '-'}\n\n` +
      `🎥 *Vídeo do lance:*\n${d.videoLink || '-'}\n\n` +
      `⏰ *Prazo:* até *12:00h do dia seguinte*.\n` +
      `✅ Envie o *vídeo de defesa* pelo *link verde do Motorhome*.\n\n` +
      `🔗 Motorhome: ${motorhomeUrl}`;

    console.log(`📨 ${dryRun ? '[DRY]' : '[SEND]'} ${codigo} -> ${acusadoNome} (${acusadoWhats})`);

    if (dryRun) continue;

    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke('send-whatsapp-code', {
        body: {
          email: `${acusadoWhats}@masterleaguef1.com`,
          whatsapp: acusadoWhats,
          nomePiloto: acusadoNome,
          tipo: 'notificacao_aprovacao',
          skipPilotoCheck: true,
          mensagemCustomizada: msg,
        },
      });

      if (fnError || fnData?.success === false) {
        falhas++;
        console.log(`   ❌ Falha: ${fnError?.message || fnData?.error || 'erro desconhecido'}`);
      } else {
        enviados++;
        console.log('   ✅ Enviado');
        
        // Marcar que a notificação foi enviada para evitar duplicatas
        try {
          const dadosAtualizados = {
            ...d,
            notificacaoEnviada: true,
            notificacaoEnviadaEm: new Date().toISOString()
          };
          
          const { error: updateError } = await supabase
            .from('notificacoes_admin')
            .update({ dados: dadosAtualizados })
            .eq('id', row.id);
          
          if (updateError) {
            console.log(`   ⚠️  Aviso: Não foi possível marcar notificação como enviada: ${updateError.message}`);
          } else {
            console.log('   ✅ Notificação marcada como enviada no banco');
          }
        } catch (updateErr) {
          console.log(`   ⚠️  Aviso: Erro ao marcar notificação: ${updateErr.message}`);
        }
      }
    } catch (e) {
      falhas++;
      console.log(`   ❌ Exceção: ${e?.message || String(e)}`);
    }

    // Delay para não estourar limites do provedor
    await sleep(900);
  }

  console.log('—'.repeat(60));
  console.log(`✅ Enviados: ${enviados}`);
  console.log(`⚠️  Pulados (sem WhatsApp): ${puladosSemWhats}`);
  console.log(`❌ Falhas: ${falhas}`);

  if (dryRun) {
    console.log('\nPara ENVIAR de verdade, rode:');
    console.log('  node scripts/notificar_defesas_pendentes.js --send');
  }
}

main().catch((e) => {
  console.error('❌ Erro fatal:', e);
  process.exit(1);
});

