alter table public.financeiro_exercicios
  add column if not exists saldo_final_bancario_cents bigint;
