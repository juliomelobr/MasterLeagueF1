/**
 * Utilitários para autenticação via WhatsApp
 * Gerencia códigos de verificação e comunicação com Edge Function
 */

import { supabase } from '../supabaseClient';
import { FunctionsHttpError } from '@supabase/supabase-js';

/**
 * Mensagens técnicas do provedor (ex.: Z-API) → texto claro para o piloto.
 * "subscribe to this instance again" = instância Z-API sem assinatura ativa.
 */
export function humanizeWhatsappSendError(raw) {
    if (raw == null) return 'Erro desconhecido ao enviar o código.';
    const s = String(raw).trim();
    if (!s) return 'Erro desconhecido ao enviar o código.';
    if (/subscribe to this instance again/i.test(s)) {
        return (
            'O envio pelo WhatsApp está temporariamente indisponível: a instância Z-API da liga precisa de assinatura renovada ou reativação no painel da Z-API. ' +
            'Isto não indica problema com o seu telefone. Avise a administração da Master League F1.'
        );
    }
    if (/instance.*not.*connected|disconnected|instância.*desconect/i.test(s)) {
        return (
            'A conexão WhatsApp da liga com o provedor não está ativa (instância desconectada). ' +
            'Entre em contato com a administração.'
        );
    }
    return s;
}

/**
 * Extrai mensagem de erro real da resposta da Edge Function (quando retorna 4xx/5xx)
 * Ex: "Twilio não configurado", "Piloto não encontrado"
 */
async function extractErrorMessage(error) {
    if (error instanceof FunctionsHttpError && error.context) {
        try {
            const body = typeof error.context.json === 'function'
                ? await error.context.json()
                : error.context;
            if (body?.error && typeof body.error === 'string') return body.error;
        } catch (_) { /* ignorar */ }
    }
    return null;
}

/**
 * Solicita envio de código de verificação via WhatsApp
 * @param {string} email - Email do piloto
 * @param {string} whatsapp - Número do WhatsApp (formato: (11) 99999-9999 ou 11999999999)
 * @param {string} nomePiloto - Nome do piloto (opcional)
 * @param {boolean} skipPilotoCheck - Se true, não verifica se o piloto existe no banco (para cadastros novos)
 * @returns {Promise<{success: boolean, error?: string, code_id?: string}>}
 */
export async function requestVerificationCode(email, whatsapp, nomePiloto = null, skipPilotoCheck = false) {
    try {
        console.log('📱 Solicitando código de verificação...', { email, whatsapp, skipPilotoCheck });

        // Chamar Edge Function via supabase-js (evita depender de VITE_SUPABASE_URL/.env)
        const { data, error } = await supabase.functions.invoke('send-whatsapp-code', {
            body: {
                email: email.toLowerCase().trim(),
                whatsapp,
                nomePiloto,
                skipPilotoCheck, // Para ex-pilotos em cadastro, não verificar se existe no banco
            },
        });

        if (error) {
            console.error('❌ Erro ao solicitar código (invoke):', error);
            const status = error.status || error.code;

            // Tentar extrair mensagem real da Edge Function (ex: "Twilio não configurado", "Piloto não encontrado")
            const realError = await extractErrorMessage(error);

            // 404 geralmente significa função não deployada no projeto Supabase configurado
            if (String(status) === '404') {
                return {
                    success: false,
                    error: "Serviço de envio de código não configurado (HTTP 404). A Edge Function 'send-whatsapp-code' precisa ser deployada no Supabase.",
                };
            }

            return {
                success: false,
                error: humanizeWhatsappSendError(
                    realError || error.message || `Erro ao enviar código (HTTP ${status || 'desconhecido'}).`
                ),
            };
        }

        // Resposta 200 mas com success: false (defensivo)
        if (data?.success === false && data?.error) {
            return { success: false, error: humanizeWhatsappSendError(data.error) };
        }

        console.log('✅ Código solicitado com sucesso');
        return {
            success: true,
            code_id: data?.code_id, // Para debug - não usar em produção
        };

    } catch (error) {
        console.error('❌ Erro ao solicitar código:', error);
        return {
            success: false,
            error: humanizeWhatsappSendError(error.message || 'Erro ao conectar com servidor'),
        };
    }
}

/**
 * Valida código de verificação
 * @param {string} email - Email do piloto
 * @param {string} code - Código de 6 dígitos
 * @returns {Promise<{success: boolean, error?: string, valid?: boolean}>}
 */
