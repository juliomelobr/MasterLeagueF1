import { supabase } from '../supabaseClient';
import { sendWhatsappNotification } from './whatsappNotify';

// Configurações do Admin
export const ADMIN_CONFIG = {
    whatsapp: '555183433940', // WhatsApp do admin (formato: 55 + DDD + número)
    email: 'admin@masterleague-f1.com', // Email do admin (alterar para o real)
    telegramChatId: '5176212626', // Chat ID do Telegram do admin
};

const SITE_URL = 'https://masterleaguef1.com.br';

// Bot do Telegram da Master League F1
const TELEGRAM_BOT_TOKEN = '8564635113:AAGjr7wnmepztm3CwmZoSw5RmC8BO1pNG04';

// CallMeBot WhatsApp API - Lista de destinatários
const WHATSAPP_RECIPIENTS = [
    { phone: '555183433940', apikey: '6022419', nome: 'Admin' },
    { phone: '5511940133084', apikey: '3666307', nome: 'Edvan Paiva' },
];

/**
 * Envia mensagem via WhatsApp usando CallMeBot API (gratuito)
 * Envia para todos os destinatários configurados
 */
async function sendWhatsAppMessage(message) {
    if (!WHATSAPP_RECIPIENTS || WHATSAPP_RECIPIENTS.length === 0) {
        console.warn('⚠️ WhatsApp CallMeBot não configurado');
        return false;
    }

    const encodedMessage = encodeURIComponent(message);
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
        const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: ADMIN_CONFIG.telegramChatId,
                text: message,
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
 * Tenta múltiplos métodos: CallMeBot WhatsApp, Email, Log no banco
 */
export async function notifyAdminNewAccusation(dadosAcusacao) {
    console.log('🚀 Iniciando notificação ao admin...', dadosAcusacao);
    
    const resultados = {
        whatsapp: false,
        email: false,
        database: false,
        telegram: false,
    };

    // Formatar mensagem para WhatsApp/Telegram
    const mensagemTexto = `🚨 NOVA ACUSAÇÃO - ML F1

👤 Acusador: ${dadosAcusacao.acusador.nome}
📱 Gamertag: ${dadosAcusacao.acusador.gamertag}
📞 WhatsApp: ${dadosAcusacao.acusador.whatsapp || '-'}

⚖️ Acusado: ${dadosAcusacao.acusado.nome}
📱 Gamertag: ${dadosAcusacao.acusado.gamertag || '-'}

📍 Etapa: ${dadosAcusacao.etapa.round} - ${dadosAcusacao.etapa.circuit}
🏁 Grid: ${dadosAcusacao.acusador.grid?.toUpperCase()}

📝 Descrição:
${dadosAcusacao.descricao}

🎥 Vídeo: ${dadosAcusacao.videoLink}

⏰ ${new Date().toLocaleString('pt-BR')}`;

    // 1. Tentar enviar via CallMeBot (se configurado)
    if (CALLMEBOT_APIKEY) {
        try {
            const url = `https://api.callmebot.com/whatsapp.php?phone=${ADMIN_CONFIG.whatsapp}&text=${encodeURIComponent(mensagemTexto)}&apikey=${CALLMEBOT_APIKEY}`;
            const response = await fetch(url);
            if (response.ok) {
                resultados.whatsapp = true;
                console.log('✅ WhatsApp enviado ao admin via CallMeBot');
            }
        } catch (err) {
            console.warn('⚠️ Falha ao enviar WhatsApp via CallMeBot:', err);
        }
    }

    // 2. Registrar no banco de dados
    try {
        console.log('💾 Salvando no banco de dados...');
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
            console.error('❌ Erro ao salvar no banco:', error);
        } else {
            resultados.database = true;
            console.log('✅ Notificação salva no banco de dados:', data);
        }
    } catch (err) {
        console.error('❌ Exceção ao salvar notificação no banco:', err);
    }

    // 3. Tentar enviar email (se Edge Function configurada)
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
        console.warn('⚠️ Falha ao enviar email ao admin:', err);
    }

    // 4. Tentar enviar via Telegram (se configurado)
    try {
        console.log('📤 Preparando envio Telegram...');
        // Usando texto simples sem Markdown para evitar erros de parsing
        const mensagemTelegram = `🚨 NOVA ACUSAÇÃO - ML F1

🔖 Código: ${dadosAcusacao.codigoLance || 'N/A'}

👤 Acusador: ${dadosAcusacao.acusador.nome}
📱 Gamertag: ${dadosAcusacao.acusador.gamertag}
📞 WhatsApp: ${dadosAcusacao.acusador.whatsapp || '-'}

⚖️ Acusado: ${dadosAcusacao.acusado.nome}
📱 Gamertag: ${dadosAcusacao.acusado.gamertag || '-'}
📞 WhatsApp: ${dadosAcusacao.acusado.whatsapp || '-'}

📍 Etapa: ${dadosAcusacao.etapa.round} - ${dadosAcusacao.etapa.circuit}
🏁 Grid: ${dadosAcusacao.acusador.grid?.toUpperCase()}

📝 Descrição:
${dadosAcusacao.descricao}

🎥 Vídeo: ${dadosAcusacao.videoLink}

⏰ ${new Date().toLocaleString('pt-BR')}`;

        resultados.telegram = await sendTelegramMessage(mensagemTelegram);
        
        // Enviar também via WhatsApp
        resultados.whatsapp = await sendWhatsAppMessage(mensagemTelegram);
    } catch (err) {
        console.error('❌ Falha ao enviar notificações:', err);
    }

    // 5. Se status for 'aguardando_analise', notificar todos os jurados ativos
    if (dadosAcusacao.status === 'aguardando_analise') {
        try {
            const { data: juradosAtivos, error: errorJurados } = await supabase
                .from('jurados')
                .select('nome, whatsapp, email_google')
                .eq('ativo', true)
                .not('whatsapp', 'is', null);
            
            if (!errorJurados && juradosAtivos && juradosAtivos.length > 0) {
                const codigoLance = dadosAcusacao.codigoLance || 'N/A';
                const acusador = dadosAcusacao.acusador?.nome || dadosAcusacao.acusador?.gamertag || 'N/A';
                const acusado = dadosAcusacao.acusado?.nome || dadosAcusacao.acusado?.gamertag || 'N/A';
                const etapa = dadosAcusacao.etapa?.circuit || dadosAcusacao.etapa?.round || 'N/A';
                
                const mensagemJurados = `👨‍⚖️ *NOVO LANCE PARA ANÁLISE - MASTER LEAGUE F1*\n\n` +
                    `🔖 *Código:* ${codigoLance}\n` +
                    `🏁 *Etapa:* ${etapa}\n` +
                    `👤 *Acusador:* ${acusador}\n` +
                    `🎯 *Acusado:* ${acusado}\n\n` +
                    `📋 *Acesse o Painel do Júri para analisar:*\n` +
                    `🔗 masterleaguef1.com.br/veredito`;
                
                // Enviar notificação para cada jurado ativo
                let sucessosJurados = 0;
                for (const jurado of juradosAtivos) {
                    if (jurado.whatsapp) {
                        try {
                            const result = await sendWhatsappNotification({
                                phone: jurado.whatsapp,
                                email: jurado.email_google || `${jurado.whatsapp}@masterleaguef1.com`,
                                nome: jurado.nome || 'Jurado',
                                message: mensagemJurados
                            });
                            
                            if (result.success) {
                                sucessosJurados++;
                                console.log(`✅ Notificação enviada para jurado ${jurado.nome}`);
                            } else {
                                console.warn(`⚠️ Erro ao enviar para jurado ${jurado.nome}:`, result.error);
                            }
                            
                            // Pequeno delay entre envios
                            await new Promise(resolve => setTimeout(resolve, 500));
                        } catch (err) {
                            console.error(`❌ Erro ao enviar notificação para jurado ${jurado.nome}:`, err);
                        }
                    }
                }
                
                if (sucessosJurados > 0) {
                    console.log(`📬 Notificações enviadas para ${sucessosJurados} jurado(s)`);
                }
            } else {
                console.warn('⚠️ Nenhum jurado ativo encontrado ou sem WhatsApp configurado');
            }
        } catch (err) {
            console.error('⚠️ Erro ao enviar notificações para jurados:', err);
            // Não bloquear o fluxo principal se a notificação falhar
        }
    }

    console.log('📊 Resultado das notificações:', resultados);
    return resultados;
}

