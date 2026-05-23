import { supabase } from '../supabaseClient';
import { sendWhatsappNotification, ADMIN_WHATSAPP } from './whatsappNotify';

// Configurações do Admin
export const ADMIN_CONFIG = {
    whatsapp: ADMIN_WHATSAPP || '5551983433940', // WhatsApp do admin (formato: 55 + DDD + número)
    email: 'admin@masterleague-f1.com', // Email do admin (alterar para o real)
    telegramChatId: '5176212626', // Chat ID do Telegram do admin
};

const SITE_URL = 'https://masterleaguef1.com.br';

// Bot do Telegram da Master League F1
const TELEGRAM_BOT_TOKEN = '8564635113:AAGjr7wnmepztm3CwmZoSw5RmC8BO1pNG04';

// CallMeBot WhatsApp API - Lista de destinatários (backup)
const WHATSAPP_RECIPIENTS = [
    { phone: '5551983433940', apikey: '6022419', nome: 'Admin' },
    { phone: '5511940133084', apikey: '3666307', nome: 'Edvan Paiva' },
];

const formatEtapaLabel = (etapa) => {
    if (!etapa) return 'N/A';
    if (etapa.circuit) {
        return `${etapa.round ?? ''} - ${etapa.circuit}`.trim().replace(/^- /, '');
    }
    return etapa.round || etapa.circuit || 'N/A';
};

const buildJuradoMessage = (dados) => {
    const codigoLance = dados?.codigoLance || dados?.codigo || 'N/A';
    const acusador = dados?.acusador?.nome || dados?.acusador?.gamertag || 'N/A';
    const acusado =
        dados?.defesa?.defensor?.nome ||
        dados?.acusado?.nome ||
        dados?.acusado?.gamertag ||
        'N/A';
    const etapa = formatEtapaLabel(dados?.etapa);
    const grid =
        (dados?.grid || dados?.acusador?.grid || dados?.acusado?.grid || '')
            .toString()
            .toUpperCase() || 'N/A';

    return `👨‍⚖️ *NOVO LANCE PARA ANÁLISE - MASTER LEAGUE F1*\n\n` +
        `🔖 *Código:* ${codigoLance}\n` +
        `🏁 *Etapa:* ${etapa}\n` +
        `🏎️ *Grid:* ${grid}\n` +
        `👤 *Acusador:* ${acusador}\n` +
        `🎯 *Acusado:* ${acusado}\n\n` +
        `📋 *Acesse o Painel do Júri para analisar:*\n` +
        `🔗 ${SITE_URL}/veredito\n\n` +
        `⏰ ${new Date().toLocaleString('pt-BR')}`;
};

const updateNotificacaoDados = async (notifId, dadosAtualizados) => {
    if (!notifId || !dadosAtualizados) return;
    await supabase
        .from('notificacoes_admin')
        .update({ dados: dadosAtualizados })
        .eq('id', notifId);
};

const markJuradoNotificationPending = async (notifId, dados, motivo = 'fora_horario') => {
    if (!notifId || !dados) return;
    const dadosAtualizados = {
        ...dados,
        juradosNotificacaoPendente: true,
        juradosNotificacaoPendenteDesde: new Date().toISOString(),
        juradosNotificacaoPendenteMotivo: motivo,
        juradosNotificacaoEmProcesso: false,
        juradosNotificacaoProcessoEm: null,
    };
    await updateNotificacaoDados(notifId, dadosAtualizados);
};

const markJuradoNotificationSent = async (notifId, dados, success) => {
    if (!notifId || !dados || !success) return;
    const dadosAtualizados = {
        ...dados,
        juradosNotificacaoPendente: false,
        juradosNotificacaoEnviadaEm: new Date().toISOString(),
        juradosNotificacaoEmProcesso: false,
        juradosNotificacaoProcessoEm: null,
    };
    await updateNotificacaoDados(notifId, dadosAtualizados);
};

async function fetchJuradosAtivos() {
    const { data: juradosAtivos, error: errorJurados } = await supabase
        .from('jurados')
        .select('nome, whatsapp, email_google')
        .eq('ativo', true)
        .not('whatsapp', 'is', null);

    if (errorJurados || !juradosAtivos || juradosAtivos.length === 0) {
        return [];
    }
    return juradosAtivos;
}

export async function notifyJuradosAguardandoAnalise({ notifId, dadosNotificacao, messageData }) {
    // REMOVIDO: Notificações para jurados - agora apenas ADM é notificado
    // Esta função foi mantida para compatibilidade, mas não envia mais para jurados
    return { success: true, sent: 0, total: 0, skipped: true, reason: 'Notificações para jurados desabilitadas - apenas ADM recebe' };

    if (juradosAtivos.length === 0) {
        return { success: false, error: 'Nenhum jurado ativo encontrado' };
    }

    let sucessosJurados = 0;
    for (const jurado of juradosAtivos) {
        if (jurado.whatsapp) {
            try {
                const result = await sendWhatsappNotification({
                    phone: jurado.whatsapp,
                    email: jurado.email_google || `${jurado.whatsapp}@masterleaguef1.com`,
                    nome: jurado.nome || 'Jurado',
                    message: mensagemJurados,
                });

                if (result.success) {
                    sucessosJurados++;
                } else {
                    console.warn(`⚠️ Erro ao enviar para jurado ${jurado.nome}:`, result.error);
                }

                await new Promise(resolve => setTimeout(resolve, 500));
            } catch (err) {
                console.error(`❌ Erro ao enviar notificação para jurado ${jurado.nome}:`, err);
            }
        }
    }

    if (notifId && dadosNotificacao) {
        if (sucessosJurados > 0) {
            await markJuradoNotificationSent(notifId, dadosNotificacao, true);
        } else {
            await markJuradoNotificationPending(notifId, dadosNotificacao, 'falha_envio');
        }
    }

    return { success: sucessosJurados > 0, sent: sucessosJurados, total: juradosAtivos.length };
}

