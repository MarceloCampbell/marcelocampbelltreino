-- Amplia o constraint de status de ciclos para incluir todos os valores usados na aplicação
ALTER TABLE ciclos DROP CONSTRAINT IF EXISTS ciclos_status_check;
ALTER TABLE ciclos ADD CONSTRAINT ciclos_status_check
  CHECK (status IN ('ativo', 'planejado', 'concluido', 'arquivado', 'excluido'));
