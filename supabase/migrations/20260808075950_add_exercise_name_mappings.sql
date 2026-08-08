CREATE TABLE IF NOT EXISTS exercise_name_mappings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  input_name TEXT NOT NULL,
  exercise_id UUID NOT NULL REFERENCES exercicios(id) ON DELETE CASCADE,
  confirmed_by TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_exercise_name_mappings_input
  ON exercise_name_mappings (lower(trim(input_name)));

ALTER TABLE exercise_name_mappings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_all" ON exercise_name_mappings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Seed: confirmed mappings from Helena's routine import
INSERT INTO exercise_name_mappings (input_name, exercise_id, confirmed_by)
SELECT v.iname, e.id, 'admin'
FROM (VALUES
  ('Prancha Lateral Dinâmica c/ Apoio dos Joelhos', 'Prancha lateral com joelhos apoiados'),
  ('Abdução de Quadril Máquina',                    'Cadeira abdutora'),
  ('Agachamento Livre com Barra no Suporte',         'Agachamento profundo com barra'),
  ('Agachamento Búlgaro',                            'Agachamento búlgaro com halteres'),
  ('Stiff',                                          'Stiff com barra'),
  ('Flexora Unilateral',                             'Flexora unilateral na máquina'),
  ('Coice Cruzado na Polia',                         'Coice na polia cruzado'),
  ('Flexão de Braços com Apoio',                     'Flexão de braços com joelhos apoiados'),
  ('Desenvolvimento Máquina (Pegada Neutra)',         'Desenvolvimento máquina articulada pegada neutra'),
  ('Elevação Lateral Sentado Máquina',               'Elevação lateral máquina sentado'),
  ('Tríceps Testa no Banco Inclinado c/ Halteres',   'Tríceps testa com halteres'),
  ('Elevação Frontal com Anilha',                    'Elevação frontal com anilha'),
  ('Elevação Lateral com Halteres',                  'Elevação lateral com halteres'),
  ('Tríceps Francês com Halteres',                   'Tríceps francês sentado com halteres'),
  ('Perdigueiro Isométrico',                         'Perdigueiro Isométrico'),
  ('Abdução de Quadril DL Caneleira no Step',        'Abdução de quadril com caneleira'),
  ('Elevação de Quadril na Máquina',                 'Elevação pélvica na máquina'),
  ('Levantamento Terra',                             'Levantamento terra'),
  ('Step Up com Caneleira',                          'Step-up na caixa com caneleira'),
  ('Cadeira Flexora',                                'Cadeira flexora bilateral'),
  ('Prancha Alta',                                   'Prancha Isométrica'),
  ('Prancha Isométrica Alta Alternando MI',           'Prancha ventral com elevação alternada de pernas'),
  ('Abdominal Máquina',                              'Abdominal supra máquina'),
  ('Prancha Isométrica na Bola Suíça',               'Prancha isométrica na bola suíça'),
  ('Barra Fixa Gráviton (Pegada Supinada)',           'Barra fixa com pegada supinada'),
  ('Puxada Neutra Triângulo',                        'Puxada neutra triângulo'),
  ('Remada Curvada c/ Barra Reta (Pegada Pronada)',  'Remada curvada com barra pegada pronada'),
  ('Remada Baixa Supinada',                          'Remada baixa com barra reta e pegada supinada'),
  ('Rosca Martelo com Halteres',                     'Rosca martelo com halteres'),
  ('Rosca Direta com Halteres',                      'Rosca direta simultânea com halteres'),
  ('Crucifixo Inverso com Halteres',                 'Crucifixo inverso com halteres em pé')
) AS v(iname, biblioteca_nome)
JOIN exercicios e ON lower(trim(e.nome)) = lower(trim(v.biblioteca_nome))
ON CONFLICT (lower(trim(input_name))) DO NOTHING;
