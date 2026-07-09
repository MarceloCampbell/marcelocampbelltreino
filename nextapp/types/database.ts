export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

// ── Standalone Row types (avoids circular self-reference in Omit<>) ──

interface UsuariosRow {
  id: string
  auth_id: string
  nome: string
  email: string
  telefone: string | null
  papel: 'admin' | 'assistente' | 'aluno'
  pode_editar_treino: boolean
  avatar_url: string | null
  data_nascimento: string | null
  ativo: boolean
  criado_em: string
}

interface AcademiasRow {
  id: string
  nome: string
  endereco: string | null
  observacoes: string | null
  status: 'ativo' | 'inativo'
  criado_em: string
}

interface AcademiaEquipamentosRow {
  id: string
  academia_id: string
  nome_equipamento: string
  observacoes: string | null
}

interface AlunosRow {
  id: string
  usuario_id: string
  academia_id: string | null
  plano_contratado: string | null
  valor_plano: number | null
  data_inicio: string | null
  data_renovacao: string | null
  horario_contato_preferido: string | null
  nivel: 'iniciante' | 'intermediario' | 'avancado' | null
  autonomia: string | null
  horario_treino: string | null
  disciplina: string | null
  motivacao_principal: string | null
  dificuldade_principal: string | null
  perfil_comportamental: string[] | null
  objetivo: string | null
  dores_lesoes: string | null
  limitacoes: string | null
  exercicios_que_incomodam: string | null
  exercicios_preferidos: string | null
  exercicios_que_odeia: string | null
  pontos_atencao: string | null
  criado_em: string | null
}

interface ExerciciosRow {
  id: string
  nome: string
  grupo_muscular: string
  categoria: string
  instrucoes: string | null
  video_url: string | null
  imagem_url: string | null
  equipamento: string | null
  erros_comuns: string | null
  substituicoes: string[] | null
  ativo: boolean
  criado_em: string
}

interface CiclosRow {
  id: string
  aluno_id: string
  nome: string
  numero: number
  semana_atual: number
  data_inicio: string
  data_fim: string
  tema: string | null
  status: 'ativo' | 'concluido' | 'planejado'
  criado_em: string
}

interface FasesCicloRow {
  id: string
  ciclo_id: string
  semana_inicio: number
  semana_fim: number
  tipo_fase: 'adaptacao' | 'progressao_carga' | 'intensificacao' | 'manutencao' | 'recuperacao' | 'consolidacao'
  esquema_series_reps: string | null
  observacoes: string | null
}

interface SessoesTreinoRow {
  id: string
  aluno_id: string
  ciclo_id: string | null
  nome: string
  tipo: 'musculacao' | 'aerobico' | 'corrida' | 'hiit'
  data: string
  duracao_min: number | null
  intensidade: 'baixa' | 'media' | 'alta' | null
  volume: string | null
  status: 'pendente' | 'realizado' | 'cancelado'
  feedback_emoji: string | null
  observacoes: string | null
}

interface SessaoItensRow {
  id: string
  sessao_id: string
  exercicio_id: string | null
  nome_livre: string | null
  ordem: number
  series: number | null
  repeticoes: string | null
  carga_kg: number | null
  descanso_seg: number | null
  observacoes: string | null
}

interface TreinosAerobicosRow {
  id: string
  aluno_id: string
  ciclo_id: string | null
  nome: string
  objetivo: string | null
  modalidade: string | null
  nivel: string | null
  duracao_estimada_min: number | null
  distancia_estimada_km: number | null
  intensidade_principal: string | null
  local_sugerido: string | null
  tags: string[] | null
  obrigatorio: boolean
  conta_score_semanal: boolean
  conta_missao_semanal: boolean
  sincroniza_garmin_strava: boolean
  data_prevista: string | null
  status: string
  criado_em: string
}

interface TreinoAerobicoBlocosRow {
  id: string
  treino_aerobico_id: string
  ordem: number
  tipo_bloco: 'aquecimento' | 'principal' | 'recuperacao' | 'volta_calma' | 'observacao_final'
  duracao_min: number | null
  distancia_km: number | null
  velocidade_kmh: number | null
  pace_min_km: string | null
  zona_fc: string | null
  pse: number | null
  inclinacao_pct: number | null
  repeticoes: number | null
  observacao_treinador: string | null
}

interface FeedbacksTreinoRow {
  id: string
  aluno_id: string
  sessao_id: string | null
  treino_aerobico_id: string | null
  completou: boolean | null
  pse_final: number | null
  sentiu_dor: boolean
  descricao_dor: string | null
  observacoes_livres: string | null
  criado_em: string
}

