# 📰 Como Funciona o Sistema de Notícias

## 🎯 Estrutura Final:

### **Home (Página Inicial)**
- ✅ Feed de resumos do **Google Sheets** (como era antes)
- ✅ Ao clicar "Ler mais":
  - Se existe notícia com mesmo ID no Supabase → vai para `/noticias/:id`
  - Se não existe → usa o link da planilha (ou vai para `/noticias`)
- ✅ Botão "Ver Todas" → vai para `/noticias` (portal)

### **Portal de Notícias** (`/noticias`)
- ✅ Lista **todas as notícias do Supabase**
- ✅ Design moderno com filtros por categoria
- ✅ Ao clicar em uma notícia → vai para `/noticias/:id`

### **Notícia Completa** (`/noticias/:id`)
- ✅ Exibe a notícia completa do Supabase
- ✅ Hero com imagem
- ✅ Título + Subtítulo
- ✅ Conteúdo formatado (negrito, parágrafos)
- ✅ Compartilhamento social

---

## 🔄 Fluxos de Navegação:

### Fluxo 1: Home → Notícia Completa
```
Home (resumo do Sheets) 
  → Clicar "Ler mais"
  → Verifica se ID existe no Supabase
  → Se SIM: /noticias/:id (página completa)
  → Se NÃO: link externo do Sheets
```

### Fluxo 2: Home → Portal → Notícia
```
Home 
  → Clicar "Ver Todas"
  → /noticias (portal)
  → Clicar em qualquer notícia
  → /noticias/:id (página completa)
```

### Fluxo 3: Direto para Portal
```
Menu ou URL direta
  → /noticias (lista todas do Supabase)
  → Filtrar por categoria
  → Clicar na notícia
  → /noticias/:id
```

---

## 📝 Workflow de Publicação:

### Para publicar uma notícia completa:

#### **1. Criar resumo no Google Sheets:**
```
ID: 1
Título: Yuri Rodrigues conquista o título da Minicup ML1
Resumo: A Master League F1 encerrou nesta semana o seu torneio...
Data: 23/12/25
Categoria: Minicup
Featured: true
Link: (deixe vazio)
```

#### **2. Criar matéria completa no Supabase:**
```
Admin → NOTÍCIAS → CMS → Nova Notícia

ID: 1 (mesmo ID do Sheets!)
Título: Yuri Rodrigues conquista o título da Minicup ML1
Subtítulo: Piloto vence por apenas 2 pontos após disputa eletrizante
Resumo: (pode deixar igual ao Sheets ou resumir mais)
Conteúdo Completo: [matéria completa com **negrito**]
Categoria: Minicup
```

#### **3. Upload da imagem:**
```
Admin → NOTÍCIAS → Upload de Imagens
ID: 1
Selecionar imagem → Enviar
```

#### **4. Resultado:**
```
✅ Home: Mostra o resumo do Sheets
✅ Clicar "Ler mais": Vai para /noticias/1 (matéria completa do Supabase)
✅ Portal (/noticias): Lista a notícia completa
```

---

## 💡 Vantagens deste Sistema:

### Google Sheets (Home):
- ✅ Fácil de atualizar (planilha)
- ✅ Resumos rápidos
- ✅ Não precisa login no Admin
- ✅ Sistema conhecido

### Supabase (Portal e Páginas Completas):
- ✅ Matérias completas com formatação profissional
- ✅ Subtítulos e negritos
- ✅ Upload de imagens integrado
- ✅ Design editorial moderno
- ✅ Compartilhamento social
- ✅ Categorias personalizadas

---

## 🎨 Exemplo Prático:

### Na Planilha (Google Sheets):
```
ID: 1
Título: Yuri Rodrigues é campeão da Minicup
Resumo: Piloto venceu após disputa eletrizante com apenas 2 pontos de diferença.
Data: 23/12/25
Featured: true
```

### No Supabase (via Admin CMS):
```
ID: 1 (mesmo!)
Título: Yuri Rodrigues é campeão da Minicup
Subtítulo: Disputa foi decidida por 2 pontos após 6 corridas

Conteúdo Completo:
**O Caminho para o Título**

A Minicup foi dividida em três etapas duplas...

**Rodadas 1 e 2**
O torneio começou com equilíbrio...

**A Grande Final**
A decisão ficou para Silverstone e Ímola...
```

### Resultado:
- **Home:** Card com resumo curto
- **Clicar "Ler mais":** Abre `/noticias/1` com matéria completa
- **Portal (`/noticias`):** Lista todas as notícias do Supabase

---

## 🚀 Seu Sistema Agora:

| Local | Fonte | Função |
|-------|-------|--------|
| **Home (feed)** | Google Sheets | Resumos rápidos |
| **Portal (`/noticias`)** | Supabase | Lista completa de matérias |
| **Notícia (`/noticias/:id`)** | Supabase | Matéria completa formatada |

---

## ✅ O Melhor dos Dois Mundos:

- 🎯 **Rapidez:** Edite resumos no Google Sheets
- 📝 **Qualidade:** Crie matérias completas no Supabase
- 🔗 **Integração:** IDs iguais conectam automaticamente

---

**Sistema publicado e funcionando!** 🎉

Acesse: https://masterleaguef1.com.br





















