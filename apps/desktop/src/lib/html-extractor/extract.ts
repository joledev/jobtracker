import { buildSelector } from './selector'
import type { ExtractedNode } from './types'

export interface TemplateNode extends ExtractedNode {
  selector: string
}

const SKIP_TAGS = new Set([
  'script', 'style', 'svg', 'noscript', 'iframe', 'button',
  'nav', 'footer', 'form', 'input', 'select', 'meta', 'link', 'img',
  'textarea', 'option', 'head',
])

const BLOCK_TAGS = new Set([
  'div', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'li', 'td', 'th', 'section', 'article', 'main',
  'blockquote', 'pre', 'dd', 'dt', 'figcaption', 'header',
])

const hasBlockChildWithText = (el: Element): boolean => {
  for (const child of el.children) {
    if (BLOCK_TAGS.has(child.tagName.toLowerCase())) {
      const text = child.textContent?.trim() || ''
      if (text.length >= 3) return true
    }
  }
  return false
}

interface RawNode {
  text: string
  tagName: string
  element: Element
}

const walkNodes = (el: Element, results: RawNode[]) => {
  const tag = el.tagName.toLowerCase()
  if (SKIP_TAGS.has(tag)) return

  const text = el.textContent?.trim() || ''
  if (text.length < 3) return

  if (hasBlockChildWithText(el)) {
    for (const child of el.children) {
      walkNodes(child, results)
    }
    return
  }

  if (text.length > 2000) return

  results.push({ text, tagName: tag, element: el })
}

const dedup = (items: RawNode[]): RawNode[] => {
  const seen = new Set<string>()
  const result: RawNode[] = []
  for (const item of items) {
    if (!seen.has(item.text)) {
      seen.add(item.text)
      result.push(item)
    }
  }
  return result
}

const toExtractedNode = (item: RawNode, i: number): ExtractedNode => ({
  id: `node-${i}`,
  text: item.text,
  truncatedText: item.text.length > 120 ? item.text.slice(0, 117) + '...' : item.text,
  tagName: item.tagName,
  assignment: 'none' as const,
})

export const extractTextNodes = (html: string): ExtractedNode[] => {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const raw: RawNode[] = []

  walkNodes(doc.body, raw)

  return dedup(raw).map(toExtractedNode)
}

export const extractTemplateNodes = (html: string): TemplateNode[] => {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const raw: RawNode[] = []

  walkNodes(doc.body, raw)

  return dedup(raw).map((item, i) => ({
    ...toExtractedNode(item, i),
    selector: buildSelector(item.element, doc.body),
  }))
}
