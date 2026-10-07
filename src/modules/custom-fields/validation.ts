// Módulo puro: validação e formatação de campos personalizados, sem imports de servidor.
export type CustomFieldDef = {
  key: string
  label: string
  type: 'text' | 'number' | 'date' | 'boolean' | 'select'
  options: string[]
  required: boolean
}

export type CustomFieldRow = CustomFieldDef & {
  id: number
  showInTable: boolean
  position: number
}

export function slugifyFieldKey(label: string): string | null {
  const key = label
    .normalize('NFD')
    .replace(/\p{Mn}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64)
  return /^[a-z]/.test(key) ? key : null
}

// Aceita pt-BR ("1.234,5") e decimal com ponto; permite sinal negativo.
function parseNumber(value: string): number | null {
  const negative = value.startsWith('-')
  const v = negative ? value.slice(1) : value

  let normalized: string
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(v)) {
    normalized = v.replace(/\./g, '').replace(',', '.')
  } else if (/^\d+(,\d+)?$/.test(v)) {
    normalized = v.replace(',', '.')
  } else if (/^\d+\.\d+$/.test(v)) {
    normalized = v
  } else {
    return null
  }

  const n = Number(normalized)
  if (!Number.isFinite(n)) return null
  return negative ? -n : n
}

function isValidDate(value: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!m) return false
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const dt = new Date(Date.UTC(y, mo - 1, d))
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d
}

export type CustomFieldValues = Record<string, string | number | boolean | null>

export function parseCustomFieldValues(
  defs: CustomFieldDef[],
  formData: FormData,
): { ok: true; values: CustomFieldValues } | { ok: false; error: string } {
  const values: CustomFieldValues = {}

  for (const def of defs) {
    const raw = formData.get(`cf_${def.key}`)

    if (def.type === 'boolean') {
      const checked = raw !== null
      if (def.required && !checked) {
        return { ok: false, error: `${def.label} é obrigatório` }
      }
      values[def.key] = checked
      continue
    }

    const text = typeof raw === 'string' ? raw.trim() : ''
    if (text === '') {
      if (def.required) return { ok: false, error: `${def.label} é obrigatório` }
      values[def.key] = null
      continue
    }

    switch (def.type) {
      case 'text':
        if (text.length > 1000) {
          return { ok: false, error: `${def.label} excede 1000 caracteres` }
        }
        values[def.key] = text
        break
      case 'number': {
        const n = parseNumber(text)
        if (n === null) return { ok: false, error: `${def.label} deve ser um número válido` }
        values[def.key] = n
        break
      }
      case 'date':
        if (!isValidDate(text)) {
          return { ok: false, error: `${def.label} deve ser uma data válida` }
        }
        values[def.key] = text
        break
      case 'select':
        if (!def.options.includes(text)) {
          return { ok: false, error: `${def.label} tem valor inválido` }
        }
        values[def.key] = text
        break
    }
  }

  return { ok: true, values }
}

// Representação de edição sem agrupamento e sem expoente, round-trip exato com parseNumber:
// parte de String(n) (menor representação que volta ao mesmo double) e expande o expoente.
// Verificado pelo PM: 1,234; -1,234; 1e-21; 5e-324; Number.MAX_VALUE; 0,1; 19,99 e 200k valores aleatórios.
export function formatNumberForInput(n: number): string {
  if (Object.is(n, -0)) n = 0
  const s = String(n)
  const m = /^(-?)(\d+)(?:\.(\d+))?e([+-]\d+)$/.exec(s)
  if (!m) return s.replace('.', ',')
  const [, sign, intPart, fracPart = '', expStr] = m
  const digits = intPart + fracPart
  const point = intPart.length + Number(expStr)
  let out: string
  if (point <= 0) out = '0,' + '0'.repeat(-point) + digits
  else if (point >= digits.length) out = digits + '0'.repeat(point - digits.length)
  else out = digits.slice(0, point) + ',' + digits.slice(point)
  return sign + out
}

export function formatCustomFieldValue(def: CustomFieldDef, value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'

  switch (def.type) {
    case 'boolean':
      return value === true ? 'Sim' : 'Não'
    case 'number': {
      const n = typeof value === 'number' ? value : Number(value)
      return Number.isFinite(n) ? n.toLocaleString('pt-BR') : '—'
    }
    case 'date': {
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value))
      return m ? `${m[3]}/${m[2]}/${m[1]}` : '—'
    }
    default:
      return String(value)
  }
}
