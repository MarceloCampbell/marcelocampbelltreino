-- Sessão de execução de treino (criada ao clicar "Iniciar Treino")
CREATE TABLE workout_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id        UUID NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
  sessao_id       UUID NOT NULL REFERENCES sessoes_treino(id) ON DELETE CASCADE,
  iniciado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  concluido_em    TIMESTAMPTZ,
  status          TEXT NOT NULL DEFAULT 'em_andamento'
                    CHECK (status IN ('em_andamento', 'concluido', 'incompleto')),
  motivo_incompleto TEXT,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Execução por série (uma row por série x exercício x sessão)
CREATE TABLE set_executions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id        UUID NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
  sessao_item_id    UUID NOT NULL REFERENCES sessao_itens(id) ON DELETE CASCADE,
  numero_serie      INTEGER NOT NULL,
  carga_registrada  NUMERIC,
  concluida         BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (session_id, sessao_item_id, numero_serie)
);

ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE set_executions   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated acessa workout_sessions" ON workout_sessions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated acessa set_executions" ON set_executions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
