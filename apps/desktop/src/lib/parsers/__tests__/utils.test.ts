import { describe, it, expect } from 'vitest'
import { parseSalary, parseModality, parseLevel, parseJobType, extractTechnologies, htmlToText } from '../utils'

describe('parseSalary', () => {
  it('parses salary range with currency', () => {
    const result = parseSalary('$30,000 - $45,000 MXN mensual')
    expect(result.min).toBe(30000)
    expect(result.max).toBe(45000)
    expect(result.currency).toBe('MXN')
    expect(result.period).toBe('monthly')
  })

  it('parses salary range with USD annual', () => {
    const result = parseSalary('$80,000 - $120,000 USD annual')
    expect(result.min).toBe(80000)
    expect(result.max).toBe(120000)
    expect(result.currency).toBe('USD')
    expect(result.period).toBe('annual')
  })

  it('parses single salary value', () => {
    const result = parseSalary('$50,000 MXN')
    expect(result.min).toBe(50000)
    expect(result.max).toBeUndefined()
    expect(result.currency).toBe('MXN')
  })

  it('parses euros with hourly rate', () => {
    const result = parseSalary('€25 - €40 por hora')
    expect(result.min).toBe(25)
    expect(result.max).toBe(40)
    expect(result.currency).toBe('EUR')
    expect(result.period).toBe('hourly')
  })

  it('returns empty for no salary info', () => {
    const result = parseSalary('No salary information')
    expect(result.min).toBeUndefined()
    expect(result.max).toBeUndefined()
  })
})

describe('parseModality', () => {
  it('detects remote', () => {
    expect(parseModality('Trabajo remoto desde casa')).toBe('remote')
    expect(parseModality('100% Remote position')).toBe('remote')
    expect(parseModality('Home office disponible')).toBe('remote')
  })

  it('detects hybrid', () => {
    expect(parseModality('Modalidad híbrida')).toBe('hybrid')
    expect(parseModality('Hybrid work model')).toBe('hybrid')
  })

  it('detects onsite', () => {
    expect(parseModality('Trabajo presencial')).toBe('onsite')
    expect(parseModality('On-site in CDMX')).toBe('onsite')
  })

  it('returns undefined for unknown', () => {
    expect(parseModality('Great opportunity')).toBeUndefined()
  })
})

describe('parseLevel', () => {
  it('detects senior', () => {
    expect(parseLevel('Senior Backend Engineer')).toBe('senior')
    expect(parseLevel('Sr. Developer')).toBe('senior')
  })

  it('detects junior', () => {
    expect(parseLevel('Junior Frontend Developer')).toBe('junior')
    expect(parseLevel('Jr. React Dev')).toBe('junior')
    expect(parseLevel('Entry-level position')).toBe('junior')
  })

  it('detects staff', () => {
    expect(parseLevel('Staff Engineer')).toBe('staff')
    expect(parseLevel('Principal Software Engineer')).toBe('staff')
  })

  it('detects architect', () => {
    expect(parseLevel('Software Architect')).toBe('architect')
  })

  it('detects mid', () => {
    expect(parseLevel('Mid-level Developer')).toBe('mid')
    expect(parseLevel('Semi-senior Engineer')).toBe('mid')
  })

  it('returns undefined for unspecified', () => {
    expect(parseLevel('Software Developer')).toBeUndefined()
  })
})

describe('parseJobType', () => {
  it('detects full-time', () => {
    expect(parseJobType('Tiempo completo')).toBe('full-time')
    expect(parseJobType('Full-time position')).toBe('full-time')
  })

  it('detects contract', () => {
    expect(parseJobType('Contrato temporal')).toBe('contract')
    expect(parseJobType('Contract role')).toBe('contract')
  })

  it('detects freelance', () => {
    expect(parseJobType('Freelance project')).toBe('freelance')
  })

  it('detects part-time', () => {
    expect(parseJobType('Part-time opportunity')).toBe('part-time')
    expect(parseJobType('Medio tiempo')).toBe('part-time')
  })

  it('returns undefined for unknown', () => {
    expect(parseJobType('Great job')).toBeUndefined()
  })
})

describe('extractTechnologies', () => {
  it('extracts technologies from text', () => {
    const result = extractTechnologies('We use React, TypeScript, Node.js and PostgreSQL')
    expect(result).toContain('React')
    expect(result).toContain('TypeScript')
    expect(result).toContain('Node.js')
    expect(result).toContain('PostgreSQL')
  })

  it('does not duplicate', () => {
    const result = extractTechnologies('React React React')
    expect(result.filter((t) => t === 'React')).toHaveLength(1)
  })

  it('returns empty for no tech', () => {
    const result = extractTechnologies('We are looking for a great person')
    expect(result).toEqual([])
  })
})

describe('htmlToText', () => {
  it('strips HTML tags', () => {
    expect(htmlToText('<p>Hello <strong>world</strong></p>')).toBe('Hello world')
  })

  it('strips scripts and styles', () => {
    expect(htmlToText('<script>alert("x")</script><p>Content</p>')).toBe('Content')
    expect(htmlToText('<style>.foo{}</style><p>Content</p>')).toBe('Content')
  })

  it('decodes HTML entities', () => {
    expect(htmlToText('&amp; &lt; &gt; &quot; &#39;')).toBe('& < > " \'')
  })

  it('normalizes whitespace', () => {
    expect(htmlToText('<p>  Multiple   spaces  </p>')).toBe('Multiple spaces')
  })
})