export async function flushPendingJuradoNotifications() {
    // REMOVIDO: Notificações para jurados desabilitadas
    return { success: true, processed: 0, sent: 0, skipped: true, reason: 'Notificações para jurados desabilitadas' };
}

/**
 * Normaliza texto para UTF-8 (garante acentuação correta em português)
 */
function normalizeText(text) {
    if (!text) return '';
    return String(text).normalize('NFC');
}

/**
 * Envia mensagem via WhatsApp usando CallMeBot API (gratuito)
 * Envia para todos os destinatários configurados
 */
async function sendWhatsAppMessage(message) {
    if (!WHATSAPP_RECIPIENTS || WHATSAPP_RECIPIENTS.length === 0) {
        console.warn('⚠️ WhatsApp CallMeBot não configurado');
        return false;
    }

    // Normalizar mensagem para UTF-8 (acentuação correta)
    const normalizedMessage = normalizeText(message);
    const encodedMessage = encodeURIComponent(normalizedMessage);
    let sucessos = 0;

    for (const recipient of WHATSAPP_RECIPIENTS) {
        try {
            console.log(`📤 Enviando WhatsApp para ${recipient.nome}...`);
            
            const url = `https://api.callmebot.com/whatsapp.php?phone=${recipient.phone}&text=${encodedMessage}&apikey=${recipient.apikey}`;
            const response = await fetch(url);
            const text = await response.text();

            if (response.ok && text.includes('queued')) {
                console.log(`✅ WhatsApp enviado para ${recipient.nome}`);
                sucessos++;
            } else {
                console.error(`❌ Erro WhatsApp ${recipient.nome}:`, text);
            }
            
            // Pequeno delay entre envios para não sobrecarregar a API
            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (err) {
            console.error(`❌ Erro ao enviar WhatsApp para ${recipient.nome}:`, err);
        }
    }

    console.log(`📬 WhatsApp: ${sucessos}/${WHATSAPP_RECIPIENTS.length} enviados`);
    return sucessos > 0;
}

/**
 * Envia mensagem via Telegram Bot (gratuito e confiável)
 */
async function sendTelegramMessage(message) {
    if (!TELEGRAM_BOT_TOKEN || !ADMIN_CONFIG.telegramChatId) {
        console.warn('⚠️ Telegram não configurado');
        return false;
    }

    try {
        console.log('📤 Enviando mensagem para Telegram...');
        // Normalizar mensagem para UTF-8 (acentuação correta em português)
        const normalizedMessage = normalizeText(message);
        
        const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json; charset=utf-8'
            },
            body: JSON.stringify({
                chat_id: ADMIN_CONFIG.telegramChatId,
                text: normalizedMessage,
                // Removido parse_mode para evitar erros com caracteres especiais
            }),
        });

        // Verificar se a resposta tem conteúdo antes de fazer parse JSON
        const responseText = await response.text();
        let data;
        
        try {
            data = responseText ? JSON.parse(responseText) : {};
        } catch (parseError) {
            console.error('❌ Erro ao fazer parse da resposta Telegram:', parseError);
            console.error('📄 Resposta recebida (texto):', responseText);
            return false;
        }
        
        console.log('📬 Resposta Telegram:', data);

        if (response.ok && data.ok) {
            console.log('✅ Telegram enviado com sucesso');
            return true;
        } else {
            console.error('❌ Erro Telegram:', data);
            return false;
        }
    } catch (err) {
        console.error('❌ Erro ao enviar Telegram:', err);
        return false;
    }
}

/**
 * Envia notificação para o Admin via WhatsApp usando CallMeBot (gratuito)
 * Requer configuração prévia: https://www.callmebot.com/blog/free-api-whatsapp-messages/
 * 
 * Para ativar:
 * 1. Adicione o número +34 644 52 65 23 aos contatos do WhatsApp do admin
 * 2. Envie "I allow callmebot to send me messages" para esse número
 * 3. Você receberá uma apikey - adicione abaixo
 */
const CALLMEBOT_APIKEY = ''; // TODO: Adicionar apikey do CallMeBot quando configurado

/**
 * Envia notificação automática ao admin sobre nova acusação
 * Tenta múltiplos métodos: Twilio WhatsApp, CallMeBot, Email, Log no banco, Telegram
 * SEM RESTRIÇÃO DE HORÁRIO - Envio imediato 24/7
 */