interface FeedbacksSemanaisRow {
  id: string
  aluno_id: string
  semana_referencia: string
  treinos_feitos: number | null
  cardios_feitos: number | null
  sentiu_dor: boolean
  descricao_dor: string | null
  evoluiu_carga_reps: string | null
  energia: string | null
  exercicio_dificuldade: string | null
  treino_mais_dificil: string | null
  treino_melhor_semana: string | null
  aderencia_0_10: number | null
  o_que_atrapalhou: string | null
  duvida_semana: string | null
  peso_atual: number | null
  criado_em: string
}

interface PendenciasRow {
  id: string
  aluno_id: string
  tipo: 'treino' | 'duvida' | 'financeiro' | 'feedback' | 'avaliacao'
  prioridade: 'urgente' | 'alta' | 'media' | 'baixa'
  descricao: string
  resolvida: boolean
  criado_em: string
}

interface AnotacoesRow {
  id: string
  aluno_id: string
  autor_id: string
  texto: string
  tipo: 'geral' | 'saude' | 'comportamento' | 'treino' | 'financeiro'
  criado_em: string
}

interface HistoricoAjustesRow {
  id: string
  aluno_id: string
  autor_id: string
  o_que_foi_alterado: string
  motivo: string | null
  resposta_aluno: string | null
  criado_em: string
}

interface FotosAlunosRow {
  id: string
  aluno_id: string
  foto_url: string
  tipo: string | null
  observacao: string | null
  criado_em: string
}

interface MissoesRow {
  id: string
  titulo: string
  categoria: 'treino' | 'cardio' | 'feedback' | 'comportamento'
  dificuldade: string
  pontos: number
  criado_em: string
}

interface MissoesAtribuidasRow {
  id: string
  missao_id: string
  aluno_id: string | null
  semana_referencia: string
  status: string
  cumprida_em: string | null
}

interface ScoresRow {
  id: string
  aluno_id: string
  pontos_total: number
  sequencia_atual: number
  sequencia_max: number
  aderencia_mes: number
  nivel: number
  xp: number
  criado_em: string
  atualizado_em: string
}

interface ScoresSemanaisRow {
  id: string
  aluno_id: string
  semana_referencia: string
  pontos_missoes: number
  percentual_treinos: number | null
  percentual_cardio: number | null
  feedback_enviado: boolean
  videos_enviados: number
  score_total: number
  criado_em: string
}

interface BadgesRow {
  id: string
  nome: string
  descricao: string
  icone: string
  cor: string
  criterio: string
}

interface AlunoBadgesRow {
  id: string
  aluno_id: string
  badge_id: string
  conquistado_em: string
}

interface RelatoriosCicloRow {
  id: string
  ciclo_id: string
  objetivo_inicial: string | null
  resumo_realizado: string | null
  evolucao_fisica: string | null
  evolucao_carga: string | null
  evolucao_execucao: string | null
  evolucao_comportamental: string | null
  aderencia_media: number | null
  score_medio: number | null
  pontos_fortes: string | null
  pontos_a_melhorar: string | null
  foco_proximo_ciclo: string | null
  gerado_em: string
}

interface ComunicadosRow {
  id: string
  titulo: string
  conteudo: string
  tipo: 'aviso' | 'urgente' | 'novidade'
  destinatarios: string
  enviado_por: string
  enviado_em: string
}

interface ComunicadoLeiturasRow {
  id: string
  comunicado_id: string
  usuario_id: string
  lido_em: string
}

interface ExercicioAcademiasRow {
  id: string
  exercicio_id: string
  academia_id: string
  disponivel: boolean
  equipamento_necessario: string | null
}

interface IntegracoesExternasRow {
  id: string
  aluno_id: string
  tipo: 'strava' | 'garmin' | 'notion'
  token_acesso: string | null
  conectado_em: string
  ativo: boolean
}

interface DadosRealizadosAerobicoRow {
  id: string
  treino_aerobico_id: string
  fonte: string | null
  distancia_realizada_km: number | null
  duracao_realizada_min: number | null
  pace_realizado: string | null
  fc_media: number | null
  fc_maxima: number | null
  zona_realizada_predominante: string | null
  sincronizado_em: string
}

// ── Main Database interface ──
// Each table must include Relationships: [] to satisfy GenericTable constraint in @supabase/supabase-js v2.39+

