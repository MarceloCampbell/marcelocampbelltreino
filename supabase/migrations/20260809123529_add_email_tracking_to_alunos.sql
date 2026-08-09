ALTER TABLE alunos
  ADD COLUMN IF NOT EXISTS ultimo_convite_enviado_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ultima_redefinicao_enviada_em TIMESTAMPTZ;