export async function notifyAdminNewAccusation(dadosAcusacao) {
    console.log('🚀 [ADMIN] Iniciando notificação ao admin (sem restrição de horário)...', dadosAcusacao);
    
    const resultados = {
        whatsappTwilio: false,
        whatsappCallMeBot: false,
        email: false,
        database: false,
        telegram: false,
    };

    // Verificar se é retirada de bug
    const isRetiradaBug = dadosAcusacao.tipoSolicitacao === 'retirada_bug';
    
    // Formatar mensagem para WhatsApp/Telegram (normalizada para UTF-8)
    const mensagemTexto = normalizeText(`🚨 ${isRetiradaBug ? 'RETIRADA DE BUG' : 'NOVA ACUSAÇÃO'} - ML F1

🔖 Código: ${dadosAcusacao.codigoLance || 'N/A'}

👤 Acusador: ${dadosAcusacao.acusador.nome}
📱 Gamertag: ${dadosAcusacao.acusador.gamertag}
📞 WhatsApp: ${dadosAcusacao.acusador.whatsapp || '-'}

${isRetiradaBug ? 'ℹ️ Tipo: Retirada de Bug\n⚠️ Este lance será analisado pois não possui piloto acusado.\n' : `⚖️ Acusado: ${dadosAcusacao.acusado.nome}\n📱 Gamertag: ${dadosAcusacao.acusado.gamertag || '-'}\n📞 WhatsApp: ${dadosAcusacao.acusado.whatsapp || '-'}\n`}
📍 Etapa: ${dadosAcusacao.etapa.round} - ${dadosAcusacao.etapa.circuit}
🏁 Grid: ${dadosAcusacao.acusador.grid?.toUpperCase()}

📝 Descrição:
${dadosAcusacao.descricao}

🎥 Vídeo: ${dadosAcusacao.videoLink}

🔗 Painel: ${SITE_URL}/analises

⏰ ${new Date().toLocaleString('pt-BR')}`);

    // 1. PRIORIDADE: Enviar via Twilio (principal método para admin)
    try {
        console.log('📱 [ADMIN] Enviando via Twilio para admin...');
        const twilioResult = await sendWhatsappNotification({
            phone: ADMIN_CONFIG.whatsapp,
            email: ADMIN_CONFIG.email,
            nome: 'Admin MLF1',
            message: mensagemTexto,
        });
        resultados.whatsappTwilio = !!twilioResult.success;
        if (twilioResult.success) {
            console.log('✅ [ADMIN] WhatsApp enviado via Twilio!');
        } else {
            console.warn('⚠️ [ADMIN] Falha Twilio:', twilioResult.error);
        }
    } catch (err) {
        console.error('❌ [ADMIN] Erro ao enviar via Twilio:', err);
    }

    // 2. Backup: Enviar via CallMeBot (se Twilio falhar)
    if (!resultados.whatsappTwilio && CALLMEBOT_APIKEY) {
        try {
            const url = `https://api.callmebot.com/whatsapp.php?phone=${ADMIN_CONFIG.whatsapp}&text=${encodeURIComponent(mensagemTexto)}&apikey=${CALLMEBOT_APIKEY}`;
            const response = await fetch(url);
            if (response.ok) {
                resultados.whatsappCallMeBot = true;
                console.log('✅ [ADMIN] WhatsApp enviado via CallMeBot (backup)');
            }
        } catch (err) {
            console.warn('⚠️ [ADMIN] Falha CallMeBot:', err);
        }
    }

    // 3. Registrar no banco de dados
    try {
        console.log('💾 [ADMIN] Salvando no banco de dados...');
        const { data, error } = await supabase
            .from('notificacoes_admin')
            .insert([{
                tipo: 'nova_acusacao',
                dados: dadosAcusacao,
                mensagem: mensagemTexto,
                lido: false,
                created_at: new Date().toISOString(),
            }])
            .select();
        
        if (error) {
            console.error('❌ [ADMIN] Erro ao salvar no banco:', error);
        } else {
            resultados.database = true;
            console.log('✅ [ADMIN] Notificação salva no banco de dados');
        }
    } catch (err) {
        console.error('❌ [ADMIN] Exceção ao salvar notificação no banco:', err);
    }

    // 4. Tentar enviar email
    try {
        const template = getEmailTemplate('admin_nova_acusacao', {
            codigo_lance: dadosAcusacao.codigoLance || 'N/A',
            piloto_acusador: dadosAcusacao.acusador.nome,
            piloto_acusado: dadosAcusacao.acusado.nome,
            grid: dadosAcusacao.acusador.grid,
            etapa_nome: `${dadosAcusacao.etapa.round} - ${dadosAcusacao.etapa.circuit}`,
            descricao: dadosAcusacao.descricao,
            video_link: dadosAcusacao.videoLink,
        });

        if (template) {
            const result = await sendEmailNotification(
                ADMIN_CONFIG.email,
                template.subject,
                template.html,
                'admin_nova_acusacao'
            );
            resultados.email = result.success;
        }
    } catch (err) {
        console.warn('⚠️ [ADMIN] Falha ao enviar email:', err);
    }

    // 5. SEMPRE enviar via Telegram (não é backup, é canal adicional)
    try {
        console.log('📤 [ADMIN] Enviando via Telegram...');
        resultados.telegram = await sendTelegramMessage(mensagemTexto);
        if (resultados.telegram) {
            console.log('✅ [ADMIN] Telegram enviado com sucesso!');
        } else {
            console.warn('⚠️ [ADMIN] Falha ao enviar Telegram');
        }
    } catch (err) {
        console.error('❌ [ADMIN] Falha ao enviar Telegram:', err);
    }

    // 6. CallMeBot para lista de destinatários (backup adicional)
    try {
        await sendWhatsAppMessage(mensagemTexto);
    } catch (err) {
        console.warn('⚠️ [ADMIN] Falha CallMeBot lista:', err);
    }

    console.log('📊 [ADMIN] Resultado das notificações:', resultados);
    return resultados;
}

