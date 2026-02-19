import { describe, it, expect } from 'vitest'
import { extractTextNodes } from '../extract'

describe('extractTextNodes', () => {
  it('extracts text from simple HTML', () => {
    const html = `
      <div>
        <h1>Software Engineer</h1>
        <p>ACME Corp</p>
        <p>$80,000 - $95,000 mensual</p>
      </div>
    `
    const nodes = extractTextNodes(html)
    expect(nodes.length).toBe(3)
    expect(nodes[0].text).toBe('Software Engineer')
    expect(nodes[0].tagName).toBe('h1')
    expect(nodes[1].text).toBe('ACME Corp')
    expect(nodes[2].text).toContain('$80,000')
  })

  it('skips script, style, nav, footer tags', () => {
    const html = `
      <div>
        <h1>Job Title</h1>
        <script>var x = 1;</script>
        <style>.foo { color: red; }</style>
        <nav><a>Home</a></nav>
        <footer>Copyright 2024</footer>
      </div>
    `
    const nodes = extractTextNodes(html)
    expect(nodes.length).toBe(1)
    expect(nodes[0].text).toBe('Job Title')
  })

  it('filters texts shorter than 3 chars', () => {
    const html = `
      <div>
        <p>OK</p>
        <p>Yes this is long enough</p>
      </div>
    `
    const nodes = extractTextNodes(html)
    expect(nodes.length).toBe(1)
    expect(nodes[0].text).toBe('Yes this is long enough')
  })

  it('deduplicates identical texts', () => {
    const html = `
      <div>
        <p>Same text here</p>
        <p>Same text here</p>
        <p>Different text</p>
      </div>
    `
    const nodes = extractTextNodes(html)
    expect(nodes.length).toBe(2)
  })

  it('prefers child text over parent when child has block element', () => {
    const html = `
      <div>
        <div>
          <p>Child paragraph</p>
          <p>Another paragraph</p>
        </div>
      </div>
    `
    const nodes = extractTextNodes(html)
    expect(nodes.some((n) => n.text === 'Child paragraph')).toBe(true)
    expect(nodes.some((n) => n.text === 'Another paragraph')).toBe(true)
    // Should not have a node with both texts combined
    expect(nodes.every((n) => !n.text.includes('Child paragraph') || n.text === 'Child paragraph')).toBe(true)
  })

  it('truncates display text to 120 chars', () => {
    const longText = 'A'.repeat(200)
    const html = `<p>${longText}</p>`
    const nodes = extractTextNodes(html)
    expect(nodes[0].text).toBe(longText)
    expect(nodes[0].truncatedText.length).toBe(120)
    expect(nodes[0].truncatedText.endsWith('...')).toBe(true)
  })

  it('assigns sequential IDs', () => {
    const html = `
      <div>
        <p>First item</p>
        <p>Second item</p>
        <p>Third item</p>
      </div>
    `
    const nodes = extractTextNodes(html)
    expect(nodes.map((n) => n.id)).toEqual(['node-0', 'node-1', 'node-2'])
  })

  it('initializes all assignments to none', () => {
    const html = `<div><p>Some text</p><p>More text</p></div>`
    const nodes = extractTextNodes(html)
    expect(nodes.every((n) => n.assignment === 'none')).toBe(true)
  })
})
