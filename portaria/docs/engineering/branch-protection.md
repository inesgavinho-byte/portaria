# Proteção de branch (GitHub) — configuração necessária

**Objetivo:** impedir que código que quebre o build ou o RLS chegue a `main`.
Requer o workflow de CI (`.github/workflows/ci.yml`, Tarefa 2.4) a correr.

> **Estado:** esta configuração **NÃO foi aplicada** por este trabalho — a
> proteção de branch é definida na dashboard/API do GitHub e exige permissões
> de admin do repositório. Abaixo o que configurar. Não afirmar que está ativa
> sem confirmar em *Settings → Branches*.

## Configuração recomendada para `main`

Em **Settings → Branches → Branch protection rules → Add rule**, `Branch name
pattern: main`:

- ☑ **Require a pull request before merging**
  - ☑ Require approvals: **1** (ou mais).
  - ☑ Dismiss stale approvals quando novos commits são feitos.
- ☑ **Require status checks to pass before merging**
  - ☑ Require branches to be up to date before merging.
  - **Status check obrigatório:** `build-and-test` (o job do CI).
    > O nome aparece na lista depois de o workflow correr ao menos uma vez num PR.
- ☑ **Require conversation resolution before merging**.
- ☑ **Do not allow bypassing the above settings** (aplica também a admins).
- ☐ Allow force pushes — **desligado**.
- ☐ Allow deletions — **desligado**.

## Efeito

- Nenhum merge para `main` sem PR aprovado **e** com o CI verde.
- Um erro de migração, uma falha de type-check/build, ou uma **regressão de
  RLS** (a suite `test:security` a falhar) **bloqueia o merge**.

## Notas

- Se o repositório usar merge queue, adicionar o mesmo check à queue.
- Para o CI poder correr em PRs de forks com segredos, rever a política de
  `pull_request` vs `pull_request_target` (não usar `pull_request_target` com
  checkout de código não confiável).
- A proteção só é útil com o CI a correr; confirmar que
  `.github/workflows/ci.yml` está no branch por omissão.