/**
 * Notifica o PILOTO ACUSADOR quando a análise é aberta
 */
export async function notifyAccusatorAnalysisOpened({ dadosAcusacao, acusador }) {
    try {
        if (!dadosAcusacao || !acusador) return { whatsapp: false };

        const codigo = dadosAcusacao.codigoLance || 'N/A';
        const etapa = dadosAcusacao.etapa?.circuit
            ? `${dadosAcusacao.etapa.round} - ${dadosAcusacao.etapa.circuit}`
            : `${dadosAcusacao.etapa?.round || '-'}`;
        const isRetiradaBug = dadosAcusacao.tipoSolicitacao === 'retirada_bug';
        const acusadoNome = dadosAcusacao.acusado?.nome || 'Administração Master League F1';
        
        const motorhomeUrl = `${SITE_URL}/dashboard`;
        const analisesUrl = `${SITE_URL}/analises`;

        let msgWhats = normalizeText(`*MENSAGEM AUTOMÁTICA*\n\n` +
            `✅ *SUA ANÁLISE FOI ABERTA - MASTER LEAGUE F1*\n\n` +
            `🔖 *Código:* ${codigo}\n` +
            `🏁 *Etapa:* ${etapa}\n\n`);

        if (isRetiradaBug) {
            msgWhats += normalizeText(`📋 *Tipo:* Retirada de Bug\n\n` +
                `ℹ️ Este lance será analisado pela comissão pois não possui piloto acusado.\n\n` +
                `📊 A comissão de análise irá avaliar o lance e publicar o veredito.\n\n`);
        } else {
            msgWhats += normalizeText(`👤 *Acusado:* ${acusadoNome}\n\n` +
                `📝 *Descrição:*\n${dadosAcusacao.descricao || '-'}\n\n` +
                `🎥 *Vídeo do lance:*\n${dadosAcusacao.videoLink || '-'}\n\n` +
                `ℹ️ O piloto acusado será notificado para enviar sua defesa.\n\n` +
                `⏰ Assim que a defesa for enviada ou o prazo for encerrado, a comissão de análise irá analisar o lance.\n\n`);
        }

        msgWhats += normalizeText(`🔗 Acompanhe: ${analisesUrl}`);

        const resultados = { whatsapp: false };

        // WhatsApp (se tiver número)
        if (acusador.whatsapp) {
            const w = await sendWhatsappNotification({
                phone: acusador.whatsapp,
                email: acusador.email || `${String(acusador.whatsapp).replace(/\D/g, '')}@masterleaguef1.com`,
                nome: acusador.nome || 'Piloto',
                message: msgWhats,
            });
            resultados.whatsapp = !!w.success;
            if (!w.success) console.warn('⚠️ Falha ao notificar acusador via WhatsApp:', w.error);
        }

        return resultados;
    } catch (err) {
        console.error('❌ Erro ao notificar acusador:', err);
        return { whatsapp: false, error: err?.message || String(err) };
    }
}

/**
 * Notifica o PILOTO ACUSADO para enviar DEFESA (via Twilio WhatsApp).
 * Importante: só deve ser chamado quando status = 'aguardando_defesa' (acusação normal).
 * SEM RESTRIÇÃO DE HORÁRIO - Envio imediato 24/7
 */
