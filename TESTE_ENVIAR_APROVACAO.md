# Teste de Envio de Aprovação para Ex-Piloto

## Dados do Teste
- **Email:** juliomelobr@hotmail.com
- **Nome:** Alonso Meloso
- **WhatsApp:** 5551983433940

## Como Testar

### Opção 1: No Console do Navegador (página Admin)

1. Acesse a página `/admin`
2. Abra o Console do Navegador (F12 → Console)
3. Cole o código abaixo e pressione Enter:

```javascript
(async () => {
    const email = 'juliomelobr@hotmail.com';
    const nome = 'Alonso Meloso';
    const whatsapp = '5551983433940';
    
    const siteUrl = 'https://www.masterleaguef1.com.br';
    const loginUrl = `${siteUrl}/ex-piloto/login`;

    const mensagem = `✅ *ACESSO LIBERADO - MASTER LEAGUE F1*\n\nOlá ${nome},\n\nSeu acesso ao Painel do Piloto foi *APROVADO*!\n\n📋 *CADASTRE SUA SENHA E ACESSE:*\n\n🔗 Link direto: ${loginUrl}\n\n📝 *Passos:*\n\n1️⃣ Clique no link acima\n\n2️⃣ Digite seu e-mail:\n   ${email}\n\n3️⃣ Valide seu WhatsApp com o código que será enviado\n\n4️⃣ Crie sua senha de acesso\n\n5️⃣ Pronto! Você terá acesso ao seu painel histórico\n\n🏎️ Reveja a sua história na Master League F1`;
    
    const whatsappLimpo = whatsapp.replace(/\D/g, '');
    
    console.log('📤 Enviando mensagem...', { email, nome, whatsapp: whatsappLimpo });
    
    try {
        const { data, error } = await supabase.functions.invoke('send-whatsapp-code', {
            body: {
                email: email,
                whatsapp: whatsappLimpo,
                nomePiloto: nome,
                tipo: 'notificacao_aprovacao',
                mensagemCustomizada: mensagem
            }
        });
        
        if (error) {
            console.error('❌ Erro:', error);
            alert('❌ Erro: ' + JSON.stringify(error));
        } else {
            console.log('✅ Enviado!', data);
            alert('✅ Mensagem enviada com sucesso!');
        }
    } catch (err) {
        console.error('❌ Erro:', err);
        alert('❌ Erro: ' + err.message);
    }
})();
```

### Opção 2: Via Painel Admin (Botão de Aprovar)

1. Acesse `/admin`
2. Localize o ex-piloto "Alonso Meloso" (ou qualquer outro com status PENDENTE)
3. Clique no botão ✅ (Aprovar Ex-Piloto)
4. Confirme a aprovação
5. A mensagem será enviada automaticamente

## Verificação

Após o envio, verifique:
- ✅ Console do navegador para logs
- ✅ WhatsApp do número `5551983433940` para receber a mensagem
- ✅ A mensagem deve conter o link direto: `https://www.masterleaguef1.com.br/ex-piloto/login`

## Link Direto na Mensagem

A mensagem agora inclui um link direto:
```
🔗 Link direto: https://www.masterleaguef1.com.br/ex-piloto/login
```

O ex-piloto pode clicar diretamente neste link para:
1. Digitar o email
2. Validar WhatsApp
3. Criar senha
4. Acessar o painel




































