# Registo formal de comunicações — desenho operacional

## Objetivo

Converter cada comunicação administrativa num registo vivo e rastreável. Uma comunicação pode abranger uma ou várias frações, manter o estado de cada entrega, relacionar documentos oficiais ou confidenciais e alimentar automaticamente o dossiê cronológico de cada fração.

> A primeira versão **regista e acompanha** envios. Não envia e-mails automaticamente nem altera contactos, quotas ou documentos. A integração de envio por Hostinger será acrescentada quando o DNS e os webhooks estiverem ativos e validados.

## Modelo de dados

| Entidade | Finalidade | Relações |
|---|---|---|
| `comunicacoes` | Registo global de uma circular, convocatória, aviso, cobrança, entrega documental ou outro contacto formal. | Um registo tem destinatários e pode ter vários documentos associados. |
| `comunicacao_destinatarios` | Entrega individual por fração, com destinatário, canal, estado e dados de contacto guardados como fotografia histórica. | Liga cada comunicação a uma `fracao`. |
| `comunicacao_documentos` | Liga a comunicação a um documento publicado ou a um ficheiro do arquivo confidencial. | Aceita exatamente uma das duas referências por linha. |

## Estados e canais

| Campo | Valores | Regra operacional |
|---|---|---|
| Estado da comunicação | `rascunho`, `preparada`, `em_envio`, `concluida`, `arquivada`, `cancelada` | O estado global é controlado pela administração; não é inferido automaticamente. |
| Canal de entrega | `email`, `correio_simples`, `correio_registado`, `entrega_em_mao`, `portal`, `outro` | É definido por destinatário, permitindo canais diferentes na mesma comunicação. |
| Estado do destinatário | `pendente`, `enviado`, `entregue`, `devolvido`, `sem_contacto`, `dispensado` | Regista a situação individual de cada fração. |
| Papel do destinatário | `proprietario`, `inquilino`, `ambos`, `representante`, `outro` | Conserva o contexto de quem recebeu a comunicação. |

## Privacidade e integridade

A comunicação formal, os destinatários e as ligações documentais são inicialmente **admin-only**. Os dados de nome, e-mail e telefone são copiados apenas para criar uma fotografia verificável do envio; alterações futuras na ficha da fração não reescrevem o histórico. A associação a documentos não duplica ficheiros e respeita as permissões dos respetivos arquivos.

Apenas administradores podem criar, editar, alterar estados, marcar entregas e descarregar anexos. A disponibilização futura no portal de condóminos deverá exigir uma regra separada: só documentos aprovados e expressamente publicados podem ser apresentados ao condómino da respetiva fração.

## Experiência de utilização

A página `/comunicacoes` será a consola global. Permitirá filtrar por estado, tipo, canal e período, abrir uma ficha de comunicação e ver imediatamente quantas frações estão pendentes, enviadas, entregues ou sem contacto. Cada ficha terá uma lista de destinatários com ação para atualizar o estado de entrega e uma área de documentos associados com pré-visualização segura.

A página de cada fração terá o respetivo **dossiê administrativo**: informação de contacto, quotas, pagamentos, recibos, ocorrências, comunicações recebidas/enviadas para essa fração e documentos especificamente associados. A cronologia é apresentada por data e origem, sem misturar dados de outras frações.

## Dados existentes do EUROPA

No momento do desenho, o EUROPA tem 28 frações, 8 documentos publicados e 17 documentos no arquivo confidencial. Não existem ainda conversas nem e-mails recebidos que devam ser convertidos automaticamente. Nenhuma comunicação demonstrativa será criada.
