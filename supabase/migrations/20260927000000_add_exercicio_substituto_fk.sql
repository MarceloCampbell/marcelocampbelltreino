-- Adds FK constraint on exercicio_substituto_id so PostgREST can resolve
-- the self-join used in the workout execution query:
--   substituto:exercicios!exercicio_substituto_id(id, nome, grupo_muscular, video_url)
--
-- Without this FK, the embedded resource returns null silently and substitutes
-- never appear in the student's workout view.
ALTER TABLE exercicios
  ADD CONSTRAINT fk_exercicio_substituto
  FOREIGN KEY (exercicio_substituto_id)
  REFERENCES exercicios(id)
  ON DELETE SET NULL;
