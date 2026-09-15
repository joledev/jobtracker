import { describe, it, expect } from 'vitest'
import { genericParser } from '../generic'
import { parseJobHtml } from '../index'

const createDoc = (html: string): Document => {
  const parser = new DOMParser()
  return parser.parseFromString(html, 'text/html')
}

describe('generic parser - JSON-LD', () => {
  const html = `
    <html>
      <head>
        <script type="application/ld+json">
          {
            "@context": "https://schema.org",
            "@type": "JobPosting",
            "title": "Backend Developer",
            "hiringOrganization": {
              "name": "Acme Corp"
            },
            "jobLocation": {
              "address": {
                "addressLocality": "Guadalajara",
                "addressRegion": "Jalisco"
              }
            },
            "baseSalary": {
              "currency": "MXN",
              "value": {
                "minValue": 25000,
                "maxValue": 40000,
                "unitText": "MONTH"
              }
            },
            "description": "<p>Looking for a developer with Python and Django experience.</p>",
            "employmentType": "FULL_TIME",
            "jobLocationType": "TELECOMMUTE"
          }
        </script>
      </head>
      <body>
        <h1>Backend Developer</h1>
      </body>
    </html>
  `

  it('always detects (fallback)', () => {
    const doc = createDoc(html)
    expect(genericParser.detect(doc, html)).toBe(true)
  })

  it('parses JSON-LD JobPosting', () => {
    const doc = createDoc(html)
    const offer = genericParser.parse(doc, html)
    expect(offer.position).toBe('Backend Developer')
    expect(offer.company).toBe('Acme Corp')
    expect(offer.location).toBe('Guadalajara, Jalisco')
    expect(offer.salaryMin).toBe(25000)
    expect(offer.salaryMax).toBe(40000)
    expect(offer.salaryCurrency).toBe('MXN')
    expect(offer.salaryPeriod).toBe('monthly')
    expect(offer.modality).toBe('remote')
    expect(offer.type).toBe('full-time')
    expect(offer.technologies).toContain('Python')
    expect(offer.technologies).toContain('Django')
  })
})

describe('generic parser - JSON-LD in @graph', () => {
  const html = `
    <html>
      <head>
        <script type="application/ld+json">
          {
            "@context": "https://schema.org",
            "@graph": [
              { "@type": "Organization", "name": "SomeOrg" },
              {
                "@type": "JobPosting",
                "title": "Frontend Dev",
                "hiringOrganization": "GraphCorp",
                "description": "React and Vue experience needed."
              }
            ]
          }
        </script>
      </head>
      <body><h1>Frontend Dev</h1></body>
    </html>
  `

  it('parses JobPosting from @graph', () => {
    const doc = createDoc(html)
    const offer = genericParser.parse(doc, html)
    expect(offer.position).toBe('Frontend Dev')
    expect(offer.company).toBe('GraphCorp')
    expect(offer.technologies).toContain('React')
    expect(offer.technologies).toContain('Vue')
  })
})

describe('generic parser - fallback to heuristics', () => {
  const html = `
    <html>
      <head>
        <meta property="og:site_name" content="JobBoard" />
      </head>
      <body>
        <h1>Data Engineer</h1>
        <p>We need someone with Python, PostgreSQL, and Docker experience. Full-time remote.</p>
      </body>
    </html>
  `

  it('uses h1 and og:site_name when no JSON-LD', () => {
    const doc = createDoc(html)
    const offer = genericParser.parse(doc, html)
    expect(offer.position).toBe('Data Engineer')
    expect(offer.company).toBe('JobBoard')
    expect(offer.modality).toBe('remote')
    expect(offer.type).toBe('full-time')
    expect(offer.technologies).toContain('Python')
    expect(offer.technologies).toContain('PostgreSQL')
    expect(offer.technologies).toContain('Docker')
  })
})

describe('parseJobHtml with templates', () => {
  it('applies custom template before platform detection', () => {
    const html = `
      <html><body>
        <span class="my-title">Custom Dev Role</span>
        <span class="my-company">CustomCorp</span>
      </body></html>
    `
    const templates = [{
      id: '1',
      name: 'My Template',
      platform: 'CustomBoard',
      selectors: { position: '.my-title', company: '.my-company' },
      createdAt: '2024-01-01',
    }]
    const result = parseJobHtml(html, templates)
    expect(result.offer.position).toBe('Custom Dev Role')
    expect(result.offer.company).toBe('CustomCorp')
    expect(result.confidence).toBe(0.7)
  })
})
