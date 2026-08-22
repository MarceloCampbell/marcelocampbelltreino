-- Persiste o método de treino e seus parâmetros em sessao_itens
-- Necessário para restaurar o dropdown de método ao reabrir o modal de edição

ALTER TABLE sessao_itens
  ADD COLUMN IF NOT EXISTS metodo       TEXT  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS metodo_params JSONB DEFAULT NULL;
