# Módulo de despesas e obrigações — desenho funcional

## Objetivo

O módulo complementa quotas, pagamentos e recibos dos condóminos. Destina-se exclusivamente à administração e permite controlar despesas do condomínio, faturas de fornecedores, obrigações recorrentes e comprovativos, sem inferir pagamentos a partir de e-mails ou documentos isolados.

## Modelo de dados

| Entidade | Finalidade | Relações principais |
|---|---|---|
| `obrigacoes_recorrentes` | Representa uma obrigação previsível, como Segurança Social, manutenção de elevadores, seguro ou salário. | Pode estar ligada a fornecedor e contrato; pode originar várias despesas. |
| `despesas` | Regista uma fatura, débito, pagamento ou item a reconciliar. | Pode ligar-se a fornecedor, contrato e obrigação recorrente. |
| `despesas_documentos` | Liga cada despesa a um ou mais documentos confidenciais. | Permite associar fatura, comprovativo, e-mail ou nota de crédito sem duplicar ficheiros. |

## Estados e regras

As despesas usam os estados `rascunho`, `pendente`, `pago`, `vencido`, `cancelado` e `a_reconciliar`. Só uma ação explícita da administração pode marcar uma despesa como `pago`; documentos e e-mails podem criar ou complementar itens em `a_reconciliar`, mas nunca alteram o estado para `pago` automaticamente.

As obrigações recorrentes usam os estados `ativa`, `suspensa` e `terminada`. A periodicidade é `mensal`, `trimestral`, `semestral`, `anual` ou `pontual`.

## Segurança

As três tabelas usam RLS e apenas membros com papel `admin` no tenant podem consultar, inserir, atualizar ou eliminar. Todos os anexos permanecem em `documentos-admin`; a tabela de ligação guarda apenas referências a documentos administrativos já protegidos.

## Interface inicial

A área Financeiro ganha duas separações administrativas: **Despesas** para faturas e pagamentos, e **Obrigações** para recorrências. O dashboard de quotas não é alterado; cada visão financeira mantém os seus totais próprios para evitar misturar receitas de condóminos com despesas do condomínio.

## Carga histórica inicial

A primeira carga terá itens em `a_reconciliar` e/ou `pago` apenas quando o comprovativo permitir confirmar data, valor, entidade e referência. A fatura TK Elevator 1583509783 permanecerá `a_reconciliar`; os comprovativos da Segurança Social e os documentos de obra serão arquivados e preparados para validação, sem lançamento automático de valores.
