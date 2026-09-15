import { describe, it, expect } from 'vitest'
import { assignmentsToFormValues } from '../convert'
import type { ExtractedNode } from '../types'

const makeNode = (overrides: Partial<ExtractedNode> & { text: string; assignment: ExtractedNode['assignment'] }): ExtractedNode => ({
  id: 'node-0',
  truncatedText: overrides.text.slice(0, 120),
  tagName: 'p',
  ...overrides,
})

describe('assignmentsToFormValues', () => {
  it('maps position and company as direct text', () => {
    const nodes = [
      makeNode({ id: 'n1', text: 'React Native Developer', assignment: 'position' }),
      makeNode({ id: 'n2', text: 'DIGITAL ONUS S.A. de C.V.', assignment: 'company' }),
    ]
    const values = assignmentsToFormValues(nodes)
    expect(values.position).toBe('React Native Developer')
    expect(values.company).toBe('DIGITAL ONUS S.A. de C.V.')
  })

  it('parses salary into min, max, currency, period', () => {
    const nodes = [
      makeNode({ text: '$80,000 - $95,000 MXN mensual', assignment: 'salary' }),
    ]
    const values = assignmentsToFormValues(nodes)
    expect(values.salaryMin).toBe('80000')
    expect(values.salaryMax).toBe('95000')
    expect(values.salaryCurrency).toBe('MXN')
    expect(values.salaryPeriod).toBe('monthly')
  })

  it('normalizes level from text', () => {
    const nodes = [
      makeNode({ text: 'Senior Backend Developer', assignment: 'level' }),
    ]
    const values = assignmentsToFormValues(nodes)
    expect(values.level).toBe('senior')
  })

  it('normalizes type from text', () => {
    const nodes = [
      makeNode({ text: 'Tiempo completo', assignment: 'type' }),
    ]
    const values = assignmentsToFormValues(nodes)
    expect(values.type).toBe('full-time')
  })

  it('normalizes modality from text', () => {
    const nodes = [
      makeNode({ text: 'Trabajo remoto', assignment: 'modality' }),
    ]
    const values = assignmentsToFormValues(nodes)
    expect(values.modality).toBe('remote')
  })

  it('appends location to notes', () => {
    const nodes = [
      makeNode({ text: 'Zapopan, Jalisco', assignment: 'location' }),
    ]
    const values = assignmentsToFormValues(nodes)
    expect(values.notes).toBe('Ubicacion: Zapopan, Jalisco')
  })

  it('concatenates multiple notes assignments', () => {
    const nodes = [
      makeNode({ id: 'n1', text: 'First description block', assignment: 'notes' }),
      makeNode({ id: 'n2', text: 'Second description block', assignment: 'notes' }),
    ]
    const values = assignmentsToFormValues(nodes)
    expect(values.notes).toBe('First description block\nSecond description block')
  })

  it('combines location and notes into single notes field', () => {
    const nodes = [
      makeNode({ id: 'n1', text: 'Zapopan, Jalisco', assignment: 'location' }),
      makeNode({ id: 'n2', text: 'Detailed job description here', assignment: 'notes' }),
    ]
    const values = assignmentsToFormValues(nodes)
    expect(values.notes).toBe('Ubicacion: Zapopan, Jalisco\nDetailed job description here')
  })

  it('ignores nodes assigned to none', () => {
    const nodes = [
      makeNode({ id: 'n1', text: 'Some irrelevant text', assignment: 'none' }),
      makeNode({ id: 'n2', text: 'Engineer', assignment: 'position' }),
    ]
    const values = assignmentsToFormValues(nodes)
    expect(values.position).toBe('Engineer')
    expect(Object.keys(values)).toEqual(['position'])
  })

  it('handles empty node list', () => {
    const values = assignmentsToFormValues([])
    expect(values).toEqual({})
  })
})
