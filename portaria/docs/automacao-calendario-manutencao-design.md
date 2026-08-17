# Desenho — Automação administrativa, calendário e manutenção preventiva

## Objetivo

Transformar o módulo de despesas e obrigações numa rotina administrativa proativa. A implementação cria rascunhos e alertas internos, mas nunca marca pagamentos como liquidados, não envia e-mails e não altera quotas.

## Rotina diária

Uma função de base de dados será executada diariamente às 07:05, em hora de Lisboa. A rotina será idempotente e produzirá quatro resultados controlados: alertas de vencimento, rascunhos de despesa a partir de obrigações com valor conhecido, tarefas de manutenção próximas e notificações exclusivas para administradores.

| Origem | Condição | Resultado automático | Limite |
|---|---|---|---|
| Obrigação recorrente ativa | Vencimento em até 7 dias | Alerta interno para administração | Não cria pagamento. |
| Obrigação ativa com valor estimado | Vencimento em até 7 dias e sem despesa equivalente | Despesa em `rascunho`, ligada à obrigação | Exige revisão e aprovação humana. |
| Despesa pendente/aprovada | Vencida ou a vencer em até 7 dias | Alerta interno | Não altera estado para `pago`. |
| Plano de manutenção ativo | Próxima execução em até antecedência definida | Tarefa de manutenção planeada e alerta | Não marca intervenção como concluída. |

A rotina guarda uma chave de idempotência para impedir alertas ou tarefas duplicadas na mesma referência temporal. A execução corre apenas no servidor de dados, sem depender de utilizador ligado à PORTARIA.

## Estados de aprovação de despesa

O fluxo de uma despesa de fornecedor será explícito.

| Estado | Significado | Transições permitidas |
|---|---|---|
| `rascunho` | Item automático ou preparado sem validação financeira. | `pendente`, `cancelado` |
| `pendente` | Fatura ou despesa recebida e registada. | `em_aprovacao`, `cancelado`, `a_reconciliar` |
| `em_aprovacao` | A aguardar decisão administrativa. | `aprovada`, `rejeitada`, `a_reconciliar` |
| `aprovada` | Autorizada para pagamento. | `pago`, `a_reconciliar`, `cancelado` |
| `pago` | Pagamento comprovado. | `a_reconciliar` apenas se houver correção posterior. |
| `a_reconciliar` | Existe divergência, comprovativo incompleto ou necessidade de cruzamento bancário. | `pendente`, `em_aprovacao`, `cancelado` |
| `rejeitada` / `cancelado` | Item encerrado sem pagamento. | Sem transição automática. |

A mudança para `pago` exigirá data, referência de pagamento e documento confidencial com papel de `comprovativo`. A aprovação e a rejeição guardarão utilizador, data e motivo. Quando houver apenas uma administradora, a mesma pessoa pode aprovar, mas o registo de auditoria fica preservado para futura segregação de funções.

## Calendário administrativo

O calendário será uma vista administrativa construída a partir dos próprios dados da PORTARIA, sem duplicar eventos. Mostrará despesas, obrigações e tarefas de manutenção numa janela de datas configurável, com filtros por tipo e estado.

| Tipo de evento | Fonte | Ação do utilizador |
|---|---|---|
| Vencimento de despesa | `despesas.data_vencimento` | Rever, submeter, aprovar ou reconciliar. |
| Obrigação recorrente | `obrigacoes_recorrentes.proximo_vencimento` | Rever valores e antecipar a despesa. |
| Tarefa de manutenção | `tarefas_manutencao.data_planeada` | Agendar, iniciar ou concluir intervenção. |
| Alerta operacional | `alertas_operacionais` | Marcar como reconhecido ou abrir a entidade de origem. |

## Manutenção preventiva

O módulo separa ativos, planos e tarefas. Um ativo pode ter fornecedor, contrato, localização e código interno. Um plano define periodicidade, próxima execução, antecedência de alerta e instruções. Uma tarefa preserva o historial de cada ocorrência de manutenção.

Nenhum ativo ou plano será criado com periodicidade assumida. Os primeiros registos serão inseridos apenas quando a informação estiver confirmada por contrato, relatório de inspeção ou indicação da administração.

## Segurança e execução

A função diária será `SECURITY DEFINER` com `search_path` fixo e não será executável por perfis `anon` ou `authenticated`. A execução agendada chamará diretamente a função no banco de dados. Os alertas serão internos e destinados exclusivamente a utilizadores com papel de administração.

## Publicação

A implementação segue em pull request. A migração cria as tabelas, funções, RLS, índices e agendamento. A interface adiciona o calendário, a área de aprovação e a manutenção preventiva à configuração administrativa.
