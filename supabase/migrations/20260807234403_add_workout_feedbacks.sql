CREATE TABLE workout_feedbacks (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id              UUID NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
  sessao_id             UUID REFERENCES sessoes_treino(id) ON DELETE SET NULL,
  workout_session_id    UUID REFERENCES workout_sessions(id) ON DELETE SET NULL,
  energia_nivel         INTEGER CHECK (energia_nivel BETWEEN 1 AND 10),
  progresso_carga       TEXT CHECK (progresso_carga IN ('sim', 'nao', 'em_alguns')),
  exercicio_mais_dificil TEXT,
  melhor_momento        TEXT,
  sentiu_dor            BOOLEAN NOT NULL DEFAULT FALSE,
  descricao_dor         TEXT,
  obstaculos            TEXT,
  pergunta_marcelo      TEXT,
  peso_atual            NUMERIC,
  exercicios_incompletos JSONB,
  respondido            BOOLEAN NOT NULL DEFAULT FALSE,
  resposta_admin        TEXT,
  visto_em              TIMESTAMPTZ,
  criado_em             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE workout_feedbacks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated acessa workout_feedbacks" ON workout_feedbacks
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
