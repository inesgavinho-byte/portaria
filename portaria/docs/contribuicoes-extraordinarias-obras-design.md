# Contribuições extraordinárias de obras — desenho operacional

## Propósito

As contribuições extraordinárias são receitas vinculadas a uma intervenção ou deliberação específica. Não podem ser guardadas em `quotas_mensais`, pois têm calendários, montantes e evidências próprios. A separação impede que saldos ordinários e extraordinários sejam confundidos no financeiro ou no dossiê de cada fração.

## Entidades

| Entidade | Finalidade | Regra de integridade |
|---|---|---|
| `contribuicoes_extraordinarias` | Operação global, como uma obra financiada pelos condóminos. | O total é a soma das prestações; o estado global é controlado pela administração. |
| `contribuicao_prestacoes` | Chamada de capital com vencimento e montante global. | Cada prestação pertence a uma única contribuição e tem uma ordem única. |
| `contribuicao_prestacao_fracoes` | Posição individual de cada fração em cada prestação. | Uma única posição por fração e prestação; montante previsto e liquidado são guardados separadamente. |

## Dados históricos confirmados

A contribuição extraordinária de obras é criada com o total de **62 000,00 €** e quatro prestações de **15 500,00 €**, com vencimento em 30 de junho, 30 de setembro e 31 de dezembro de 2025, e 31 de março de 2026. O mapa confirma o estado liquidado de todas as prestações, mas não prova uma data individual de recebimento por fração; por isso, `liquidado_em` permanece vazio e a fonte fica documentada no registo.

A distribuição segue a permilagem existente na PORTARIA. As lojas A, B e C possuem 5 permilagem cada e, embora apareçam agregadas como “Lojas” no mapa, recebem 77,50 € por prestação e 310,00 € no total individual. As 22 frações de 40 permilagem recebem 620,00 € por prestação e 2 480,00 € no total; as três frações de 35 permilagem recebem 542,50 € por prestação e 2 170,00 € no total.

## Segurança e experiência

A gestão é exclusivamente administrativa. O mapa financeiro será ligado como fonte confidencial assim que estiver guardado no bucket `documentos-admin`. Cada dossiê de fração apresenta os eventos de contribuição extraordinária na cronologia, com ligação à ficha global. O módulo não cria pagamentos regulares, recibos, movimentos bancários ou avisos automáticos.

> A marcação “liquidada” significa que o mapa histórico confirma a liquidação da posição. Não substitui comprovativos bancários individuais nem gera recibos.