/**
 * Notifica o PILOTO ACUSADO para enviar DEFESA (somente WhatsApp).
 * Importante: só deve ser chamado quando status = 'aguardando_defesa' (acusação normal).
 */
export async function notifyAccusedDefenseRequest({ dadosAcusacao, acusado }) {
    try {
        if (!dadosAcusacao || !acusado) return { whatsapp: false };

        // Não notificar se for retirada de bug (não existe defesa)
        if (dadosAcusacao.tipoSolicitacao === 'retirada_bug' || dadosAcusacao.status !== 'aguardando_defesa') {
            return { whatsapp: false, skipped: true };
        }

        const codigo = dadosAcusacao.codigoLance || 'N/A';
        const etapa = dadosAcusacao.etapa?.circuit
            ? `${dadosAcusacao.etapa.round} - ${dadosAcusacao.etapa.circuit}`
            : `${dadosAcusacao.etapa?.round || '-'}`;

        const motorhomeUrl = `${SITE_URL}/dashboard`;

        const msgWhats = `🛡️ *VOCÊ FOI ACUSADO - MASTER LEAGUE F1*\n\n` +
            `🔖 *Código:* ${codigo}\n` +
            `👤 *Acusador:* ${dadosAcusacao.acusador?.nome || '-'}\n` +
            `🏁 *Etapa:* ${etapa}\n\n` +
            `📝 *Descrição:*\n${dadosAcusacao.descricao || '-'}\n\n` +
            `🎥 *Vídeo do lance:*\n${dadosAcusacao.videoLink || '-'}\n\n` +
            `⏰ *Prazo:* até *12:00h do dia seguinte*.\n` +
            `✅ Envie o *vídeo de defesa* pelo *link verde do Motorhome*.\n\n` +
            `🔗 Motorhome: ${motorhomeUrl}`;

        const resultados = { whatsapp: false };

        // WhatsApp (se tiver número)
        if (acusado.whatsapp) {
            const w = await sendWhatsappNotification({
                phone: acusado.whatsapp,
                email: acusado.email || `${String(acusado.whatsapp).replace(/\D/g, '')}@masterleaguef1.com`,
                nome: acusado.nome || 'Piloto',
                message: msgWhats,
            });
            resultados.whatsapp = !!w.success;
            if (!w.success) console.warn('⚠️ Falha ao notificar acusado via WhatsApp:', w.error);
        }

        return resultados;
    } catch (err) {
        console.error('❌ Erro ao notificar acusado:', err);
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
 */
export async function notifyAdminNewDefense(dadosDefesa) {
    console.log('🛡️ Iniciando notificação de defesa ao admin...', dadosDefesa);

    const skipDatabaseUpdate = !!dadosDefesa?.skipDatabaseUpdate;
    
    const resultados = {
        whatsapp: false,
        email: false,
        database: false,
        telegram: false,
    };

    // Formatar mensagem para Telegram
    const mensagemTelegram = `🛡️ NOVA DEFESA - ML F1

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

⏰ ${new Date().toLocaleString('pt-BR')}`;

    // 1. ATUALIZAR a acusação existente com os dados da defesa (incorporar ao mesmo registro)
    // OBS: quando a defesa é enviada pelo FormularioDefesa.jsx, ele já atualiza o banco.
    // Aqui deixamos a atualização como fallback (e dá para desabilitar via skipDatabaseUpdate).
    if (!skipDatabaseUpdate) {
        try {
            console.log('💾 Atualizando acusação existente com defesa...');
            
            // Buscar a acusação original pelo código do lance
            const { data: acusacaoExistente, error: fetchError } = await supabase
                .from('notificacoes_admin')
                .select('*')
                .eq('tipo', 'nova_acusacao')
                .filter('dados->>codigoLance', 'eq', dadosDefesa.codigoLance)
                .single();
            
            if (fetchError || !acusacaoExistente) {
                console.error('❌ Acusação original não encontrada:', fetchError);
            } else {
                // Incorporar a defesa nos dados da acusação
                const dadosAtualizados = {
                    ...acusacaoExistente.dados,
                    defesa: {
                        defensor: dadosDefesa.defensor,
                        descricaoDefesa: dadosDefesa.descricaoDefesa,
                        videoLinkDefesa: dadosDefesa.videoLinkDefesa,
                        videoEmbedDefesa: dadosDefesa.videoEmbedDefesa,
                        dataEnvioDefesa: dadosDefesa.dataEnvio,
                    },
                    status: 'aguardando_analise', // Lance completo, pronto para júri
                };
                
                const { error: updateError } = await supabase
                    .from('notificacoes_admin')
                    .update({
                        dados: dadosAtualizados,
                        lido: false, // Marcar como não lido para admin ver a atualização
                    })
                    .eq('id', acusacaoExistente.id);
                
                if (updateError) {
                    console.error('❌ Erro ao atualizar acusação com defesa:', updateError);
                } else {
                    resultados.database = true;
                    console.log('✅ Acusação atualizada com defesa!');
                }
            }
        } catch (err) {
            console.error('❌ Exceção ao atualizar acusação:', err);
        }
    }

    // 2. Enviar via Telegram
    try {
        console.log('📤 Enviando defesa para Telegram...');
        resultados.telegram = await sendTelegramMessage(mensagemTelegram);
        
        // Enviar também via WhatsApp
        resultados.whatsapp = await sendWhatsAppMessage(mensagemTelegram);
    } catch (err) {
        console.error('❌ Falha ao enviar notificações:', err);
    }

    // 3. Notificar todos os jurados cadastrados quando status mudar para aguardando_analise
    try {
        console.log('👨‍⚖️ Buscando jurados ativos para notificação...');
        const { data: juradosAtivos, error: errorJurados } = await supabase
            .from('jurados')
            .select('nome, whatsapp, email_google')
            .eq('ativo', true)
            .not('whatsapp', 'is', null);
        
        if (!errorJurados && juradosAtivos && juradosAtivos.length > 0) {
            const codigoLance = dadosDefesa.codigoLance || 'N/A';
            const acusador = dadosDefesa.acusacaoOriginal?.acusador?.nome || dadosDefesa.acusacaoOriginal?.acusador?.gamertag || 'N/A';
            const acusado = dadosDefesa.defensor?.nome || dadosDefesa.defensor?.gamertag || 'N/A';
            const etapa = dadosDefesa.acusacaoOriginal?.etapa?.circuit 
                ? `${dadosDefesa.acusacaoOriginal.etapa.round} - ${dadosDefesa.acusacaoOriginal.etapa.circuit}`
                : (dadosDefesa.acusacaoOriginal?.etapa?.round || 'N/A');
            const grid = dadosDefesa.defensor?.grid?.toUpperCase() || 'N/A';
            
            const mensagemJurados = `👨‍⚖️ *NOVO LANCE PARA ANÁLISE - MASTER LEAGUE F1*\n\n` +
                `🔖 *Código:* ${codigoLance}\n` +
                `🏁 *Etapa:* ${etapa}\n` +
                `🏎️ *Grid:* ${grid}\n` +
                `👤 *Acusador:* ${acusador}\n` +
                `🎯 *Acusado:* ${acusado}\n\n` +
                `📋 *Acesse o Painel do Júri para analisar:*\n` +
                `🔗 ${SITE_URL}/painel-veredito\n\n` +
                `⏰ ${new Date().toLocaleString('pt-BR')}`;
            
            // Enviar notificação para cada jurado ativo
            let sucessosJurados = 0;
            for (const jurado of juradosAtivos) {
                if (jurado.whatsapp) {
                    try {
                        const result = await sendWhatsappNotification({
                            phone: jurado.whatsapp,
                            email: jurado.email_google || `${jurado.whatsapp}@masterleaguef1.com`,
                            nome: jurado.nome || 'Jurado',
                            message: mensagemJurados
                        });
                        
                        if (result.success) {
                            sucessosJurados++;
                            console.log(`✅ Notificação enviada para jurado ${jurado.nome}`);
                        } else {
                            console.warn(`⚠️ Erro ao enviar para jurado ${jurado.nome}:`, result.error);
                        }
                        
                        // Pequeno delay entre envios
                        await new Promise(resolve => setTimeout(resolve, 500));
                    } catch (err) {
                        console.error(`❌ Erro ao enviar notificação para jurado ${jurado.nome}:`, err);
                    }
                }
            }
            
            if (sucessosJurados > 0) {
                console.log(`📬 Notificações enviadas para ${sucessosJurados} jurado(s) sobre lance em aguardando_analise`);
            }
        } else {
            console.warn('⚠️ Nenhum jurado ativo encontrado ou sem WhatsApp configurado');
        }
    } catch (err) {
        console.error('⚠️ Erro ao enviar notificações para jurados:', err);
        // Não bloquear o fluxo principal se a notificação falhar
    }

    console.log('📊 Resultado das notificações de defesa:', resultados);
    return resultados;
}

