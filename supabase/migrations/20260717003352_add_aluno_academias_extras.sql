-- Tabela de acesso extra a academias por aluno
-- Permite liberar um aluno em academias além da sua academia principal (academia_id em alunos)
create table if not exists aluno_academias_extras (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references alunos(id) on delete cascade,
  academia_id uuid not null references academias(id) on delete cascade,
  criado_em timestamptz not null default now(),
  unique(aluno_id, academia_id)
);

alter table aluno_academias_extras enable row level security;

-- Admin pode ver e gerenciar todos os registros
create policy "Admin gerencia aluno_academias_extras" on aluno_academias_extras
  for all
  to authenticated
  using (true)
  with check (true);
