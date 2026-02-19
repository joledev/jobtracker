/**
 * Generates a unique CSS selector for an element within a root container.
 */
export const buildSelector = (el: Element, root: Element): string => {
  // Priority 1: ID
  if (el.id) {
    const selector = `#${CSS.escape(el.id)}`
    if (root.querySelector(selector) === el) return selector
  }

  // Priority 2: tag + classes (unique within root)
  if (el.classList.length > 0) {
    const tag = el.tagName.toLowerCase()
    const classes = Array.from(el.classList).map((c) => `.${CSS.escape(c)}`).join('')
    const selector = `${tag}${classes}`
    if (root.querySelectorAll(selector).length === 1) return selector
  }

  // Priority 3: nth-of-type path from root
  const path: string[] = []
  let current: Element | null = el

  while (current && current !== root) {
    const tag = current.tagName.toLowerCase()
    const parent = current.parentElement
    if (!parent) break

    const siblings = Array.from(parent.children).filter(
      (s) => s.tagName.toLowerCase() === tag,
    )

    if (siblings.length === 1) {
      path.unshift(tag)
    } else {
      const index = siblings.indexOf(current) + 1
      path.unshift(`${tag}:nth-of-type(${index})`)
    }

    current = parent
  }

  const selector = path.join(' > ')

  // Validate
  if (root.querySelector(selector) === el) return selector

  // Ultimate fallback: full path without optimization
  return selector
}
