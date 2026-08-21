-- Persistência de sessão de treino em andamento
-- Permite retomar treino após fechar o app, com timer baseado em timestamp

-- 1. Colunas de pausa e carga em workout_sessions
ALTER TABLE workout_sessions
  ADD COLUMN IF NOT EXISTS pausado_em        TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS elapsed_at_pause  INTEGER     DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS carga_json        JSONB       DEFAULT NULL;

COMMENT ON COLUMN workout_sessions.pausado_em       IS 'Timestamp de quando o aluno escolheu Sair e Pausar';
COMMENT ON COLUMN workout_sessions.elapsed_at_pause IS 'Segundos decorridos no momento em que a sessão foi pausada';
COMMENT ON COLUMN workout_sessions.carga_json       IS 'Mapa itemId→carga (texto livre) para restaurar o estado de carga ao retomar';

-- 2. Restrição única em set_executions para permitir UPSERT atômico por série
--    (sem ela o upsert insere duplicatas ou falha)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'set_executions_session_item_serie_key'
  ) THEN
    ALTER TABLE set_executions
      ADD CONSTRAINT set_executions_session_item_serie_key
      UNIQUE (session_id, sessao_item_id, numero_serie);
  END IF;
END;
$$;