export interface Database {
  public: {
    Tables: {
      usuarios: {
        Row: UsuariosRow
        Insert: Omit<UsuariosRow, 'id' | 'criado_em'> & { id?: string; criado_em?: string }
        Update: Partial<Omit<UsuariosRow, 'id'>>
        Relationships: []
      }
      academias: {
        Row: AcademiasRow
        Insert: Omit<AcademiasRow, 'id' | 'criado_em'> & { id?: string; criado_em?: string; status?: 'ativo' | 'inativo' }
        Update: Partial<Omit<AcademiasRow, 'id'>>
        Relationships: []
      }
      academia_equipamentos: {
        Row: AcademiaEquipamentosRow
        Insert: Omit<AcademiaEquipamentosRow, 'id'> & { id?: string }
        Update: Partial<Omit<AcademiaEquipamentosRow, 'id'>>
        Relationships: []
      }
      alunos: {
        Row: AlunosRow
        Insert: Omit<AlunosRow, 'id'> & { id?: string }
        Update: Partial<Omit<AlunosRow, 'id'>>
        Relationships: []
      }
      exercicios: {
        Row: ExerciciosRow
        Insert: Omit<ExerciciosRow, 'id' | 'criado_em'> & { id?: string; criado_em?: string }
        Update: Partial<Omit<ExerciciosRow, 'id'>>
        Relationships: []
      }
      ciclos: {
        Row: CiclosRow
        Insert: Omit<CiclosRow, 'id' | 'criado_em'> & { id?: string; criado_em?: string }
        Update: Partial<Omit<CiclosRow, 'id'>>
        Relationships: []
      }
      fases_ciclo: {
        Row: FasesCicloRow
        Insert: Omit<FasesCicloRow, 'id'> & { id?: string }
        Update: Partial<Omit<FasesCicloRow, 'id'>>
        Relationships: []
      }
      sessoes_treino: {
        Row: SessoesTreinoRow
        Insert: Omit<SessoesTreinoRow, 'id'> & { id?: string }
        Update: Partial<Omit<SessoesTreinoRow, 'id'>>
        Relationships: []
      }
      sessao_itens: {
        Row: SessaoItensRow
        Insert: Omit<SessaoItensRow, 'id'> & { id?: string }
        Update: Partial<Omit<SessaoItensRow, 'id'>>
        Relationships: []
      }
      treinos_aerobicos: {
        Row: TreinosAerobicosRow
        Insert: Omit<TreinosAerobicosRow, 'id' | 'criado_em'> & { id?: string; criado_em?: string }
        Update: Partial<Omit<TreinosAerobicosRow, 'id'>>
        Relationships: []
      }
      treino_aerobico_blocos: {
        Row: TreinoAerobicoBlocosRow
        Insert: Omit<TreinoAerobicoBlocosRow, 'id'> & { id?: string }
        Update: Partial<Omit<TreinoAerobicoBlocosRow, 'id'>>
        Relationships: []
      }
      feedbacks_treino: {
        Row: FeedbacksTreinoRow
        Insert: Omit<FeedbacksTreinoRow, 'id' | 'criado_em'> & { id?: string; criado_em?: string }
        Update: Partial<Omit<FeedbacksTreinoRow, 'id'>>
        Relationships: []
      }
      feedbacks_semanais: {
        Row: FeedbacksSemanaisRow
        Insert: Omit<FeedbacksSemanaisRow, 'id' | 'criado_em'> & { id?: string; criado_em?: string }
        Update: Partial<Omit<FeedbacksSemanaisRow, 'id'>>
        Relationships: []
      }
      pendencias: {
        Row: PendenciasRow
        Insert: Omit<PendenciasRow, 'id' | 'criado_em'> & { id?: string; criado_em?: string }
        Update: Partial<Omit<PendenciasRow, 'id'>>
        Relationships: []
      }
      anotacoes: {
        Row: AnotacoesRow
        Insert: Omit<AnotacoesRow, 'id' | 'criado_em'> & { id?: string; criado_em?: string }
        Update: Partial<Omit<AnotacoesRow, 'id'>>
        Relationships: []
      }
      historico_ajustes: {
        Row: HistoricoAjustesRow
        Insert: Omit<HistoricoAjustesRow, 'id' | 'criado_em'> & { id?: string; criado_em?: string }
        Update: Partial<Omit<HistoricoAjustesRow, 'id'>>
        Relationships: []
      }
      fotos_alunos: {
        Row: FotosAlunosRow
        Insert: Omit<FotosAlunosRow, 'id' | 'criado_em'> & { id?: string; criado_em?: string }
        Update: Partial<Omit<FotosAlunosRow, 'id'>>
        Relationships: []
      }
      missoes: {
        Row: MissoesRow
        Insert: Omit<MissoesRow, 'id' | 'criado_em'> & { id?: string; criado_em?: string }
        Update: Partial<Omit<MissoesRow, 'id'>>
        Relationships: []
      }
      missoes_atribuidas: {
        Row: MissoesAtribuidasRow
        Insert: Omit<MissoesAtribuidasRow, 'id'> & { id?: string }
        Update: Partial<Omit<MissoesAtribuidasRow, 'id'>>
        Relationships: []
      }
      scores: {
        Row: ScoresRow
        Insert: Omit<ScoresRow, 'id' | 'criado_em' | 'atualizado_em'> & { id?: string }
        Update: Partial<Omit<ScoresRow, 'id'>>
        Relationships: []
      }
      scores_semanais: {
        Row: ScoresSemanaisRow
        Insert: Omit<ScoresSemanaisRow, 'id' | 'criado_em'> & { id?: string; criado_em?: string }
        Update: Partial<Omit<ScoresSemanaisRow, 'id'>>
        Relationships: []
      }
      badges: {
        Row: BadgesRow
        Insert: Omit<BadgesRow, 'id'> & { id?: string }
        Update: Partial<Omit<BadgesRow, 'id'>>
        Relationships: []
      }
      aluno_badges: {
        Row: AlunoBadgesRow
        Insert: Omit<AlunoBadgesRow, 'id' | 'conquistado_em'> & { id?: string; conquistado_em?: string }
        Update: Partial<Omit<AlunoBadgesRow, 'id'>>
        Relationships: []
      }
      relatorios_ciclo: {
        Row: RelatoriosCicloRow
        Insert: Omit<RelatoriosCicloRow, 'id' | 'gerado_em'> & { id?: string; gerado_em?: string }
        Update: Partial<Omit<RelatoriosCicloRow, 'id'>>
        Relationships: []
      }
      comunicados: {
        Row: ComunicadosRow
        Insert: Omit<ComunicadosRow, 'id' | 'enviado_em'> & { id?: string; enviado_em?: string }
        Update: Partial<Omit<ComunicadosRow, 'id'>>
        Relationships: []
      }
      comunicado_leituras: {
        Row: ComunicadoLeiturasRow
        Insert: Omit<ComunicadoLeiturasRow, 'id' | 'lido_em'> & { id?: string; lido_em?: string }
        Update: Partial<Omit<ComunicadoLeiturasRow, 'id'>>
        Relationships: []
      }
      exercicio_academias: {
        Row: ExercicioAcademiasRow
        Insert: Omit<ExercicioAcademiasRow, 'id'> & { id?: string }
        Update: Partial<Omit<ExercicioAcademiasRow, 'id'>>
        Relationships: []
      }
      integracoes_externas: {
        Row: IntegracoesExternasRow
        Insert: Omit<IntegracoesExternasRow, 'id' | 'conectado_em'> & { id?: string; conectado_em?: string }
        Update: Partial<Omit<IntegracoesExternasRow, 'id'>>
        Relationships: []
      }
      dados_realizados_aerobico: {
        Row: DadosRealizadosAerobicoRow
        Insert: Omit<DadosRealizadosAerobicoRow, 'id' | 'sincronizado_em'> & { id?: string; sincronizado_em?: string }
        Update: Partial<Omit<DadosRealizadosAerobicoRow, 'id'>>
        Relationships: []
      }
    }
    Views: {}
    Functions: {}
    Enums: {}
  }
}

// ── Convenience types ──

export type Usuario = UsuariosRow
export type Aluno = AlunosRow
export type Academia = AcademiasRow
export type Exercicio = ExerciciosRow
export type Ciclo = CiclosRow
export type FaseCiclo = FasesCicloRow
export type SessaoTreino = SessoesTreinoRow
export type SessaoItem = SessaoItensRow
export type TreinoAerobico = TreinosAerobicosRow
export type TreinoAerobicoBlocos = TreinoAerobicoBlocosRow
export type FeedbackTreino = FeedbacksTreinoRow
export type FeedbackSemanal = FeedbacksSemanaisRow
export type Pendencia = PendenciasRow
export type Anotacao = AnotacoesRow
export type Missao = MissoesRow
export type Score = ScoresRow
export type Badge = BadgesRow
export type Comunicado = ComunicadosRow

export type AlunoComUsuario = Aluno & {
  usuario: Usuario
  academia: Academia | null
  score: Score | null
  pendencias_count?: number
}

export type SessaoComItens = SessaoTreino & {
  sessao_itens: (SessaoItem & { exercicio: Exercicio | null })[]
}

export type TreinoAerobicoComBlocos = TreinoAerobico & {
  treino_aerobico_blocos: TreinoAerobicoBlocos[]
}