export async function notifyAccusedDefenseRequest({ dadosAcusacao, acusado }) {
    console.log('🛡️ [ACUSADO] Iniciando notificação ao piloto acusado (sem restrição de horário)...', {
        codigo: dadosAcusacao?.codigoLance,
        acusado: acusado?.nome,
        whatsapp: acusado?.whatsapp,
        status: dadosAcusacao?.status,
        tipoSolicitacao: dadosAcusacao?.tipoSolicitacao
    });

    try {
        if (!dadosAcusacao || !acusado) {
            console.warn('⚠️ [ACUSADO] Dados incompletos - dadosAcusacao ou acusado ausente');
            return { whatsapp: false, error: 'Dados incompletos' };
        }

        // Não notificar se for retirada de bug (não existe defesa)
        if (dadosAcusacao.tipoSolicitacao === 'retirada_bug') {
            console.log('ℹ️ [ACUSADO] Retirada de bug - não notificar acusado');
            return { whatsapp: false, skipped: true, reason: 'retirada_bug' };
        }

        // Não notificar se status não for aguardando_defesa
        if (dadosAcusacao.status !== 'aguardando_defesa') {
            console.log('ℹ️ [ACUSADO] Status não é aguardando_defesa:', dadosAcusacao.status);
            return { whatsapp: false, skipped: true, reason: `status_${dadosAcusacao.status}` };
        }

        // Verificar se tem WhatsApp
        if (!acusado.whatsapp) {
            console.warn('⚠️ [ACUSADO] Piloto acusado não tem WhatsApp cadastrado:', acusado.nome);
            return { whatsapp: false, error: 'WhatsApp não cadastrado' };
        }

        const codigo = dadosAcusacao.codigoLance || 'N/A';
        const etapa = dadosAcusacao.etapa?.circuit
            ? `${dadosAcusacao.etapa.round} - ${dadosAcusacao.etapa.circuit}`
            : `${dadosAcusacao.etapa?.round || '-'}`;

        const motorhomeUrl = `${SITE_URL}/dashboard`;

        const msgWhats = normalizeText(`*MENSAGEM AUTOMÁTICA*\n\n` +
            `🛡️ *VOCÊ FOI ACUSADO - MASTER LEAGUE F1*\n\n` +
            `🔖 *Código:* ${codigo}\n` +
            `👤 *Acusador:* ${dadosAcusacao.acusador?.nome || '-'}\n` +
            `🏁 *Etapa:* ${etapa}\n` +
            `🏎️ *Grid:* ${(dadosAcusacao.acusador?.grid || dadosAcusacao.grid || '').toUpperCase()}\n\n` +
            `📝 *Descrição:*\n${dadosAcusacao.descricao || '-'}\n\n` +
            `🎥 *Vídeo do lance:*\n${dadosAcusacao.videoLink || '-'}\n\n` +
            `⏰ *Prazo:* até *12:00h do dia seguinte*.\n` +
            `✅ Envie o *vídeo de defesa* pelo *link verde do Motorhome*.\n\n` +
            `🔗 Motorhome: ${motorhomeUrl}`);

        console.log('📱 [ACUSADO] Enviando WhatsApp via Twilio para:', acusado.whatsapp);

        const w = await sendWhatsappNotification({
            phone: acusado.whatsapp,
            email: acusado.email || `${String(acusado.whatsapp).replace(/\D/g, '')}@masterleaguef1.com`,
            nome: acusado.nome || 'Piloto',
            message: msgWhats,
        });

        const resultados = { whatsapp: !!w.success };

        if (w.success) {
            console.log('✅ [ACUSADO] WhatsApp enviado com sucesso para:', acusado.nome);
        } else {
            console.error('❌ [ACUSADO] Falha ao enviar WhatsApp:', w.error);
            resultados.error = w.error;
        }

        return resultados;
    } catch (err) {
        console.error('❌ [ACUSADO] Exceção ao notificar acusado:', err);
        return { whatsapp: false, error: err?.message || String(err) };
    }
}

/**
 * Envia email via Supabase Edge Function
 * Necessário ter a Edge Function 'send-email' configurada
 */
export async function sendEmailNotification(to, subject, htmlContent, templateType) {
    try {
        // Log no banco de dados antes de tentar enviar
        const { data: logData, error: logError } = await supabase
            .from('email_log')
            .insert([
                {
                    destinatario: to,
                    assunto: subject,
                    tipo: templateType,
                    status: 'pendente',
                }
            ])
            .select()
            .single();

        if (logError) {
            console.error('Erro ao registrar email:', logError);
        }

        // Chamar Edge Function (será criada no Supabase)
        const { data, error } = await supabase.functions.invoke('send-email', {
            body: {
                to,
                subject,
                html: htmlContent,
                templateType,
                logId: logData?.id,
            },
        });

        if (error) {
            console.error('Erro ao enviar email:', error);
            // Atualizar log de falha
            if (logData?.id) {
                await supabase
                    .from('email_log')
                    .update({ status: 'falha', erro: error.message })
                    .eq('id', logData.id);
            }
            return { success: false, error: error.message };
        }

        // Atualizar log como enviado
        if (logData?.id) {
            await supabase
                .from('email_log')
                .update({ status: 'enviado' })
                .eq('id', logData.id);
        }

        return { success: true, data };
    } catch (err) {
        console.error('Erro ao enviar notificação:', err);
        return { success: false, error: err.message };
    }
}

/**
 * Templates de email para diferentes cenários
 */
