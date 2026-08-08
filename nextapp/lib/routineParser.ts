export interface RoutineRow {
  treino: string           // 'A', 'B', 'C', etc.
  diaSemana?: string       // 'Segunda', 'Quarta', etc.
  exercicio: string        // raw name from template
  series: number | null
  reps: string
  carga: string            // raw string (may be "14kg c/ lado", "sem carga")
  cargaKg: number | null   // parsed numeric part
  intervaloSeg: number | null
  combinadoCom?: string    // name of biset partner
  instrucoes?: string
}

export interface ParsedRoutine {
  nome: string
  aluno?: string
  objetivo?: string
  nivel?: string
  dataInicio?: string  // ISO YYYY-MM-DD
  dataFim?: string     // ISO YYYY-MM-DD
  rows: RoutineRow[]
  treinoLetras: string[] // unique, in insertion order
}

// ── helpers ─────────────────────────────────────────────────────────────────

function parseDateBR(s: string): string | undefined {
  const m = s.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  return m ? `${m[3]}-${m[2]}-${m[1]}` : undefined
}

function parseSeries(s: string): number | null {
  const n = parseInt(s)
  return isNaN(n) ? null : n
}

function parseCargaKg(s: string): number | null {
  if (!s || s.toLowerCase().includes('sem carga')) return null
  // Extract only the FIRST numeric token — avoids "60-70kg" → 6070
  const m = s.match(/(\d+[.,]?\d*)/)
  if (!m) return null
  const num = parseFloat(m[1].replace(',', '.'))
  return isNaN(num) ? null : num
}

function parseIntervaloSeg(s: string): number | null {
  if (!s) return null
  const num = parseInt(s.replace(/[^\d]/g, ''))
  return isNaN(num) ? null : num
}

// Detect and strip a separator row like |---|----|---|
function isSeparatorRow(line: string): boolean {
  return /^\|[\s\-|]+\|$/.test(line.trim())
}

// Parse a pipe-delimited row into trimmed columns
function splitPipe(line: string): string[] {
  // Remove leading/trailing pipes if present
  let s = line.trim()
  if (s.startsWith('|')) s = s.slice(1)
  if (s.endsWith('|')) s = s.slice(0, -1)
  return s.split('|').map(c => c.trim())
}

// Parse a CSV row, handling quoted fields
function splitCSV(line: string): string[] {
  const cols: string[] = []
  let cur = ''
  let inQuote = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQuote = !inQuote
    } else if (ch === ',' && !inQuote) {
      cols.push(cur.trim())
      cur = ''
    } else {
      cur += ch
    }
  }
  cols.push(cur.trim())
  return cols
}

const COL_ALIASES: Record<string, string> = {
  'TREINO': 'TREINO',
  'DIA_SEMANA': 'DIA_SEMANA',
  'DIA SEMANA': 'DIA_SEMANA',
  'EXERCICIO': 'EXERCICIO',
  'EXERCÍCIO': 'EXERCICIO',
  'SERIES': 'SERIES',
  'SÉRIES': 'SERIES',
  'REPS': 'REPS',
  'REPETIÇÕES': 'REPS',
  'REPETICOES': 'REPS',
  'CARGA': 'CARGA',
  'INTERVALO': 'INTERVALO',
  'COMBINADO_COM': 'COMBINADO_COM',
  'COMBINADO COM': 'COMBINADO_COM',
  'INSTRUCOES': 'INSTRUCOES',
  'INSTRUÇÕES': 'INSTRUCOES',
  'INSTRUCÕES': 'INSTRUCOES',
  'OBS': 'INSTRUCOES',
  'OBSERVACOES': 'INSTRUCOES',
}