export async function verifyCode(email, code) {
    try {
        const emailNormalized = email.toLowerCase().trim();
        const codeNormalized = code.trim().replace(/\D/g, ''); // Remove tudo que não é dígito
        
        console.log('🔍 Validando código...', { 
            email: emailNormalized, 
            codeInput: codeNormalized,
            codeLength: codeNormalized.length
        });

        // Primeiro, buscar todos os códigos ativos para este email (para debug)
        const { data: allCodes, error: debugError } = await supabase
            .from('whatsapp_verification_codes')
            .select('*')
            .eq('email', emailNormalized)
            .eq('used', false)
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false });

        if (debugError) {
            console.error('❌ Erro ao buscar códigos (debug):', debugError);
        } else {
            console.log(`📋 Códigos ativos encontrados para ${emailNormalized}:`, allCodes?.length || 0);
            if (allCodes && allCodes.length > 0) {
                console.log('📋 Códigos ativos:', allCodes.map(c => ({ 
                    code: c.code, 
                    created: c.created_at,
                    expires: c.expires_at 
                })));
            }
        }

        // Buscar código ativo no banco
        // Usar .maybeSingle() ao invés de .single() para evitar erro 406 quando não encontrar
        const { data: codeRecord, error: codeError } = await supabase
            .from('whatsapp_verification_codes')
            .select('*')
            .eq('email', emailNormalized)
            .eq('code', codeNormalized)
            .eq('used', false)
            .gt('expires_at', new Date().toISOString()) // Apenas códigos não expirados
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(); // Usa maybeSingle() ao invés de single() para evitar erro 406

        if (codeError) {
            console.error('❌ Erro ao buscar código:', codeError);
            return {
                success: false,
                valid: false,
                error: 'Erro ao validar código. Tente novamente.',
            };
        }

        if (!codeRecord) {
            console.error('❌ Código não encontrado ou inválido', {
                emailBuscado: emailNormalized,
                codigoBuscado: codeNormalized,
                codigoLength: codeNormalized.length
            });
            return {
                success: false,
                valid: false,
                error: 'Código inválido ou não encontrado. Verifique se digitou corretamente.',
            };
        }

        console.log('✅ Código encontrado no banco:', {
            codeId: codeRecord.id,
            codeStored: codeRecord.code,
            codeInput: codeNormalized,
            match: codeRecord.code === codeNormalized
        });

        // Verificar se expirou
        const expiresAt = new Date(codeRecord.expires_at);
        const now = new Date();

        if (now > expiresAt) {
            console.error('❌ Código expirado', {
                expiresAt: expiresAt.toISOString(),
                now: now.toISOString(),
                diffMinutes: (now - expiresAt) / 1000 / 60
            });
            // Marcar como usado mesmo que tenha expirado
            await supabase
                .from('whatsapp_verification_codes')
                .update({ used: true })
                .eq('id', codeRecord.id);

            return {
                success: false,
                valid: false,
                error: 'Código expirado. Solicite um novo código.',
            };
        }

        // Verificar tentativas (máximo 5 tentativas)
        if (codeRecord.attempts >= 5) {
            console.error('❌ Muitas tentativas inválidas', { attempts: codeRecord.attempts });
            await supabase
                .from('whatsapp_verification_codes')
                .update({ used: true })
                .eq('id', codeRecord.id);

            return {
                success: false,
                valid: false,
                error: 'Muitas tentativas inválidas. Solicite um novo código.',
            };
        }

        // Código válido! Marcar como usado
        await supabase
            .from('whatsapp_verification_codes')
            .update({ 
                used: true,
                // Não incrementa attempts em caso de sucesso
                attempts: codeRecord.attempts,
            })
            .eq('id', codeRecord.id);

        console.log('✅ Código validado com sucesso', {
            codeId: codeRecord.id,
            email: emailNormalized
        });
        return {
            success: true,
            valid: true,
        };

    } catch (error) {
        console.error('❌ Erro ao validar código:', error);
        return {
            success: false,
            valid: false,
            error: error.message || 'Erro ao validar código',
        };
    }
}

/**
 * Incrementa tentativas de código (para rastreamento de segurança)
 * @param {string} email - Email do piloto
 * @param {string} code - Código que foi tentado (mesmo que inválido)
 */
export async function incrementCodeAttempts(email, code) {
    try {
        const { data: codeRecord } = await supabase
            .from('whatsapp_verification_codes')
            .select('*')
            .eq('email', email.toLowerCase().trim())
            .eq('code', code.trim())
            .eq('used', false)
            .gt('expires_at', new Date().toISOString()) // Apenas códigos não expirados
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(); // Usa maybeSingle() ao invés de single()

        if (codeRecord) {
            await supabase
                .from('whatsapp_verification_codes')
                .update({ attempts: codeRecord.attempts + 1 })
                .eq('id', codeRecord.id);
        }
    } catch (error) {
        console.warn('⚠️ Erro ao incrementar tentativas:', error);
    }
}

/**
 * Formata número de WhatsApp para exibição
 * @param {string} phone - Número do telefone
 * @returns {string} - Formato: (11) 99999-9999
 */
export function formatWhatsAppDisplay(phone) {
    if (!phone) return '';
    const numbers = phone.replace(/\D/g, '');
    if (numbers.length < 10) return phone;
    
    // Remove código do país se presente
    let clean = numbers;
    if (numbers.startsWith('55') && numbers.length > 11) {
        clean = numbers.substring(2);
    }
    
    // Aplica máscara (00) 00000-0000
    if (clean.length === 11) {
        return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
    } else if (clean.length === 10) {
        return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
    }
    
    return phone;
}

/**
 * Limpa número de WhatsApp para envio (apenas números)
 * @param {string} phone - Número do telefone
 * @returns {string} - Formato: 5511999999999
 */
export function cleanWhatsAppNumber(phone) {
    if (!phone) return '';
    const numbers = phone.replace(/\D/g, '');
    
    // Se começar com 0, remove
    if (numbers.startsWith('0')) {
        return numbers.substring(1);
    }
    
    // Se não começar com 55 (código do Brasil), adiciona
    if (!numbers.startsWith('55') && numbers.length >= 10) {
        return '55' + numbers;
    }
    
    return numbers;
}





