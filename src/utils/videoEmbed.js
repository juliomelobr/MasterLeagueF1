/**
 * Função universal para converter URLs de vídeo em URLs de embed
 * Suporta: YouTube, Vimeo, Dailymotion, Streamable, Twitch, e outras plataformas
 */
export function getVideoEmbedUrl(url) {
    if (!url || typeof url !== 'string') return null;
    
    const cleanUrl = url.trim();
    
    // YouTube Clips (devem ser verificados ANTES dos vídeos normais)
    // Formato: youtube.com/clip/CLIP_ID ou youtube.com/clip/CLIP_ID?si=...
    // Nota: YouTube Clips não podem ser embedados diretamente, mas retornamos null
    // para que o componente VideoEmbed trate especificamente
    const ytClipMatch = cleanUrl.match(/youtube\.com\/clip\/([a-zA-Z0-9_-]+)/);
    if (ytClipMatch) {
        // Retornar null para que o componente VideoEmbed detecte e trate como Clip
        // O componente verifica videoLink.includes('/clip/') para mostrar card especial
        return null;
    }
    
    // YouTube (incluindo Shorts)
    // Suporta: youtube.com/watch?v=, youtube.com/embed/, youtube.com/v/, youtu.be/, youtube.com/shorts/
    const ytMatch = cleanUrl.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (ytMatch) {
        const videoId = ytMatch[1];
        // Verificar se é um Short
        const isShort = cleanUrl.includes('/shorts/');
        // Para Shorts, usar o formato de embed padrão (funciona normalmente)
        return `https://www.youtube.com/embed/${videoId}`;
    }
    
    // Vimeo
    const vimeoMatch = cleanUrl.match(/(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/);
    if (vimeoMatch) {
        return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    }
    
    // Dailymotion
    const dailymotionMatch = cleanUrl.match(/(?:dailymotion\.com\/video\/|dai\.ly\/)([a-zA-Z0-9]+)/);
    if (dailymotionMatch) {
        return `https://www.dailymotion.com/embed/video/${dailymotionMatch[1]}`;
    }
    
    // Streamable
    const streamableMatch = cleanUrl.match(/streamable\.com\/([a-zA-Z0-9]+)/);
    if (streamableMatch) {
        return `https://streamable.com/e/${streamableMatch[1]}`;
    }
    
    // Twitch (vídeos)
    const twitchVideoMatch = cleanUrl.match(/twitch\.tv\/videos\/(\d+)/);
    if (twitchVideoMatch) {
        const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
        return `https://player.twitch.tv/?video=${twitchVideoMatch[1]}&parent=${hostname}`;
    }
    
    // Twitch (clips)
    const twitchClipMatch = cleanUrl.match(/twitch\.tv\/(?:.*\/clip\/|clips\.twitch\.tv\/)([a-zA-Z0-9_-]+)/);
    if (twitchClipMatch) {
        const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
        return `https://clips.twitch.tv/embed?clip=${twitchClipMatch[1]}&parent=${hostname}`;
    }
    
    // Facebook Watch
    const facebookMatch = cleanUrl.match(/facebook\.com\/watch\/\?v=(\d+)/);
    if (facebookMatch) {
        return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(cleanUrl)}&show_text=0&width=560`;
    }
    
    // TikTok (embed)
    const tiktokMatch = cleanUrl.match(/tiktok\.com\/@[\w.]+\/video\/(\d+)/);
    if (tiktokMatch) {
        return `https://www.tiktok.com/embed/v2/${tiktokMatch[1]}`;
    }
    
    // Loom
    const loomMatch = cleanUrl.match(/loom\.com\/share\/([a-zA-Z0-9]+)/);
    if (loomMatch) {
        return `https://www.loom.com/embed/${loomMatch[1]}`;
    }
    
    // Wistia
    const wistiaMatch = cleanUrl.match(/wistia\.(?:net|com)\/(?:medias|embed)\/([a-zA-Z0-9]+)/);
    if (wistiaMatch) {
        return `https://fast.wistia.net/embed/iframe/${wistiaMatch[1]}`;
    }
    
    // Google Drive
    // Formato: https://drive.google.com/file/d/FILE_ID/view ou /open?id=FILE_ID
    const driveFileMatch = cleanUrl.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (driveFileMatch) {
        return `https://drive.google.com/file/d/${driveFileMatch[1]}/preview`;
    }
    
    // Google Drive - formato com ?id=
    const driveIdMatch = cleanUrl.match(/drive\.google\.com\/.*[?&]id=([a-zA-Z0-9_-]+)/);
    if (driveIdMatch) {
        return `https://drive.google.com/file/d/${driveIdMatch[1]}/preview`;
    }
    
    // Google Drive - formato direto com /uc?id=
    const driveUcMatch = cleanUrl.match(/drive\.google\.com\/uc[?&]id=([a-zA-Z0-9_-]+)/);
    if (driveUcMatch) {
        return `https://drive.google.com/file/d/${driveUcMatch[1]}/preview`;
    }
    
    // Steam CDN (cdn.steamusercontent.com)
    // URLs do Steam CDN são links diretos para arquivos de vídeo
    if (cleanUrl.includes('cdn.steamusercontent.com')) {
        // Retornar a URL original para usar com tag <video> HTML5
        return cleanUrl;
    }
    
    // Se já for uma URL de embed válida, retornar como está
    if (cleanUrl.includes('/embed/') || cleanUrl.includes('iframe')) {
        return cleanUrl;
    }
    
    // Se não reconhecer, retornar null (será exibido como link)
    return null;
}

/**
 * Verifica se uma URL é de vídeo suportado para embed
 */
export function isVideoUrlSupported(url) {
    return getVideoEmbedUrl(url) !== null;
}

