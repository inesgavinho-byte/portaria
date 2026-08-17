# Biblioteca administrativa e Assistente documental — desenho funcional

## Objetivo

A PORTARIA passa a ter uma biblioteca administrativa confidencial organizada por **tema** e **tipo**, e uma experiência de geração documental assistida por IA. A IA atua como braço direito do administrador: estrutura factos, pede elementos em falta, prepara um rascunho e cita as fontes configuradas. Não assina, não envia, não publica e não declara conformidade legal.

## Biblioteca confidencial

A taxonomia aplica-se a cada documento sem alterar a categoria já existente.

| Tema | Exemplos de conteúdo | Tipos existentes mais frequentes |
|---|---|---|
| Governação e regulamento | regulamento, adendas, título constitutivo, atas | Regulamento, Ata |
| Financeiro e fiscal | balancetes, reconciliações, NIF, comprovativos | Contas e Orçamentos |
| Contratos e fornecedores | contratos, propostas, adjudicações | Contratos |
| Manutenção e obras | relatórios, inspeções, obras, elevadores | Manual, Outros |
| Técnico e plantas | plantas, esquemas, telas finais | Manual, Outros |
| Seguros e riscos | apólices, sinistros, segurança | Apólice |
| Recursos humanos | porteiro, férias, Segurança Social | Outros |
| Transição e correspondência | passagem de pasta, comunicações recebidas | Circular, Outros |

A página permitirá pesquisa por título/descrição, filtro por tema, tipo e ano, agrupamento por tema e acesso a uma página de detalhe. O visualizador usa URL temporária emitida apenas depois da autorização administrativa: PDF e imagem serão mostrados incorporados; folhas de cálculo terão pré-visualização tabular; formatos sem renderização segura ficam assinalados, sem exposição do ficheiro.

## Assistente documental

O assistente terá uma sessão por documento e por modelo. A conversa é persistida, exclusivamente para administradores, e separada do histórico geral da Conselheira.

| Componente | Responsabilidade |
|---|---|
| Sessão documental | Mantém modelo, objetivo, mensagens, campos recolhidos, rascunho, fontes e avisos. |
| Conversa orientada | Recolhe factos por etapas, pede dados em falta e mantém a linguagem adaptada ao documento. |
| Rascunho estruturado | Produz HTML sanitizado para pré-visualização, sem alterar o modelo original. |
| Revisão humana | O administrador revê, edita ou rejeita o rascunho antes de o aprovar para exportação. |
| Configuração da IA | Permite editar instruções de estilo, guardrails, fontes legais ativas e regras de revisão. |

## Guardrails obrigatórios

1. A IA usa apenas os factos escritos na sessão, os dados autorizados do condomínio e as fontes de conhecimento devolvidas pela pesquisa.
2. Quando faltar informação material, a IA pergunta ou sinaliza a lacuna; nunca a inventa.
3. A IA cita fonte e artigo quando fizer uma afirmação dependente de legislação ou regulamento disponível.
4. A IA não classifica um documento como “conforme”, “válido”, “executável” ou “pronto para assinatura” sem revisão humana explícita.
5. A IA não envia e-mails, não emite documentos definitivos, não aprova despesas nem modifica registos financeiros.
6. As configurações, sessões, mensagens, rascunhos e fontes são exclusivas de administradores do respetivo condomínio.

## Fontes legais iniciais

A configuração inicia com a Lei n.º 8/2022, de 10 de janeiro, e o regime regulamentar da propriedade horizontal, com URL do Diário da República. As fontes podem ser ativadas, desativadas, anotadas e versionadas pela administração. O regulamento do EUROPA integra a base de conhecimento como fonte local do condomínio.

> A biblioteca de fontes é uma ajuda de rastreabilidade. Não substitui a confirmação da redação consolidada aplicável ou a revisão de um profissional jurídico quando o documento produzir efeitos relevantes.
