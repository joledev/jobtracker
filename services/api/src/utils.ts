/** Escape ILIKE wildcards so user input is treated as literal text. */
export function escapeLike(str: string): string {
	return str.replace(/[%_\\]/g, '\\$&')
}
