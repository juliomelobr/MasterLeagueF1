import { supabase } from '../supabaseClient';

export const ADMIN_WHATSAPP = '5551983433940';
export const ADMIN_EMAIL_FALLBACK = 'admin@masterleaguef1.com';

export const normalizePhone = (phone) => (phone ? phone.replace(/\D/g, '') : '');

/**
 * Envia notificação de WhatsApp via Edge Function `send-whatsapp-code`.
 * Usa o caminho de notificação já existente (tipo notificacao_aprovacao) para suportar Twilio/Z-API.
 */
export async function sendWhatsappNotification({ phone, email, nome, message }) {
    const whatsapp = normalizePhone(phone);
    if (!whatsapp || !message) {
        return { success: false, error: 'whatsapp ou mensagem ausentes' };
    }

    try {
        const { data, error } = await supabase.functions.invoke('send-whatsapp-code', {
            body: {
                email: email || `${whatsapp}@masterleaguef1.com`,
                whatsapp,
                nomePiloto: nome || 'Piloto',
                // Reaproveita o caminho de "notificação" já implementado na Edge Function
                // (não gera código; envia mensagemCustomizada diretamente).
                tipo: 'notificacao_aprovacao',
                skipPilotoCheck: true,
                mensagemCustomizada: message,
            },
        });

        if (error || data?.success === false) {
            return { success: false, error: error?.message || data?.error || 'Erro desconhecido' };
        }

        return { success: true, data };
    } catch (err) {
        return { success: false, error: err?.message || 'Falha ao enviar WhatsApp' };
    }
}