export function getEmailTemplate(type, data) {
    const templates = {
        acusacao_enviada: {
            subject: `[ML F1] Nova Acusação Registrada - ${data.codigo_lance}`,
            getHtml: () => `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #FF6B35;">⚖️ Acusação Registrada</h2>
                    <p>Olá <strong>${data.piloto_acusador}</strong>,</p>
                    <p>Sua acusação contra <strong>${data.piloto_acusado}</strong> foi registrada com sucesso!</p>
                    
                    <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <p><strong>Código Lance:</strong> ${data.codigo_lance}</p>
                        <p><strong>Etapa:</strong> ${data.etapa_nome} (${data.etapa_data})</p>
                        <p><strong>Grid:</strong> ${data.grid === 'carreira' ? 'Carreira' : 'Light'}</p>
                        ${data.grid === 'light' ? `<p><strong>Deadline:</strong> Próximo dia às 20:00 BRT</p>` : ''}
                    </div>

                    <p>O piloto acusado terá tempo para enviar sua defesa.</p>
                    <p><strong>Acompanhe aqui:</strong> <a href="${SITE_URL}/analises">Painel de Análises</a></p>
                    
                    <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
                    <p style="font-size: 12px; color: #666;">Master League F1 - Stewards</p>
                </div>
            `,
        },

        acusacao_recebida_acusado: {
            subject: `[ML F1] Você foi Acusado - ${data.codigo_lance}`,
            getHtml: () => `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #06B6D4;">🛡️ Acusação Recebida</h2>
                    <p>Olá <strong>${data.piloto_acusado}</strong>,</p>
                    <p>Você recebeu uma acusação de <strong>${data.piloto_acusador}</strong>.</p>
                    
                    <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <p><strong>Código Lance:</strong> ${data.codigo_lance}</p>
                        <p><strong>Etapa:</strong> ${data.etapa_nome}</p>
                        <p><strong>Descrição:</strong></p>
                        <p style="margin-left: 10px; font-style: italic;">"${data.descricao}"</p>
                    </div>

                    <p>Você tem direito a enviar sua <strong>DEFESA</strong>.</p>
                    <p><a href="${data.defesa_url || `${SITE_URL}/defesa`}" style="background: #06B6D4; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; display: inline-block;">Enviar Defesa</a></p>
                    
                    <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
                    <p style="font-size: 12px; color: #666;">Master League F1 - Stewards</p>
                </div>
            `,
        },

        defesa_enviada: {
            subject: `[ML F1] Defesa Enviada - ${data.codigo_lance}`,
            getHtml: () => `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #06B6D4;">✅ Defesa Registrada</h2>
                    <p>Olá <strong>${data.piloto_acusado}</strong>,</p>
                    <p>Sua defesa foi registrada com sucesso!</p>
                    
                    <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <p><strong>Código Lance:</strong> ${data.codigo_lance}</p>
                        <p><strong>Acusador:</strong> ${data.piloto_acusador}</p>
                        <p><strong>Status:</strong> Aguardando Análise dos Stewards</p>
                    </div>

                    <p>Os Stewards analisarão sua defesa em breve.</p>
                    <p><a href="${SITE_URL}/analises" style="background: #06B6D4; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; display: inline-block;">Acompanhar</a></p>
                    
                    <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
                    <p style="font-size: 12px; color: #666;">Master League F1 - Stewards</p>
                </div>
            `,
        },

        veredito_notificacao: {
            subject: `[ML F1] Veredito Publicado - ${data.codigo_lance}`,
            getHtml: () => `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: ${data.resultado === 'absolvido' ? '#22C55E' : '#FF6B35'};">⚖️ Veredito Publicado</h2>
                    <p>Olá <strong>${data.piloto}</strong>,</p>
                    <p>Um veredito foi publicado para o seu caso:</p>
                    
                    <div style="background: ${data.resultado === 'absolvido' ? '#e8f5e9' : '#ffebee'}; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${data.resultado === 'absolvido' ? '#22C55E' : '#FF6B35'};">
                        <p style="font-size: 16px; font-weight: bold; margin: 0;">
                            ${data.resultado === 'absolvido' ? '✅ ABSOLVIDO' : '❌ CULPADO'}
                        </p>
                        ${data.penalty_type ? `<p><strong>Penalidade:</strong> ${data.penalty_type}</p>` : ''}
                        ${data.pontos_deducted ? `<p><strong>Pontos Descontados:</strong> ${data.pontos_deducted}</p>` : ''}
                        ${data.race_ban ? `<p style="color: #FF6B35; font-weight: bold;">🚫 BAN NA PRÓXIMA CORRIDA</p>` : ''}
                        ${data.explanation ? `<p><strong>Explicação:</strong></p><p>${data.explanation}</p>` : ''}
                    </div>

                    <p><a href="${SITE_URL}/analises" style="background: #3B82F6; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; display: inline-block;">Ver Análise Completa</a></p>
                    
                    <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
                    <p style="font-size: 12px; color: #666;">Master League F1 - Stewards</p>
                </div>
            `,
        },

        admin_nova_acusacao: {
            subject: `[ML F1 ADMIN] Nova Acusação - ${data.codigo_lance}`,
            getHtml: () => `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #3B82F6;">👨‍⚖️ Nova Acusação para Análise</h2>
                    <p>Uma nova acusação foi registrada no sistema.</p>
                    
                    <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <p><strong>Código:</strong> ${data.codigo_lance}</p>
                        <p><strong>Acusador:</strong> ${data.piloto_acusador}</p>
                        <p><strong>Acusado:</strong> ${data.piloto_acusado}</p>
                        <p><strong>Grid:</strong> ${data.grid === 'carreira' ? 'Carreira' : 'Light'}</p>
                        <p><strong>Etapa:</strong> ${data.etapa_nome}</p>
                        <p><strong>Descrição:</strong></p>
                        <p style="margin-left: 10px; padding: 10px; background: white; border-left: 3px solid #3B82F6;">${data.descricao}</p>
                        ${data.video_link ? `<p><strong>Vídeo:</strong> <a href="${data.video_link}" target="_blank">${data.video_link}</a></p>` : ''}
                    </div>

                    <p><a href="https://masterleague-f1.com/analises" style="background: #3B82F6; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; display: inline-block;">Analisar no Painel</a></p>
                    
                    <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
                    <p style="font-size: 12px; color: #666;">Master League F1 - Admin Panel</p>
                </div>
            `,
        },
    };

    const template = templates[type];
    if (!template) {
        console.warn(`Template de email "${type}" não encontrado`);
        return null;
    }

    return {
        subject: template.subject,
        html: template.getHtml(),
    };
}

