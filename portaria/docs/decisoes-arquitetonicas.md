# Architectural Decision Record

Registo das decisões arquitetónicas tomadas no início do projeto, para
referência futura quando surgirem dúvidas sobre o "porquê".

---

## ADR-001: Multi-tenant desde o início

**Decisão:** A plataforma é multi-tenant desde o primeiro commit, mesmo que
exista apenas um tenant (Edifício Europa) no arranque.

**Contexto:** O projeto nasce para resolver as necessidades de um condomínio
específico, mas com objetivo declarado de evoluir para servir outros prédios
(potencialmente da carteira GAVINHO ou comercializável como SaaS).

**Alternativas consideradas:**
- Site monolítico só do Europa, refatorar mais tarde — rejeitado: refactor
  multi-tenant em produção é doloroso.
- SaaS de mercado existente — rejeitado: queremos personalização e controlo.

**Consequências:**
- Maior complexidade inicial (RLS, identificação por hostname, scoping em queries).
- Cada decisão de schema tem que considerar o `tenant_id`.
- Compensa a partir do segundo prédio.

---

## ADR-002: Identificação de tenant por hostname

**Decisão:** Cada prédio tem o seu domínio próprio (`edificioeuropa.pt`,
`outropredio.pt`, etc.) que aponta para a mesma aplicação no Netlify.
O middleware identifica o tenant pelo hostname.

**Alternativas consideradas:**
- Subdomínios (`europa.algescondo.pt`) — rejeitado: menos profissional, sentimento
  de "white-label" reduzido.
- Paths (`/europa`, `/outro`) — rejeitado: confunde URLs, prejudica SEO.

**Consequências:**
- Custo: ~20€/ano por domínio.
- Cada tenant tem perceção de site próprio.
- Requer configuração de domínio adicional por cada novo prédio.

---

## ADR-003: Row-Level Security (RLS) como mecanismo principal de isolamento

**Decisão:** Todas as tabelas têm RLS ativo. As queries são filtradas
automaticamente pela base de dados com base em funções helper que consultam
a tabela `user_tenants`.

**Contexto:** Em multi-tenancy, vazamentos entre tenants são o pior tipo de bug
possível. Confiar apenas no código aplicacional é frágil.

**Consequências:**
- Mesmo um bug grave no frontend não consegue ler dados de outro tenant.
- Performance: as políticas têm overhead — função `user_tenant_ids()` é
  `stable` para permitir cache.
- Debugging: erros de RLS aparecem como "no rows" silenciosos. Pode confundir
  no início. Solução: testar com `SUPABASE_SERVICE_ROLE_KEY` em scripts admin.

---

## ADR-004: Next.js 15 App Router + Server Components

**Decisão:** Usar App Router (não Pages Router) e privilegiar Server Components.

**Contexto:** App Router é o futuro do Next.js. A combinação com Supabase via
`@supabase/ssr` é a recomendação oficial atual. Server Components reduzem
JavaScript no cliente e simplificam queries autenticadas.

**Consequências:**
- Curva de aprendizagem para diferenciar Server vs Client Components.
- Melhor performance e SEO por defeito.
- Padrão "use client" só onde é necessário (forms, interatividade).

---

## ADR-005: Tailwind CSS + variáveis CSS para temas

**Decisão:** Tailwind para utilities, com paleta GAVINHO como default. Cada
tenant pode override via variáveis CSS (`--color-primary`, etc.) injetadas
dinamicamente a partir da coluna `tenants.tema`.

**Alternativas consideradas:**
- CSS-in-JS (styled-components, emotion) — rejeitado: pior performance em
  Server Components.
- shadcn/ui hardcoded — incluído como referência de componentes, mas estilizado
  manualmente.

**Consequências:**
- Customização visual por tenant é trivial.
- Devs novos têm de aprender as cores nomeadas (warmBeige, oliveGray, etc.).

---

## ADR-006: Convenção de path para Storage

**Decisão:** Ficheiros em Storage seguem o path
`{bucket}/{tenant_id}/{recurso_id}/{filename}`.

**Razão:** Permite que as políticas RLS de Storage extraiam o `tenant_id` do
path (via `storage.foldername(name)[1]`) e validem acesso.

**Consequências:**
- Renomear/mover tenants requer mover ficheiros (raro).
- Garantia forte de isolamento ao nível do storage.

---

## ADR-007: Workspace da Administração separado dos portais de condomínio

**Decisão:** O administrador trabalha num **workspace multi-condomínio**
num domínio do produto (`app.portaria.pt`). Cada condomínio continua a
existir como **contexto operacional** (tenant, âmbito de RLS, dono dos
dados) e, no seu domínio próprio, como site público e — futuramente —
portal do condómino.

O ADR-002 é reinterpretado, não revogado: os domínios próprios por prédio
servem os **portais** (condóminos e público), nunca o trabalho da
administração.

**Contexto:** O Operating Model define o administrador como utilizador
principal, que gere vários edifícios e "nunca deve saltar entre
aplicações" (princípio 2). A tenancy por hostname obrigá-lo-ia a trocar
de domínio (e de sessão) por cada prédio — a antítese do Centro de
Trabalho. O modelo de dados já suporta a decisão (`user_tenants` é N:N;
o RLS filtra por membership, não por hostname).

**Alternativas consideradas:**
- Admin continua a trabalhar no domínio de cada prédio — rejeitado:
  viola o Operating Model e impossibilita o Centro de Trabalho
  multi-condomínio.
- Um único domínio para tudo, com paths por tenant — rejeitado para os
  portais: perde-se a perceção white-label que o ADR-002 protege.
- Adiar a decisão — rejeitado: convites e recuperação de password devem
  nascer já alinhados com a arquitetura definitiva.

**Decisões subsidiárias:**
1. No workspace, o condomínio ativo é **explícito no URL**
   (`app.portaria.pt/{slug}/…`), nunca estado escondido num switcher:
   links partilháveis, "onde estou?" sempre respondido (Design Language,
   §1), e deep-linking para a memória operacional.
2. Sessões são por domínio (workspace e portais têm sessões separadas).
   Aceitável: na prática são públicos distintos, e o Supabase Auth é o
   mesmo.
3. O RLS mantém-se exatamente como está — é o que torna um workspace
   cross-tenant seguro por construção.
4. No middleware, o domínio do workspace é um host **sem tenant por
   hostname** (como o domínio do produto); o tenant vem do path.

**Consequências:**
- O Centro de Trabalho será a homepage do workspace.
- `/configuracao` migrará por fases do portal para o workspace; até lá,
  a administração continua funcional nos domínios atuais.
- Toda a funcionalidade nova nasce **domain-agnostic** (URLs de email e
  redirects derivados do host da request, nunca hardcoded).
- Requer DNS + configuração de `app.portaria.pt` quando o workspace
  nascer; até lá, nada muda em produção.

---

## Próximas decisões a tomar

- [ ] Estratégia de migrations: usar Supabase CLI ou apenas SQL Editor?
- [x] Sistema de envio de emails transacionais (convites, recuperação de
      password): **Supabase Auth nativo na Foundation** (templates de
      convite e recovery). Resend ou similar só quando existirem
      comunicações próprias da plataforma (Conversas, Fase Seguinte).
- [ ] CI/CD: testes automáticos no Netlify? Linting obrigatório no PR?
- [ ] i18n: por agora pt-PT only; quando acrescentar EN?
