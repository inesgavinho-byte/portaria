-- Versiona no repositório o schema de memória da contratação já aplicado em produção.
-- As guardas IF NOT EXISTS permitem executar esta migration sem conflito no ambiente
-- onde as tabelas foram inicialmente criadas fora do histórico de migrations.

CREATE TABLE IF NOT EXISTS public.contrato_memoria_eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  contrato_id uuid NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
  data_evento timestamptz NOT NULL,
  tipo text NOT NULL CHECK (tipo IN (
    'proposta', 'adjudicacao', 'comunicacao', 'fatura', 'pagamento',
    'execucao', 'decisao', 'garantia', 'conflito', 'outro'
  )),
  titulo text NOT NULL,
  resumo text NOT NULL,
  natureza text NOT NULL DEFAULT 'facto' CHECK (natureza IN (
    'facto', 'inferencia', 'conflito', 'pendente'
  )),
  criado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, contrato_id, data_evento, titulo)
);

CREATE INDEX IF NOT EXISTS contrato_memoria_eventos_contrato_data_idx
  ON public.contrato_memoria_eventos (contrato_id, data_evento DESC);

CREATE TABLE IF NOT EXISTS public.contrato_memoria_evidencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id uuid NOT NULL REFERENCES public.contrato_memoria_eventos(id) ON DELETE CASCADE,
  fonte_id uuid NOT NULL REFERENCES public.ia_documental_fontes(id) ON DELETE CASCADE,
  localizador text,
  citacao text NOT NULL,
  papel text NOT NULL DEFAULT 'primaria' CHECK (papel IN (
    'primaria', 'corroboracao', 'contradicao'
  )),
  criado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (evento_id, fonte_id, citacao)
);

CREATE INDEX IF NOT EXISTS contrato_memoria_evidencias_evento_idx
  ON public.contrato_memoria_evidencias (evento_id);
CREATE INDEX IF NOT EXISTS contrato_memoria_evidencias_fonte_idx
  ON public.contrato_memoria_evidencias (fonte_id);

ALTER TABLE public.contrato_memoria_eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contrato_memoria_evidencias ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contrato_memoria_eventos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contrato_memoria_evidencias TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'contrato_memoria_eventos'
      AND policyname = 'admins manage contrato memoria eventos'
  ) THEN
    CREATE POLICY "admins manage contrato memoria eventos"
      ON public.contrato_memoria_eventos
      FOR ALL TO authenticated
      USING (public.is_tenant_admin(tenant_id))
      WITH CHECK (public.is_tenant_admin(tenant_id));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'contrato_memoria_evidencias'
      AND policyname = 'admins manage contrato memoria evidencias'
  ) THEN
    CREATE POLICY "admins manage contrato memoria evidencias"
      ON public.contrato_memoria_evidencias
      FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.contrato_memoria_eventos evento
          WHERE evento.id = contrato_memoria_evidencias.evento_id
            AND public.is_tenant_admin(evento.tenant_id)
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.contrato_memoria_eventos evento
          WHERE evento.id = contrato_memoria_evidencias.evento_id
            AND public.is_tenant_admin(evento.tenant_id)
        )
      );
  END IF;
END $$;