export function parseRoutine(text: string): ParsedRoutine {
  const lines = text.split('\n')
  const meta: Record<string, string> = {}
  const rows: RoutineRow[] = []
  const treinoSet = new Map<string, true>()
  const colIndices: Record<string, number> = {}
  let hasHeader = false
  let isCSV = false

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) continue

    // ── Meta lines (# KEY: value)
    if (line.startsWith('#')) {
      const m = line.match(/^#+\s*([A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇÀ_\s]+?)\s*:\s*(.+)$/i)
      if (m) meta[m[1].trim().toUpperCase().replace(/\s+/g, '_')] = m[2].trim()
      continue
    }

    // ── Separator rows (skip)
    if (isSeparatorRow(line)) continue

    // ── Header detection
    if (!hasHeader) {
      const isPipe = line.includes('|')
      const isCsv = !isPipe && line.includes(',')
      const cols = isPipe ? splitPipe(line) : isCsv ? splitCSV(line) : null
      if (!cols) continue

      const upperCols = cols.map(c => c.toUpperCase().replace(/[*`]/g, '').trim())
      const hasTreino = upperCols.some(c => c === 'TREINO')
      const hasExercicio = upperCols.some(c => c === 'EXERCICIO' || c === 'EXERCÍCIO')

      if (hasTreino && hasExercicio) {
        isCSV = isCsv
        upperCols.forEach((c, i) => {
          const canon = COL_ALIASES[c]
          if (canon) colIndices[canon] = i
        })
        hasHeader = true
        continue
      }
    }

    // ── Data rows
    if (!hasHeader) continue
    const cols = isCSV ? splitCSV(line) : splitPipe(line)

    const get = (key: string) => (cols[colIndices[key]] ?? '').trim()

    const treino = get('TREINO')
    if (!treino || treino.toUpperCase() === 'TREINO') continue // skip repeated headers

    const exercicio = get('EXERCICIO')
    if (!exercicio) continue

    const cargaRaw = get('CARGA')

    if (!treinoSet.has(treino)) treinoSet.set(treino, true)

    rows.push({
      treino,
      diaSemana: get('DIA_SEMANA') || undefined,
      exercicio,
      series: parseSeries(get('SERIES')),
      reps: get('REPS'),
      carga: cargaRaw,
      cargaKg: parseCargaKg(cargaRaw),
      intervaloSeg: parseIntervaloSeg(get('INTERVALO')),
      combinadoCom: get('COMBINADO_COM') || undefined,
      instrucoes: get('INSTRUCOES') || undefined,
    })
  }

  return {
    nome: meta['ROTINA'] || meta['NOME'] || 'Nova Rotina',
    aluno: meta['ALUNO'],
    objetivo: meta['OBJETIVO'],
    nivel: meta['NIVEL'] || meta['NÍVEL'],
    dataInicio: meta['INICIO'] ? parseDateBR(meta['INICIO']) : undefined,
    dataFim: meta['TERMINO'] ? parseDateBR(meta['TERMINO']) : (meta['TÉRMINO'] ? parseDateBR(meta['TÉRMINO']) : undefined),
    rows,
    treinoLetras: [...treinoSet.keys()],
  }
}

// ── biset assignment ─────────────────────────────────────────────────────────

export function assignBisetGroups(rows: RoutineRow[], treinoLetra: string): Record<number, string | null> {
  const result: Record<number, string | null> = {}
  const normalize = (s: string) => s.toLowerCase().trim()
  const assignedByName = new Map<string, string>()
  let counter = 0

  rows.forEach((row, i) => {
    if (!row.combinadoCom) {
      result[i] = null
      return
    }
    const selfKey = normalize(row.exercicio)
    const partnerKey = normalize(row.combinadoCom)

    if (assignedByName.has(selfKey)) {
      result[i] = assignedByName.get(selfKey)!
    } else if (assignedByName.has(partnerKey)) {
      const group = assignedByName.get(partnerKey)!
      result[i] = group
      assignedByName.set(selfKey, group)
    } else {
      counter++
      const group = `${treinoLetra.toLowerCase()}-biset-${counter}`
      result[i] = group
      assignedByName.set(selfKey, group)
      assignedByName.set(partnerKey, group)
    }
  })

  return result
}

// ── DIA_SEMANA → number (1=seg … 7=dom, matching PT-BR convention) ──────────

export function diaSemanaToNum(s?: string): number | null {
  if (!s) return null
  const map: Record<string, number> = {
    'segunda': 1, 'terca': 2, 'terça': 2,
    'quarta': 3, 'quinta': 4, 'sexta': 5,
    'sabado': 6, 'sábado': 6, 'domingo': 7,
  }
  const key = s.toLowerCase().trim().normalize('NFD').replace(/[̀-ͯ]/g, '')
  for (const [k, v] of Object.entries(map)) {
    if (key.startsWith(k.normalize('NFD').replace(/[̀-ͯ]/g, ''))) return v
  }
  return null
}
