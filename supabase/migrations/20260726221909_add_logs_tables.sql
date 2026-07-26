-- Log de acessos: quando aluno visualiza rotina ou inicia treino
CREATE TABLE access_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id      UUID NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
  tipo          TEXT NOT NULL CHECK (tipo IN ('rotina_visualizada', 'treino_iniciado')),
  referencia_id UUID,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Log de mudanças em rotinas (admin)
CREATE TABLE rotina_change_logs (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ciclo_id  UUID NOT NULL REFERENCES ciclos(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE access_logs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE rotina_change_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated acessa access_logs" ON access_logs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated acessa rotina_change_logs" ON rotina_change_logs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
