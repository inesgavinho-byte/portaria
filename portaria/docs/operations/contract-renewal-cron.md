# Cron de renovação de contratos — configuração, teste e monitorização

**Achado da auditoria:** A4 (P1).
**Estado do agendamento:** **NÃO CONFIRMADO** (ver secção 2).

---

## 1. O que existe no repositório

- **Endpoint:** `GET /api/cron/contratos-renovacao`
  (`src/app/api/cron/contratos-renovacao/route.ts`).
- **O que faz:** percorre **todos os prédios** (usa a service role, fora do
  RLS) e, para cada contrato cujo `data_fim` é daqui a **30** ou **7** dias,
  envia email à administração via `notificarRenovacaoContrato()`.
- **Autenticação:** exige o cabeçalho
  `Authorization: Bearer <CRON_SECRET>`. Sem `CRON_SECRET` definido devolve
  `503`; com segredo errado devolve `401`.
- **Resposta:** `{ ok: true, avisados, detalhe: [...] }`.

> Como corre com service role sobre todos os tenants, **nunca** pode ser
> exposto sem o segredo. O `CRON_SECRET` é a única barreira.

---

## 2. O que NÃO está confirmado

**Não existe no repositório qualquer configuração que agende este endpoint.**
Verificado:

- `netlify.toml` (raiz): só define `base`, `command`, `publish`, o plugin
  Next.js e uma nota sobre região das Functions. **Sem `[functions]` de
  agendamento, sem `[[scheduled]]`.**
- `.github/workflows/`: **não existe** (confirmado — não há CI, achado D2).
- Sem `vercel.json`, sem Supabase Cron (`pg_cron`) nas migrações.

**Conclusão:** com grande probabilidade **ninguém está a chamar o endpoint**,
logo os avisos de renovação **não estão a ser enviados**. Isto não pode ser
confirmado só pelo repositório — depende de configuração externa (dashboard
Netlify, um cron externo, etc.) que não é visível aqui. **Confirmar antes do
Beta.**

---

## 3. Como configurar o agendamento (escolher UMA opção)

O endpoint deve ser chamado **uma vez por dia** (ex.: 07:00 UTC).

### Opção A — Serviço de cron externo (ex.: cron-job.org, EasyCron)
1. Criar um job diário para `https://<APP_URL>/api/cron/contratos-renovacao`.
2. Método `GET`; adicionar header `Authorization: Bearer <CRON_SECRET>`.
3. Guardar o `CRON_SECRET` no cofre do serviço (não em texto claro partilhado).

### Opção B — GitHub Actions (também serve de base para o CI, D2)
`.github/workflows/cron-contratos.yml`:
```yaml
name: Cron contratos
on:
  schedule:
    - cron: "0 7 * * *"   # 07:00 UTC diário
  workflow_dispatch: {}
jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - name: Chamar endpoint de renovação
        run: |
          curl -fsS -X GET "https://<APP_URL>/api/cron/contratos-renovacao" \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```
> Definir `CRON_SECRET` e (se quiser parametrizar) o URL em
> *Settings → Secrets and variables → Actions*. O `schedule` do GitHub pode
> atrasar alguns minutos — aceitável para avisos diários.

### Opção C — Supabase Cron (`pg_cron` + `pg_net`)
Agendar do lado da base de dados um `net.http_get` para o endpoint com o
header de autorização. Requer as extensões `pg_cron`/`pg_net` ativas e guardar
o segredo em `vault`. Mais acoplado à BD; usar só se já se usar `pg_cron`.

---

## 4. Como testar

Com o `CRON_SECRET` definido no ambiente da app:

```bash
# 401 esperado sem/errado o segredo
curl -i "https://<APP_URL>/api/cron/contratos-renovacao"

# 200 + JSON com o segredo correto
curl -fsS "https://<APP_URL>/api/cron/contratos-renovacao" \
  -H "Authorization: Bearer $CRON_SECRET"
```

Teste funcional ponta-a-ponta: criar um contrato de teste com
`data_fim = hoje + 30 dias`, chamar o endpoint e confirmar que a administração
recebe o email (e que `detalhe[].enviado = true`). Apagar o contrato de teste.

> **Nunca** apontar um teste destes a produção com contratos reais sem
> intenção — o endpoint envia emails verdadeiros.

---

## 5. Como monitorizar

- **Job externo/GitHub Actions:** ativar notificação de falha do job (um
  `curl -f` faz o job falhar se o endpoint não devolver 2xx).
- **App:** o endpoint faz `console.error("[cron] …")` em erros de leitura de
  contratos — vigiar os logs das Functions.
- **Sanidade semanal:** confirmar que `avisados` reflete os contratos que
  deviam ter sido avisados nessa janela.

---

## 6. Requisitos

- `CRON_SECRET` definido no ambiente da app **e** no agendador (ver
  `.env.example`).
- `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `EMAIL_FROM` definidos (senão
  o cron corre mas não envia email).
