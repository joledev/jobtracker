import { describe, it, expect } from 'vitest'
import { occParser } from '../occ'
import { linkedinParser } from '../linkedin'
import { parseJobHtml } from '../index'

const createDoc = (html: string): Document => {
  const parser = new DOMParser()
  return parser.parseFromString(html, 'text/html')
}

describe('OCC parser', () => {
  const html = `
    <html>
      <body>
        <div data-test="job-title">Senior Backend Developer</div>
        <div data-test="company-name">Empresa Tech</div>
        <div data-test="salary">$30,000 - $45,000 MXN mensual</div>
        <div data-test="job-description">
          <p>Buscamos un desarrollador con experiencia en Node.js y PostgreSQL.</p>
          <p>Trabajo remoto. Tiempo completo.</p>
        </div>
        <a href="https://occ.com.mx/empleo/123">Ver oferta</a>
      </body>
    </html>
  `

  it('detects OCC', () => {
    const doc = createDoc(html)
    expect(occParser.detect(doc, html)).toBe(true)
  })

  it('extracts offer data', () => {
    const doc = createDoc(html)
    const offer = occParser.parse(doc, html)
    expect(offer.position).toBe('Senior Backend Developer')
    expect(offer.company).toBe('Empresa Tech')
    expect(offer.salaryMin).toBe(30000)
    expect(offer.salaryMax).toBe(45000)
    expect(offer.salaryCurrency).toBe('MXN')
    expect(offer.salaryPeriod).toBe('monthly')
    expect(offer.modality).toBe('remote')
    expect(offer.level).toBe('senior')
    expect(offer.type).toBe('full-time')
    expect(offer.technologies).toContain('Node.js')
    expect(offer.technologies).toContain('PostgreSQL')
    expect(offer.sourcePlatform).toBe('OCC')
  })
})

describe('LinkedIn parser', () => {
  const html = `
    <html>
      <body>
        <h1 class="topcard__title">Full Stack Engineer</h1>
        <a class="topcard__org-name-link">TechCorp</a>
        <span class="topcard__flavor--bullet">Mexico City</span>
        <div class="show-more-less-html__markup">
          <p>We are looking for a Full Stack Engineer with React and TypeScript experience.</p>
          <p>Hybrid model. Full-time.</p>
        </div>
        <a href="https://linkedin.com/jobs/view/123">Apply</a>
      </body>
    </html>
  `

  it('detects LinkedIn', () => {
    const doc = createDoc(html)
    expect(linkedinParser.detect(doc, html)).toBe(true)
  })

  it('extracts offer data', () => {
    const doc = createDoc(html)
    const offer = linkedinParser.parse(doc, html)
    expect(offer.position).toBe('Full Stack Engineer')
    expect(offer.company).toBe('TechCorp')
    expect(offer.location).toBe('Mexico City')
    expect(offer.modality).toBe('hybrid')
    expect(offer.type).toBe('full-time')
    expect(offer.technologies).toContain('React')
    expect(offer.technologies).toContain('TypeScript')
    expect(offer.sourcePlatform).toBe('LinkedIn')
  })
})

describe('parseJobHtml integration', () => {
  it('detects OCC and returns ParseResult', () => {
    const html = `
      <html><body>
        <div data-test="job-title">Dev</div>
        <div data-test="company-name">Corp</div>
        <a href="https://occ.com.mx">link</a>
      </body></html>
    `
    const result = parseJobHtml(html)
    expect(result.platform).toBe('OCC')
    expect(result.offer.position).toBe('Dev')
    expect(result.offer.company).toBe('Corp')
    expect(result.confidence).toBeGreaterThan(0.5)
  })

  it('falls back to generic for unknown platforms', () => {
    const html = `
      <html><body>
        <h1>Software Engineer</h1>
      </body></html>
    `
    const result = parseJobHtml(html)
    expect(result.platform).toBe('generic')
    expect(result.offer.position).toBe('Software Engineer')
    expect(result.confidence).toBeLessThanOrEqual(0.3)
  })
})