/**
 * Envia notificação ao admin sobre nova defesa recebida
 * ATUALIZA a acusação existente com os dados da defesa (não cria registro separado)
 * SEM RESTRIÇÃO DE HORÁRIO - Envio imediato 24/7
 */
export async function notifyAdminNewDefense(dadosDefesa) {
    console.log('🛡️ [DEFESA] Iniciando notificação de defesa ao admin (sem restrição de horário)...', dadosDefesa);

    const skipDatabaseUpdate = !!dadosDefesa?.skipDatabaseUpdate;
    
    const resultados = {
        whatsappTwilio: false,
        whatsappCallMeBot: false,
        database: false,
        telegram: false,
    };

    // Formatar mensagem (normalizada para UTF-8)
    const mensagem = normalizeText(`🛡️ NOVA DEFESA - ML F1

🔖 Código: ${dadosDefesa.codigoLance || 'N/A'}

👤 Defensor: ${dadosDefesa.defensor.nome}
📱 Gamertag: ${dadosDefesa.defensor.gamertag}
📞 WhatsApp: ${dadosDefesa.defensor.whatsapp || '-'}

⚖️ Acusador Original: ${dadosDefesa.acusacaoOriginal?.acusador?.nome || '-'}

📍 Etapa: ${dadosDefesa.acusacaoOriginal?.etapa?.round} - ${dadosDefesa.acusacaoOriginal?.etapa?.circuit}
🏁 Grid: ${dadosDefesa.defensor.grid?.toUpperCase()}

📝 Defesa:
${dadosDefesa.descricaoDefesa}

${dadosDefesa.videoLinkDefesa ? `🎥 Vídeo: ${dadosDefesa.videoLinkDefesa}` : ''}

🔗 Painel: ${SITE_URL}/analises

⏰ ${new Date().toLocaleString('pt-BR')}`);

    // 1. PRIORIDADE: Enviar via Twilio para admin
    try {
        console.log('📱 [DEFESA] Enviando via Twilio para admin...');
        const twilioResult = await sendWhatsappNotification({
            phone: ADMIN_CONFIG.whatsapp,
            email: ADMIN_CONFIG.email,
            nome: 'Admin MLF1',
            message: mensagem,
        });
        resultados.whatsappTwilio = !!twilioResult.success;
        if (twilioResult.success) {
            console.log('✅ [DEFESA] WhatsApp enviado via Twilio!');
        } else {
            console.warn('⚠️ [DEFESA] Falha Twilio:', twilioResult.error);
        }
    } catch (err) {
        console.error('❌ [DEFESA] Erro ao enviar via Twilio:', err);
    }

    // 2. ATUALIZAR a acusação existente com os dados da defesa
    if (!skipDatabaseUpdate) {
        try {
            console.log('💾 [DEFESA] Atualizando acusação existente com defesa...');
            
            const { data: acusacaoExistente, error: fetchError } = await supabase
                .from('notificacoes_admin')
                .select('*')
                .eq('tipo', 'nova_acusacao')
                .filter('dados->>codigoLance', 'eq', dadosDefesa.codigoLance)
                .single();
            
            if (fetchError || !acusacaoExistente) {
                console.error('❌ [DEFESA] Acusação original não encontrada:', fetchError);
            } else {
                const dadosAtualizados = {
                    ...acusacaoExistente.dados,
                    defesa: {
                        defensor: dadosDefesa.defensor,
                        descricaoDefesa: dadosDefesa.descricaoDefesa,
                        videoLinkDefesa: dadosDefesa.videoLinkDefesa,
                        videoEmbedDefesa: dadosDefesa.videoEmbedDefesa,
                        dataEnvioDefesa: dadosDefesa.dataEnvio,
                    },
                    status: 'aguardando_analise',
                };
                
                const { error: updateError } = await supabase
                    .from('notificacoes_admin')
                    .update({
                        dados: dadosAtualizados,
                        lido: false,
                    })
                    .eq('id', acusacaoExistente.id);
                
                if (updateError) {
                    console.error('❌ [DEFESA] Erro ao atualizar acusação:', updateError);
                } else {
                    resultados.database = true;
                    console.log('✅ [DEFESA] Acusação atualizada com defesa!');
                }
            }
        } catch (err) {
            console.error('❌ [DEFESA] Exceção ao atualizar acusação:', err);
        }
    }

    // 3. SEMPRE enviar via Telegram (canal adicional, não backup)
    try {
        console.log('📤 [DEFESA] Enviando via Telegram...');
        resultados.telegram = await sendTelegramMessage(mensagem);
        if (resultados.telegram) {
            console.log('✅ [DEFESA] Telegram enviado com sucesso!');
        } else {
            console.warn('⚠️ [DEFESA] Falha ao enviar Telegram');
        }
    } catch (err) {
        console.error('❌ [DEFESA] Falha ao enviar Telegram:', err);
    }

    // 4. CallMeBot para lista de destinatários (backup adicional)
    try {
        resultados.whatsappCallMeBot = await sendWhatsAppMessage(mensagem);
    } catch (err) {
        console.warn('⚠️ [DEFESA] Falha CallMeBot lista:', err);
    }

    console.log('📊 [DEFESA] Resultado das notificações:', resultados);
    return resultados;
}

