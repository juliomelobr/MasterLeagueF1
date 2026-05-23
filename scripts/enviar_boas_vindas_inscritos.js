/**
 * Envia mensagem de boas-vindas para todos os inscritos em season_registrations.
 *
 * Uso (PowerShell):
 *   node scripts/enviar_boas_vindas_inscritos.js
 *
 * Opções:
 *   DRY_RUN=1 node scripts/enviar_boas_vindas_inscritos.js
 *   TEMPORADA=21 node scripts/enviar_boas_vindas_inscritos.js
 *   LIMIT=10 node scripts/enviar_boas_vindas_inscritos.js
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://ueqfmjwdijaeawvxhdtp.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVlcWZtandkaWphZWF3dnhoZHRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1MjEzOTEsImV4cCI6MjA4MDA5NzM5MX0.b-y_prO5ffMuSOs7rUvrMru4SDN06BHqyMsbUIDDdJI';

const DRY_RUN = String(process.env.DRY_RUN || '').trim() === '1';
const TEMPORADA = process.env.TEMPORADA ? parseInt(String(process.env.TEMPORADA), 10) : null;
const LIMIT = process.env.LIMIT ? parseInt(String(process.env.LIMIT), 10) : null;

const ADMIN_WHATSAPP = '5551983433940';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function onlyDigits(s) {
  return String(s || '').replace(/\D/g, '');
}

function upper(s) {
  return String(s || '').trim().toUpperCase();
}

function buildMsgPiloto({ nome, temporada, grid, plataforma }) {
  const gridUpper = upper(grid);
  const plataformaUpper = upper(plataforma);
  return (
    `🏁 *BEM-VINDO À MASTER LEAGUE F1!*\n\n` +
    `Olá ${nome || 'Piloto'}!\n\n` +
    `✅ Recebemos sua inscrição${temporada ? ` para a *T${temporada}*` : ''}.\n\n` +
    `📌 *Grid:* ${gridUpper || '—'}\n` +
    `🎮 *Plataforma:* ${plataformaUpper || '—'}\n\n` +
    `Em breve o ADM vai analisar e atualizar o status da sua inscrição.\n\n` +
    `🏎️ Boa sorte e nos vemos na pista!`
  );
}

async function sendWhatsapp({ phone, email, nome, message }) {
  const whatsapp = onlyDigits(phone);
  const { data, error } = await supabase.functions.invoke('send-whatsapp-code', {
    body: {
      email: (email || `${whatsapp}@masterleaguef1.com`).toLowerCase().trim(),
      whatsapp,
      nomePiloto: nome || 'Piloto',
      tipo: 'notificacao_aprovacao', // reaproveita o caminho de notificação já existente
      skipPilotoCheck: true,
      mensagemCustomizada: message,
    },
  });
  return { data, error };
}

async function main() {
  console.log(`[INSCRICOES] DRY_RUN=${DRY_RUN} TEMPORADA=${TEMPORADA ?? 'todas'} LIMIT=${LIMIT ?? 'sem limite'}`);

  let query = supabase
    .from('season_registrations')
    .select('*')
    .is('boas_vindas_enviada_em', null)
    .order('data_inscricao', { ascending: false });
  if (TEMPORADA) query = query.eq('temporada', TEMPORADA);
  if (LIMIT) query = query.limit(LIMIT);

  const { data, error } = await query;
  if (error) throw error;

  const rows = data || [];
  console.log(`[INSCRICOES] Registros encontrados: ${rows.length}`);

  // Deduplicar por whatsapp (se houver múltiplas inscrições)
  const seen = new Set();
  const targets = [];
  for (const r of rows) {
    const w = onlyDigits(r.whatsapp);
    if (!w) continue;
    if (seen.has(w)) continue;
    seen.add(w);
    targets.push(r);
  }

  console.log(`[INSCRICOES] Destinatários únicos (por WhatsApp): ${targets.length}`);

  const failures = [];
  let okCount = 0;

  for (let i = 0; i < targets.length; i++) {
    const r = targets[i];
    const phone = onlyDigits(r.whatsapp);
    const msg = buildMsgPiloto({
      nome: r.nome,
      temporada: r.temporada,
      grid: r.grid,
      plataforma: r.plataforma,
    });

    console.log(`\n[${i + 1}/${targets.length}] Enviando para ${r.nome} (${phone}) grid=${r.grid} plataforma=${r.plataforma} T${r.temporada}`);

    if (DRY_RUN) {
      console.log(`[DRY_RUN] Mensagem:\n${msg}`);
      okCount++;
      continue;
    }

    const { error: sendErr, data: sendData } = await sendWhatsapp({
      phone,
      email: r.email_login,
      nome: r.nome,
      message: msg,
    });

    if (sendErr || sendData?.success === false) {
      const m = sendErr?.message || sendData?.error || 'Erro desconhecido';
      console.log(`[FALHA] ${m}`);
      failures.push({ id: r.id, nome: r.nome, whatsapp: phone, erro: m });
    } else {
      console.log(`[OK] enviado`);
      okCount++;
      // marcar no banco para não reenviar
      await supabase
        .from('season_registrations')
        .update({ boas_vindas_enviada_em: new Date().toISOString() })
        .eq('id', r.id);
    }

    // pequeno delay para evitar rate limit / flood
    await sleep(900);
  }

  console.log(`\n[RESUMO] OK=${okCount} FALHAS=${failures.length}`);

  // Enviar resumo ao ADM (1 mensagem, sem spammar)
  if (!DRY_RUN) {
    const resumo =
      `📊 *ENVIO BOAS-VINDAS INSCRIÇÕES*\n\n` +
      `Total destinatários: ${targets.length}\n` +
      `OK: ${okCount}\n` +
      `Falhas: ${failures.length}\n` +
      `${TEMPORADA ? `Temporada filtro: T${TEMPORADA}\n` : ''}` +
      `⏰ ${new Date().toLocaleString('pt-BR')}` +
      (failures.length ? `\n\n⚠️ Falhas (primeiras 5):\n` + failures.slice(0, 5).map(f => `- ${f.nome} (${f.whatsapp}): ${f.erro}`).join('\n') : '');

    try {
      const { error: adminErr } = await sendWhatsapp({
        phone: ADMIN_WHATSAPP,
        email: 'admin@masterleaguef1.com',
        nome: 'ADM Master League F1',
        message: resumo,
      });
      if (adminErr) console.log('[ADM] Falha ao enviar resumo:', adminErr.message);
      else console.log('[ADM] Resumo enviado');
    } catch (e) {
      console.log('[ADM] Erro ao enviar resumo:', e?.message || e);
    }
  }
}

main().catch((e) => {
  console.error('Erro:', e?.message || e);
  process.exitCode = 1;
});

