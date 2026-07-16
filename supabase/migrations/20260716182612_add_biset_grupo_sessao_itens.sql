-- Coluna para agrupar exercícios em bi-set/superset
-- Exercícios com o mesmo valor em biset_grupo pertencem ao mesmo conjunto
alter table sessao_itens add column if not exists biset_grupo text default null;