/**
 * Notifica o ADM sobre o veredito final
 * SEM RESTRIÇÃO DE HORÁRIO - Envio imediato 24/7
 */
export async function notifyAdminVereditoFinal(lance, resultado) {
    console.log('👨‍⚖️ [VEREDITO] Iniciando notificação de veredito ao admin (sem restrição de horário)...');
    
    try {
        const dados = lance.dados || {};
        const codigo = dados.codigoLance || 'N/A';
        const acusadoNome = dados.acusado?.nome || '-';
        const acusador = dados.acusador?.nome || '-';
        const etapa = dados.etapa || {};
        const circuit = etapa.circuit || '-';
        const round = etapa.round || '-';
        const grid = etapa.grid || dados.grid || '-';
        const gridLabel = grid === 'carreira' ? '🏆 CARREIRA' : (grid === 'light' ? '💡 LIGHT' : grid);
        const isRetiradaBug = dados?.tipoSolicitacao === 'retirada_bug' || acusadoNome === 'Administração Master League F1';
        
        const acusado = (isRetiradaBug && acusadoNome === 'Administração Master League F1') ? 'ADM MLF1' : acusadoNome;

        // Mensagem normalizada para UTF-8 (acentuação correta)
        let mensagem = normalizeText(`👨‍⚖️ *VEREDITO FINAL - MASTER LEAGUE F1*\n\n` +
            `🔖 *Código:* ${codigo}\n` +
            `${gridLabel ? `🎯 *Grid:* ${gridLabel}\n` : ''}` +
            `🏁 *Round ${round} - ${circuit}*\n` +
            `👤 *Acusador:* ${acusador}\n` +
            `🎯 *Acusado:* ${acusado}\n\n` +
            `📊 *Placar:* ${resultado.placar}\n` +
            `⚖️ *Decisão:* ${resultado.decisao}`);

        if (!isRetiradaBug && resultado.culpado) {
            mensagem += normalizeText(`\n\n⚠️ *Punição:* ${resultado.labelPunicao}`);
            if (resultado.agravante) mensagem += normalizeText(`\n➕ *Agravante:* +5 pontos`);
            if (resultado.semVideo) mensagem += normalizeText(`\n📹 *Sem envio do vídeo:* -5 pontos`);
            mensagem += normalizeText(`\n📉 *Pontos perdidos:* ${resultado.pontosPerdidos}`);
            if (resultado.raceBan) mensagem += normalizeText(`\n⛔ *RACE BAN APLICADO!*`);
        } else if (!isRetiradaBug && resultado.semVideo) {
            mensagem += normalizeText(`\n\n📹 *Sem envio do vídeo:* -5 pontos`);
            mensagem += normalizeText(`\n📉 *Pontos perdidos:* ${resultado.pontosPerdidos}`);
        }

        mensagem += normalizeText(`\n\n🔗 ${SITE_URL}/analises`);

        const resultados = { whatsappTwilio: false, whatsappCallMeBot: false, telegram: false };
        
        // 1. PRIORIDADE: Enviar via Twilio para admin
        try {
            console.log('📱 [VEREDITO] Enviando via Twilio para admin...');
            const twilioResult = await sendWhatsappNotification({
                phone: ADMIN_CONFIG.whatsapp,
                email: ADMIN_CONFIG.email,
                nome: 'Admin MLF1',
                message: mensagem,
            });
            resultados.whatsappTwilio = !!twilioResult.success;
            if (twilioResult.success) {
                console.log('✅ [VEREDITO] WhatsApp enviado via Twilio!');
            } else {
                console.warn('⚠️ [VEREDITO] Falha Twilio:', twilioResult.error);
            }
        } catch (err) {
            console.error('❌ [VEREDITO] Erro ao enviar via Twilio:', err);
        }

        // 2. SEMPRE enviar via Telegram (canal adicional, não backup)
        try {
            console.log('📤 [VEREDITO] Enviando via Telegram...');
            resultados.telegram = await sendTelegramMessage(mensagem);
            if (resultados.telegram) {
                console.log('✅ [VEREDITO] Telegram enviado com sucesso!');
            } else {
                console.warn('⚠️ [VEREDITO] Falha ao enviar Telegram');
            }
        } catch (telegramErr) {
            console.error('❌ [VEREDITO] Falha Telegram:', telegramErr);
        }

        // 3. CallMeBot para lista de destinatários (backup adicional)
        try {
            resultados.whatsappCallMeBot = await sendWhatsAppMessage(mensagem);
        } catch (callmebotErr) {
            console.warn('⚠️ [VEREDITO] Falha CallMeBot lista:', callmebotErr);
        }

        console.log('📊 [VEREDITO] Resultado das notificações:', resultados);
        return resultados;
    } catch (err) {
        console.error('❌ [VEREDITO] Erro ao notificar ADM:', err);
        return { whatsappTwilio: false, whatsappCallMeBot: false, telegram: false, error: err?.message || String(err) };
    }
}

