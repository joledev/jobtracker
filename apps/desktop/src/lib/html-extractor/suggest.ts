import type { ExtractedNode, FieldAssignment } from './types'
import type { ParseTemplate } from '@/lib/parsers/types'
import { parseJobHtml } from '@/lib/parsers'
import { parseSalary, parseModality, parseJobType, parseLevel } from '@/lib/parsers/utils'

const COMPANY_PATTERNS = /\b(s\.?a\.?|llc|s\.? de r\.?l\.?|corp\.?|inc\.?|ltd\.?|gmbh|s\.?l\.?|s\.?r\.?l\.?|sapi|s\.?c\.?)\b/i

const HEADING_TAGS = new Set(['h1', 'h2'])

export const autoSuggest = (
  nodes: ExtractedNode[],
  html?: string,
  templates?: ParseTemplate[],
): ExtractedNode[] => {
  const assigned = new Set<FieldAssignment>()
  const result = nodes.map((n) => ({ ...n, assignment: 'none' as FieldAssignment }))

  // Get hints from parser if html is provided
  const hints: Record<string, string> = {}
  if (html) {
    try {
      const parsed = parseJobHtml(html, templates)
      if (parsed.confidence > 0.5 && parsed.offer) {
        const o = parsed.offer
        if (o.position) hints.position = o.position
        if (o.company) hints.company = o.company
        if (o.salaryMin || o.salaryMax) {
          hints.salary = [o.salaryMin, o.salaryMax].filter(Boolean).join('-')
        }
        if (o.modality) hints.modality = o.modality
        if (o.type) hints.type = o.type
        if (o.level) hints.level = o.level
        if (o.location) hints.location = o.location
      }
    } catch {
      // parser failed, continue without hints
    }
  }

  const assign = (index: number, field: FieldAssignment) => {
    if (field === 'notes' || !assigned.has(field)) {
      result[index].assignment = field
      assigned.add(field)
    }
  }

  // Match nodes against parser hints first
  if (hints.position) {
    const idx = result.findIndex((n) => n.text.includes(hints.position!))
    if (idx >= 0) assign(idx, 'position')
  }
  if (hints.company) {
    const idx = result.findIndex((n) => n.text.includes(hints.company!) && result[n.id as never]?.assignment !== 'position')
    if (idx >= 0 && result[idx].assignment === 'none') assign(idx, 'company')
  }

  // Heuristic rules for unassigned fields
  for (let i = 0; i < result.length; i++) {
    if (result[i].assignment !== 'none') continue
    const { text, tagName } = result[i]

    // Position: heading, < 100 chars, not a salary
    if (!assigned.has('position') && HEADING_TAGS.has(tagName) && text.length < 100) {
      const salary = parseSalary(text)
      if (!salary.min && !salary.max) {
        assign(i, 'position')
        continue
      }
    }

    // Salary
    if (!assigned.has('salary')) {
      const salary = parseSalary(text)
      if ((salary.min && salary.min > 0) || (salary.max && salary.max > 0)) {
        assign(i, 'salary')
        continue
      }
    }

    // Company
    if (!assigned.has('company') && COMPANY_PATTERNS.test(text) && text.length < 120) {
      assign(i, 'company')
      continue
    }

    // Modality
    if (!assigned.has('modality') && parseModality(text)) {
      assign(i, 'modality')
      continue
    }

    // Type
    if (!assigned.has('type') && parseJobType(text)) {
      assign(i, 'type')
      continue
    }

    // Level
    if (!assigned.has('level') && parseLevel(text) && text.length < 120) {
      assign(i, 'level')
      continue
    }

    // Location: pattern "City, State" and < 80 chars
    if (!assigned.has('location') && text.length < 80 && /^[A-ZÁ-Ú][\wáéíóúñ]+,\s*[A-ZÁ-Ú][\wáéíóúñ]+/u.test(text)) {
      assign(i, 'location')
      continue
    }

    // Notes: long text > 200 chars
    if (text.length > 200) {
      assign(i, 'notes')
    }
  }

  return result
}
