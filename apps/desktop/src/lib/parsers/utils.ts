export const getText = (doc: Document, selector: string): string | undefined => {
  const el = doc.querySelector(selector)
  const text = el?.textContent?.trim()
  return text || undefined
}

export const getAttr = (doc: Document, selector: string, attr: string): string | undefined => {
  const el = doc.querySelector(selector)
  return el?.getAttribute(attr) || undefined
}

export const getAllText = (doc: Document, selector: string): string[] => {
  const els = doc.querySelectorAll(selector)
  return Array.from(els).map((el) => el.textContent?.trim() || '').filter(Boolean)
}

export const htmlToText = (html: string): string =>
  html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()

export const truncate = (text: string, maxLen: number): string =>
  text.length <= maxLen ? text : text.slice(0, maxLen) + '...'

interface SalaryInfo {
  min?: number
  max?: number
  currency?: string
  period?: string
}

const currencyPatterns: [RegExp, string][] = [
  [/\busd\b|us\$/i, 'USD'],
  [/\beur\b|€|\beuros?\b/i, 'EUR'],
  [/\bgbp\b|£/i, 'GBP'],
  [/\bars\b/i, 'ARS'],
  [/\bmxn\b|\bpesos?\b|\$/i, 'MXN'],
]

const periodMap: Record<string, string> = {
  mensual: 'monthly', mes: 'monthly', month: 'monthly', monthly: 'monthly', '/mes': 'monthly',
  anual: 'annual', 'año': 'annual', year: 'annual', annual: 'annual', yearly: 'annual', '/año': 'annual',
  hora: 'hourly', hour: 'hourly', hourly: 'hourly', '/hora': 'hourly',
}

export const parseSalary = (text: string): SalaryInfo => {
  const result: SalaryInfo = {}
  const normalized = text.toLowerCase().replace(/,/g, '')

  const rangeMatch = normalized.match(/[$€£]?\s*([\d.]+)\s*[-–a]\s*[$€£]?\s*([\d.]+)/)
  const singleMatch = !rangeMatch && normalized.match(/[$€£]?\s*([\d.]+)/)

  if (rangeMatch) {
    result.min = Math.round(parseFloat(rangeMatch[1]))
    result.max = Math.round(parseFloat(rangeMatch[2]))
  } else if (singleMatch) {
    result.min = Math.round(parseFloat(singleMatch[1]))
  }

  for (const [pattern, value] of currencyPatterns) {
    if (pattern.test(normalized)) {
      result.currency = value
      break
    }
  }

  for (const [key, value] of Object.entries(periodMap)) {
    if (normalized.includes(key)) {
      result.period = value
      break
    }
  }

  return result
}

export const parseModality = (text: string): string | undefined => {
  const lower = text.toLowerCase()
  if (/\b(remoto|remote|home\s*office|trabajo\s*remoto|100%\s*remoto)\b/.test(lower)) return 'remote'
  if (/\b(h[ií]brid[oa]|hybrid)\b/.test(lower)) return 'hybrid'
  if (/\b(presencial|on-?\s*site|en\s*oficina)\b/.test(lower)) return 'onsite'
  return undefined
}

export const parseLevel = (text: string): string | undefined => {
  const lower = text.toLowerCase()
  if (/\b(staff|principal)\b/.test(lower)) return 'staff'
  if (/\b(architect|arquitecto)\b/.test(lower)) return 'architect'
  if (/\b(mid|semi[-\s]?senior|middle)\b/.test(lower)) return 'mid'
  if (/\b(senior|sr\.?|ssr)\b/.test(lower)) return 'senior'
  if (/\b(junior|jr\.?|trainee|entry[-\s]?level)\b/.test(lower)) return 'junior'
  return undefined
}

export const parseJobType = (text: string): string | undefined => {
  const lower = text.toLowerCase()
  if (/\b(tiempo\s*completo|full[-_\s]?time|jornada\s*completa)\b/.test(lower)) return 'full-time'
  if (/\b(contrato|contract|temporal|temporary)\b/.test(lower)) return 'contract'
  if (/\b(freelance|independiente|autónomo)\b/.test(lower)) return 'freelance'
  if (/\b(medio\s*tiempo|part[-_\s]?time|media\s*jornada)\b/.test(lower)) return 'part-time'
  return undefined
}

const TECH_LIST = [
  'JavaScript', 'TypeScript', 'Python', 'Java', 'C#', 'Go', 'Rust', 'Ruby', 'PHP', 'Swift',
  'Kotlin', 'Scala', 'Elixir', 'Clojure', 'Haskell', 'Dart', 'Lua', 'Perl', 'R',
  'React', 'Vue', 'Angular', 'Svelte', 'Next.js', 'Nuxt', 'Remix', 'Astro',
  'Node.js', 'Express', 'Fastify', 'NestJS', 'Django', 'Flask', 'FastAPI', 'Spring',
  'Rails', 'Laravel', '.NET', 'ASP.NET',
  'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'SQLite', 'DynamoDB', 'Cassandra', 'Elasticsearch',
  'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP', 'Terraform', 'Ansible', 'Jenkins', 'GitHub Actions',
  'GraphQL', 'REST', 'gRPC', 'Kafka', 'RabbitMQ',
  'TailwindCSS', 'Tailwind', 'CSS', 'SASS', 'SCSS',
  'Flutter', 'React Native', 'SwiftUI',
  'Git', 'Linux', 'Nginx', 'Figma',
]

export const extractTechnologies = (text: string, customKeywords?: string[]): string[] => {
  const allKeywords = customKeywords
    ? [...TECH_LIST, ...customKeywords.filter(k => !TECH_LIST.some(t => t.toLowerCase() === k.toLowerCase()))]
    : TECH_LIST
  const found: string[] = []
  for (const tech of allKeywords) {
    const escaped = tech.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(`\\b${escaped}\\b`, 'i')
    if (regex.test(text)) {
      if (!found.some((f) => f.toLowerCase() === tech.toLowerCase())) {
        found.push(tech)
      }
    }
  }
  return found
}
