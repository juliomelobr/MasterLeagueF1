/**
 * Utilitário para verificar se o horário atual está dentro do horário comercial
 * Horário comercial: Segunda a Sexta, das 08:00 às 18:00 (Fuso de Brasília)
 */

function getCurrentBRT() {
    const now = new Date();
    // Converte para string no fuso de SP e cria um novo objeto Date
    const brtString = now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" });
    return new Date(brtString);
}

export function isBusinessHours() {
    const brtNow = getCurrentBRT();
    const dayOfWeek = brtNow.getDay(); // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
    const hours = brtNow.getHours();

    // Fim de semana (Sábado = 6, Domingo = 0)
    if (dayOfWeek === 0 || dayOfWeek === 6) {
        return false;
    }

    // Segunda a Sexta, das 08:00 às 17:59
    return hours >= 8 && hours < 18;
}

/**
 * Retorna uma mensagem amigável caso não seja horário comercial
 */
export function getBusinessHoursMessage() {
    return "Notificações silenciadas (fora do horário comercial: Seg-Sex, 08h-18h).";
}
