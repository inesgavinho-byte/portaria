# Checklist de Testes Manuais — pós-migrations

Validação de ponta a ponta depois de aplicar as migrations 0002–0005 no
Supabase real. Executar por ordem: cada secção assume a anterior verde.

**Regra:** um teste só passa quando o resultado esperado se verifica
exatamente. Qualquer desvio é registado antes de continuar.

---

## 0. Pré-requisitos

- [ ] Migrations aplicadas **por ordem** no SQL Editor: `0002` → `0003` → `0004` → `0005`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` definida no ambiente do hosting
- [ ] Auth → URL Configuration: `https://<domínio>/auth/confirm` nos Redirect URLs
- [ ] Auth → Email Templates *Invite* e *Reset Password* com formato token_hash:
      `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next=/convite`
      e `…&type=recovery&next=/recuperar/confirmar`
- [ ] Contas de teste: **Admin A** (admin do tenant Europa) e dois emails
      virgens acessíveis (**Novo1**, **Novo2**)
- [ ] Segundo tenant fictício criado via SQL (para testes de isolamento),
      com **Admin B** próprio

---

## 1. Auth

- [ ] **Recuperação de password** — Em `/login` → "Esqueceu a palavra-passe?"
      → email de Admin A → mensagem neutra aparece → email chega → link abre
      `/recuperar/confirmar` → nova password (≥8) → entra em `/avisos` →
      logout → login com a password nova funciona.
- [ ] **Recuperação com email inexistente** — mesma mensagem neutra, nenhum
      email chega. (Não se revela se a conta existe.)
- [ ] **Convite a novo utilizador** — Admin A convida Novo1 (fração + papel
      condómino) → convite aparece em "Convites pendentes" → email chega →
      link abre `/convite` → define password → entra em `/avisos` → membro
      aparece na lista com fração e papel corretos; convite sai dos pendentes.
- [ ] **Convite a utilizador existente** — Admin A convida o email de um
      utilizador já registado noutro tenant → associação imediata (aparece
      logo em membros, sem passar por pendentes).
- [ ] **Convite expirado** — Criar convite a Novo2; no SQL Editor:
      `update convites set expira_em = now() - interval '1 day' where email = '<novo2>';`
      → Novo2 define password pelo link → **não** ganha acesso ao tenant
      (login não entra em `/avisos`; redireciona para login).
- [ ] **Convite aberto por email diferente** — Com sessão de outro utilizador
      (email ≠ convite), correr o fluxo `/convite` → o membership **não** é
      criado para esse utilizador (a função só aceita convites do próprio email).
- [ ] **Reset de password em browser diferente** — Pedir recuperação no
      browser X, abrir o link no browser Y (ou modo anónimo) → funciona.
      (Este teste valida o template token_hash; com o template default
      falharia — é esperado.)
- [ ] **Link inválido/reutilizado** — Abrir o mesmo link de email duas vezes →
      segunda vez cai em `/login?erro=link` com mensagem clara.

---

## 2. Membros

- [ ] **Admin vê membros** — `/configuracao/membros` lista todos com email,
      papel e fração.
- [ ] **Admin convida membro** — (coberto em 1) formulário valida email
      inválido e convite pendente duplicado com mensagens claras.
- [ ] **Admin anula convite** — botão ×, confirmação em dois toques → convite
      desaparece; o link do email deixa de dar acesso ao tenant.
- [ ] **Admin remove membro** — dois toques → membro desaparece; esse
      utilizador deixa de conseguir ver avisos/documentos do tenant.
- [ ] **Admin não se remove a si próprio** — o botão de remover não aparece
      na própria linha.
- [ ] **Último admin é intocável** — Com um só admin, tentar remover esse
      admin através de outro admin acabado de promover e despromovido…
      (cenário mínimo: criar 2.º admin, remover o 1.º ✓; depois tentar
      remover o único restante → erro "pelo menos um administrador").
- [ ] **Condómino não acede** — utilizador condómino em `/configuracao/membros`
      → redirecionado para `/avisos`.

---

## 3. Ocorrências

- [ ] **Condómino cria ocorrência com foto** — `/ocorrencias/nova` com 2
      fotografias JPEG → redireciona para o detalhe; fotos visíveis; timeline
      mostra "Ocorrência criada" e "Fotografia adicionada".
- [ ] **Condómino vê a sua ocorrência** — `/ocorrencias` lista só as dele
      (criar uma com Admin A e confirmar que o condómino não a vê).
- [ ] **Admin vê todas** — `/configuracao/ocorrencias` mostra as de todos os
      membros; filtro por estado funciona.
- [ ] **Admin altera estado** — novo → em curso → resolvido; timeline regista
      cada mudança ("Ocorrência resolvida" no último); condómino vê o novo
      estado e a timeline.
- [ ] **Admin adiciona nota interna** — nota aparece na timeline do admin.
- [ ] **Condómino NÃO vê nota interna** — no detalhe do condómino, a timeline
      não contém a nota (verificar também na resposta de rede/HTML, não só
      no visual — a exclusão é feita pelo RLS).
- [ ] **Upload inválido rejeitado** — tentar juntar um .pdf como fotografia →
      erro claro; ficheiro >5 MB → erro claro.

---

## 4. Isolamento multi-tenant (o teste mais importante)

- [ ] Admin B (tenant fictício) **não vê** avisos, documentos, ocorrências,
      membros nem convites do Europa — nem por URL direto de detalhe
      (`/configuracao/ocorrencias/<id-do-europa>` → não encontrado).
- [ ] Condómino do Europa não vê nada do tenant fictício.
- [ ] Download de foto de ocorrência do Europa com sessão de Admin B (copiar
      URL assinado expirado/forjar path) → negado.

---

## 5. Regressões rápidas

- [ ] Site público (`/`, `/historia`, `/contactos`, `/login`) abre **sem
      sessão** (valida a política pública de tenants da 0003).
- [ ] Aviso com HTML malicioso — colar `<img src=x onerror=alert(1)>` no
      editor via devtools/form → gravado sem o payload; nenhum alert em
      `/avisos`.
- [ ] Upload de documento .exe/.html → rejeitado com mensagem.
- [ ] Security headers presentes (devtools → Network → response headers:
      CSP, X-Frame-Options, HSTS).
- [ ] Fluxos principais no telemóvel (login, ver avisos, criar ocorrência
      com foto da câmara).

---

*Resultado: __ / __ passados · Data: ______ · Testado por: ______*
