## Objetivo

Tornar quase todo o conteúdo da campanha editável pelo painel admin, organizar a aba Configurações em blocos, adicionar abas "Imagens" e "Campanhas anteriores", padronizar rodapé/título em todo o site e corrigir a ausência de confirmação ao salvar.

## 1. Backend — Storage + Settings

- Criar bucket público `campaign-images` para imagens do banner e das campanhas anteriores, com políticas: leitura pública; upload/alteração/exclusão apenas para usuários autenticados (o admin já faz `signInWithPassword` no login, então tem sessão válida).
- Garantir restrição `unique` na coluna `key` de `site_settings`.
- Semear linhas padrão em `site_settings` para as novas chaves (com os valores atuais como default).

Novas chaves em `site_settings` (jsonb):
- `quantity_options` → lista de `{ qty, popular }` (até 6 cards; padrão 50/250/500/1000)
- `prize_banner` → `{ texto }` ("SÃO 20 MIL REAIS DIRETO NO SEU PIX!")
- `regulamento` → `{ texto }` (texto editável; default = regulamento atual)
- `site_title` → `{ texto }` ("Seu Sorteio | Campanhas")
- `campaign_name` → `{ nome }` (ex.: "20.000,00 no seu PIX!")
- `total_cotas` → `{ quantidade }` (mín 100, máx 9.999.999)
- `banner_images` → lista de URLs (até 6) — usadas no carrossel da home e na campanha ativa
- `campanhas_anteriores` → lista de `{ nome, descricao, imagem, data, cotaGanhadora, nomeGanhador }`

## 2. Edge function `admin-dashboard`

- Trocar `update-site-setting` de `update` para **upsert** por `key` (hoje falha silenciosamente quando a chave não existe).
- `public-all` já devolve todas as settings — sem mudança estrutural.

## 3. Frontend — padronização global

- Criar `SiteFooter` (lê settings) com "Desenvolvido por" + logo `novologoOD.png`, renderizado **uma vez** em `App.tsx` (vale para todas as páginas). Remover os rodapés locais de `Index` e `Campanhas`.
- Criar hook leve para ler `site_title` e usar nos cabeçalhos das páginas (Index, Checkout, Resumo, Pagamento, Campanhas) — título único e editável refletido em todo o site.

## 4. Página inicial (`Index.tsx`)

- Cards de quantidade vindos de `quantity_options`.
- Banner "20 mil reais" vindo de `prize_banner.texto`.
- Bloco Descrição/Regulamento exibindo `regulamento.texto` (render com quebras de linha), com fallback ao texto atual.
- Carrossel usando `banner_images`.

## 5. Página `Campanhas.tsx`

- Nome da campanha ativa e textos vindos de `campaign_name` + `banner_images` (mesmas imagens da aba Imagens).
- Lista "Campanhas anteriores" vinda de `campanhas_anteriores`.

## 6. Página `Resumo.tsx`

- Campo "Campanha:" em Informações da compra usando `campaign_name`.

## 7. Painel admin — abas e blocos

Aba **Configurações** reorganizada em blocos visuais separados, cada um com botão Salvar + confirmação (toast):
1. Identidade do site — `site_title`, `campaign_name`
2. Cards de quantidade — adicionar/remover até 6 cards (qty + marcar "popular")
3. Banner de prêmio — `prize_banner.texto`
4. Total de cotas — `total_cotas` (validação 100–9.999.999)
5. Descrição/Regulamento — `regulamento.texto`
6. Progress Bar (existente)
7. Mini Banner (existente)

Nova aba **Imagens**:
- Upload de até 6 imagens (formatos comuns Android/iPhone: jpg, png, webp, heic→aviso) para `campaign-images`; salvas em `banner_images`. Essas imagens alimentam o carrossel da home e a campanha ativa em Campanhas.

Nova aba **Campanhas anteriores**:
- Form para inserir campanha passada (nome, descrição, data, cota ganhadora, nome do ganhador) + upload de 1 imagem (card pequeno). Lista com exclusão. Salva em `campanhas_anteriores`.

## 8. Confirmações ao salvar

Adicionar `toast.success`/`toast.error` (sonner) em **todos** os botões Salvar do painel (Progress Bar, Mini Banner e todos os novos blocos), já que hoje não há feedback.

## Detalhes técnicos

- `update-site-setting` vira upsert com `onConflict: "key"`.
- Uploads via `supabase.storage.from('campaign-images').upload()` usando a sessão autenticada do admin; URL pública via `getPublicUrl`.
- Settings lidas no front via `usePublicData` (já existente, com cache) — sem nova infra de fetch.
- Defaults no front garantem que, se uma chave ainda não existir, a UI mostra os valores atuais.
