# 🖼️ Como Adicionar Imagens nas Notícias - Guia Rápido

## ❌ O que NÃO funciona

**Não é possível colar imagens diretamente na planilha** e usar no site porque:
- Quando exportamos como CSV, apenas texto é exportado
- Imagens inseridas no Google Sheets não são incluídas no CSV
- O CSV não suporta imagens

## ✅ Solução Recomendada (Melhor): Upload direto no site via Supabase Storage

Se você quer **atualizar imagens sem redeploy no Netlify** e sem copiar link, use **Supabase Storage**.

### O que você ganha

- **Sem deploy**: trocou a imagem, ela aparece no site.
- **Sem link**: você só faz upload.
- **Nome fixo**: `noticia1`, `noticia2`, `noticia3`… (substitui a anterior).

### Pré-requisitos no Supabase (1 vez só)

1. **Storage > Create bucket**: crie o bucket `noticias` (pode ser public).
2. **Database**: crie a tabela `news_images` para “versão” de cache:

```sql
create table if not exists public.news_images (
  slot int primary key,
  updated_at timestamptz not null default now()
);
```

3. **Permissões (RLS/Policies)**:
- Para o site conseguir **ler**: permita `select` na tabela `news_images` e acesso público ao bucket `noticias`.
- Para o admin conseguir **enviar**: permita `insert/update` em `news_images` e `upload` no bucket (ideal: só para admin/autenticado).

### Como usar (no site)

1. Vá em **Admin > aba NOTÍCIAS**
2. Coloque o **ID da notícia** (1, 2, 3…)
3. Selecione a imagem e envie
4. Pronto — o feed usa `noticia{ID}` automaticamente.

---

## ✅ Solução Alternativa (Legado): Usar Links do Google Drive

### Passo a Passo Simples

1. **Faça upload da imagem no Google Drive**
   ```
   - Acesse drive.google.com
   - Arraste a imagem ou clique em "Novo" > "Upload de arquivo"
   ```

2. **Obtenha o link**
   ```
   - Clique com botão direito na imagem
   - "Obter link" ou "Compartilhar"
   - Altere para "Qualquer pessoa com o link"
   - Copie o link
   ```

3. **Converta o link**
   
   **Link original:**
   ```
   https://drive.google.com/file/d/1ABC123xyz/view?usp=sharing
   ```
   
   **Extraia o ID** (parte entre `/d/` e `/view`):
   ```
   1ABC123xyz
   ```
   
   **Use este formato na planilha:**
   ```
   https://drive.google.com/uc?export=view&id=1ABC123xyz
   ```

4. **Cole na coluna `image` da planilha**

---

## 📝 Exemplo Prático

**Na planilha:**

| id | title | excerpt | date | category | image | featured |
|----|-------|---------|------|----------|-------|----------|
| 1 | Final da Minicup | Descrição... | 20 Jan 2025 | Minicup | `https://drive.google.com/uc?export=view&id=1aBcDeFgHiJkLmNoPqRsTuVwXyZ123456` | true |

---

## 💡 Dica Pro

**Você pode colar a imagem na planilha para referência visual**, mas **sempre coloque o link do Google Drive na coluna `image`** para funcionar no site!

**Workflow:**
1. Coloque a imagem na planilha (só para você ver)
2. Faça upload no Google Drive
3. Cole o link formatado na coluna `image`
4. Pronto! ✅

---

## 🔧 Ferramenta Rápida: Converter Link

Se você tem o link do Google Drive, use esta fórmula mental:

**De:**
```
https://drive.google.com/file/d/ID_AQUI/view?usp=sharing
```

**Para:**
```
https://drive.google.com/uc?export=view&id=ID_AQUI
```

**Apenas copie o ID e cole no formato novo!**

---

## ❓ Problemas Comuns

### Imagem não aparece no site
- ✅ Verifique se o link está no formato correto
- ✅ Confirme que a imagem está compartilhada como "Qualquer pessoa com o link"
- ✅ Teste o link diretamente no navegador

### Como saber se o link está correto?
Abra o link no navegador. Se a imagem aparecer diretamente, está correto! ✅

---

**Pronto! Agora você sabe como adicionar imagens nas notícias!** 🎉



