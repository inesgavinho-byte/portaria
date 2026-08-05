# Matriz de autorização — Portaria

Estado **após** as migrações `0028`/`0029`/`0030`. Derivada das políticas RLS e
grants reais, não de comportamento pretendido não implementado. Onde o produto
ainda não define o comportamento, está marcado **[decisão necessária]**.

## Papéis

| Papel | Quem |
|---|---|
| `anon` | Chave anónima pública (bundle do browser). Sem sessão. |
| `condomino` | Membro comum do tenant. |
| `inquilino` | Arrendatário — acesso reduzido (S6). |
| `comissao` | Comissão. **Hoje = condómino** (status quo; ver nota). |
| `admin` | Administração do tenant (`is_tenant_admin`). |
| `admin (outro tenant)` | Admin de um tenant diferente — deve ser sempre negado cross-tenant. |
| `service_role` | Server-side, ignora RLS. Nunca no browser. |

> **`comissao` [decisão necessária]:** o RLS trata `comissao` como condómino
> (membro pleno, não-inquilino). Não foram inventados privilégios extra. Se a
> comissão deve ter acesso acrescido (ex.: financeiro, atas), é decisão de
> produto a especificar antes de implementar.

## Legenda

✓ permitido · ✗ negado · **próprio** só as suas linhas · **min** dados
minimizados (sem campos pessoais) · n/a não aplicável.

## Tabelas (SELECT salvo indicação)

| Objeto | anon | condomino | inquilino | comissao | admin | admin(outro) | service_role |
|---|---|---|---|---|---|---|---|
| `tenants` (SELECT) | ✓ (público, 0003) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `tenants` (UPDATE) | ✗ | ✗ | ✗ | ✗ | ✓ (próprio tenant) | ✗ | ✓ |
| `user_tenants` (SELECT) | ✗ | próprio | próprio | próprio | ✓ (do tenant) | ✗ | ✓ |
| `user_tenants` (UPDATE) | ✗ | próprio, **só `notificacoes_email`** (S7) | idem | idem | ✓ (gere) | ✗ | ✓ |
| `avisos` | ✗ | ✓ ativos | ✓ ativos | ✓ ativos | ✓ todos | ✗ | ✓ |
| `documentos` | ✗ | ✓ todos | ✓ **exceto** conta/ata/contrato/apólice (S6) | ✓ todos | ✓ | ✗ | ✓ |
| `ocorrencias` | ✗ | próprias | próprias | próprias | ✓ (do tenant) | ✗ | ✓ |
| `ocorrencia_eventos` | ✗ | próprias (exceto notas) | idem | idem | ✓ | ✗ | ✓ |
| `assembleias` | ✗ | ✓ publicadas | ✗ (S6) | ✓ publicadas | ✓ todas | ✗ | ✓ |
| `assembleia_pontos` | ✗ | ✓ publicadas | ✗ (S6) | ✓ | ✓ | ✗ | ✓ |
| `votacoes` | ✗ | ✓ aberta/encerrada | ✗ (S6) | ✓ | ✓ | ✗ | ✓ |
| `votacao_opcoes` | ✗ | ✓ (visíveis) | ✗ (S6) | ✓ | ✓ | ✗ | ✓ |
| `votos` (SELECT) | ✗ | ✗ | ✗ | ✗ | ✗ (só via service role) | ✗ | ✓ |
| `votacao_participantes` (SELECT) | ✗ | próprias | próprias | próprias | ✓ | ✗ | ✓ |
| `reservas` (SELECT) | ✗ | próprias (S9) | próprias | próprias | ✓ (do tenant) | ✗ | ✓ |
| `espacos_comuns` | ✗ | ✓ ativos | ✓ ativos | ✓ ativos | ✓ | ✗ | ✓ |
| `notificacoes` | ✗ | próprias | próprias | próprias | próprias | ✗ | ✓ |
| `conversas_ia` / `_mensagens` | ✗ | próprias | próprias | próprias | próprias | ✗ | ✓ |
| `conhecimento_embeddings` | ✗ | ✓ exceto `ocorrencia_resolvida` (C2) | ✓ só regulamento/legislação | ✓ exceto ocorrência | ✓ tudo | ✗ | ✓ |
| `fracoes` | ✗ | ✗ (admin-only) | ✗ | ✗ | ✓ | ✗ | ✓ |
| `convites` | ✗ | ✓ (dirigidos ao seu email) | idem | idem | ✓ (gere) | ✗ | ✓ |
| `configuracao_financeira`/`quotas_mensais`/`pagamentos`/`recibos` | ✗ | ✓ (leitura da sua fração) | ✓? **[decisão]** | ✓? **[decisão]** | ✓ | ✗ | ✓ |

## INSERT/UPDATE/DELETE relevantes

| Objeto · Op | Regra |
|---|---|
| `notificacoes` INSERT | ✗ cliente (anon/auth). Só triggers/definer/service_role (S1). |
| `votos` INSERT | ✗ cliente. Só `registar_voto` (definer, transacional) (S4). |
| `votacao_participantes` UPDATE | ✗ membro. Só `registar_voto`/admin (S4). |
| `reservas` INSERT/UPDATE | próprio + coerência tenant↔espaço (S5). |
| `conversas_ia_mensagens` INSERT | cliente só `role='user'`; `assistant` via service role (S10). |
| `documentos`/`avisos`/`assembleias`/… gestão | admin (`for all`). |

## RPC (`/rest/v1/rpc`)

| Função | anon | authenticated | Validação interna |
|---|---|---|---|
| `user_tenant_ids`, `is_tenant_admin` | ✗ | ✓ | só do próprio |
| `user_tem_papel` | ✗ | ✓ | só do próprio (auth.uid) |
| `aceitar_convites` | ✗ | ✓ | email autenticado |
| `registar_voto` | ✗ | ✓ | membership + votação aberta + participação + opção + unicidade (S4) |
| `buscar_chunks`, `estado_conhecimento` | ✗ | ✓ | membership no tenant; C2 (ocorrência só admin); inquilino só reg./legisl. (S3) |
| `disponibilidade_reservas` | ✗ | ✓ | scoped aos tenants do chamador; sem dados pessoais (S9) |
| `user_permilagem` | ✗ | ✓ | próprio ou admin do tenant (S8) |
| `total_permilagem_tenant`, `verificar_disponibilidade`, `contar_reservas_semana` | ✗ | ✓ | membership/próprio no corpo (S2) |
| `notificar_todos`, `notificar_admins` | ✗ | ✗ | só triggers/service_role (S2) |
| funções financeiras (`gerar_quotas_mes`, …) | ✓ **[dívida S2-like]** | ✓ | **sem grants** — fechar antes do Beta financeiro |

## Storage

| Bucket · Op | Regra |
|---|---|
| `documentos` SELECT | membro do tenant; inquilino **exceto** documentos sensíveis (S6). Regulamento servido por service role. |
| `documentos` INSERT/DELETE | admin do tenant. |
| `ocorrencias` SELECT/INSERT/DELETE | admin do tenant ou criador da ocorrência (com coerência de path, 0002/0003). |

## Lacunas / decisões necessárias

- **`comissao`** — perfil de acesso a definir (hoje = condómino).
- **Financeiro (0027)** — papel do inquilino nas tabelas financeiras; grants
  das funções `SECURITY DEFINER` financeiras (dívida tipo S2).
- **S11** — aceitação de convites ainda é em bloco (ver relatório Fase 1).
