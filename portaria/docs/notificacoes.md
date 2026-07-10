# Notificações por email

> Simplicidade primeiro. As notificações vivem na própria aplicação
> (Next.js), não em Edge Functions nem em triggers de base de dados. Um
> só sítio, uma só linguagem, um só sítio para depurar.

## O que a Portaria envia

| Evento | Quem recebe | Onde é disparado |
| --- | --- | --- |
| Nova ocorrência | Administração do prédio | `criarOcorrencia` (`src/lib/actions/ocorrencias.ts`) |
| Mudança de estado de ocorrência | Quem abriu a ocorrência | `alterarEstadoOcorrencia` (idem) |
| Contrato a renovar (30 e 7 dias antes) | Administração do prédio | Cron diário → `GET /api/cron/contratos-renovacao` |

Cada destinatário só recebe se tiver as notificações ligadas
(`user_tenants.notificacoes_email`, por defeito **sim**). Cada membro
gere a sua escolha em **Configuração › Notificações**.

O envio é sempre *fire-and-forget*: se o email falhar, a operação
principal (criar ocorrência, mudar estado) conclui na mesma. A app nunca
quebra por causa de email.

## Como ativar (uma vez)

Enquanto as variáveis abaixo não estiverem definidas, tudo funciona mas
os emails **não são enviados** (fica um aviso no log). Não há erros.

### 1. Provedor de email — Resend

1. Criar conta em https://resend.com e verificar o domínio de envio.
2. Gerar uma API key.
3. Definir no ambiente (Netlify → Site settings → Environment variables):

   ```
   RESEND_API_KEY = re_xxxxxxxx
   EMAIL_FROM     = Portaria <avisos@oteudominio.pt>
   NEXT_PUBLIC_APP_URL = https://app.portaria.pt   # base dos links nos emails
   ```

Escolhemos o Resend por ser uma API HTTP simples (uma chave, sem SMTP).
Trocar de provedor é mudar só `src/lib/email.ts`.

### 2. Service-role (já usado noutras funções)

A resolução dos emails dos membros lê `auth.users`, fora do alcance do
RLS. Requer `SUPABASE_SERVICE_ROLE_KEY` no ambiente do servidor — a mesma
chave já usada para convites. Sem ela, não há destinatários.

### 3. Cron dos contratos a renovar

O aviso de renovação precisa de correr uma vez por dia. Definir também:

```
CRON_SECRET = <string aleatória longa>
```

E agendar uma chamada diária ao endpoint, com o cabeçalho de autenticação:

```
GET https://app.portaria.pt/api/cron/contratos-renovacao
Authorization: Bearer <CRON_SECRET>
```

Duas formas simples (escolher uma):

- **Supabase pg_cron + pg_net** (fica dentro do Supabase):

  ```sql
  select cron.schedule(
    'contratos-renovacao',
    '0 8 * * *',                          -- 08:00 todos os dias
    $$
    select net.http_get(
      url    := 'https://app.portaria.pt/api/cron/contratos-renovacao',
      headers := jsonb_build_object('Authorization', 'Bearer <CRON_SECRET>')
    );
    $$
  );
  ```

- **Netlify Scheduled Functions** ou qualquer cron externo (ex.: cron-job.org)
  a fazer o mesmo GET com o cabeçalho.

O endpoint percorre todos os prédios, encontra os contratos com
`data_fim` exatamente a 30 e a 7 dias, e avisa a administração de cada um.
Responde em JSON com o total de avisos enviados.

## Resumo do que fica por fazer (do lado da configuração)

- [ ] Conta Resend + domínio verificado + `RESEND_API_KEY` / `EMAIL_FROM`
- [ ] `NEXT_PUBLIC_APP_URL` definido
- [ ] `CRON_SECRET` definido e cron diário agendado
- [ ] Confirmar `SUPABASE_SERVICE_ROLE_KEY` no ambiente

Feito isto, as notificações ficam ativas sem mais alterações de código.
