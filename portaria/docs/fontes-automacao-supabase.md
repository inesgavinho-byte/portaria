# Fontes — automação diária no Supabase

A documentação oficial do Supabase confirma que o módulo Cron assenta em `pg_cron`, permite agendar SQL ou funções de base de dados e regista os trabalhos e execuções nas tabelas do esquema `cron`. Esta é a base escolhida para a rotina diária administrativa do EUROPA.

A documentação também confirma que funções de Edge podem ser chamadas periodicamente usando `pg_cron` com `pg_net`, quando houver necessidade de comunicação HTTP. A primeira versão do EUROPA não depende de chamada HTTP: a rotina cria alertas internos, rascunhos financeiros e tarefas de manutenção diretamente na base de dados.

## Referências

[1] [Supabase Cron](https://supabase.com/docs/guides/cron)  
[2] [Scheduling Edge Functions](https://supabase.com/docs/guides/functions/schedule-functions)
