import { getConnInfo } from 'hono/bun'
import { createMiddleware } from 'hono/factory'

// Fixed-window rate limiter, in memory. Guards the connection pool, not the
// keys: 256-bit keys are not brute-forcible, but every unauthenticated request
// still hits the database to look up the hash. Per-process by definition --
// move to a shared store if this ever scales out.

type Window = { count: number; resetAt: number }

const windows = new Map<string, Window>()

const WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS) || 60_000
const MAX_REQUESTS = Number(process.env.RATE_LIMIT_MAX) || 100

// Reverse proxies in front of this process (the bundled nginx is 1).
// `getConnInfo` reads the raw TCP socket, so behind a proxy every request
// carries the proxy's address and the per-IP limit collapses into one global
// window -- worse than having no limiter at all.
const TRUST_PROXY = Number(process.env.TRUST_PROXY) || 0

// nginx appends the real client to any incoming X-Forwarded-For, so a forged
// header only prepends entries: the trustworthy one is counted back from the
// END, one hop per trusted proxy. Reading the first entry would let anyone pick
// their own bucket and evade the limit.
const clientKey = (xff: string | undefined, remote: string): string => {
	if (TRUST_PROXY < 1) return remote
	if (!xff) return remote
	const chain = xff
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean)
	// One trusted proxy -> last entry; two -> second to last, and so on.
	const ip = chain[chain.length - TRUST_PROXY]
	return ip || remote
}

// Without this the map grows one entry per distinct address, forever.
const sweep = setInterval(() => {
	const now = Date.now()
	for (const [key, w] of windows) {
		if (w.resetAt <= now) windows.delete(key)
	}
}, WINDOW_MS)
// Do not hold the process open just for the sweeper.
if (typeof sweep === 'object' && 'unref' in sweep) sweep.unref()

export const rateLimit = createMiddleware(async (c, next) => {
	const info = getConnInfo(c)
	const key = clientKey(c.req.header('X-Forwarded-For'), info.remote.address ?? 'unknown')
	const now = Date.now()

	let w = windows.get(key)
	if (!w || w.resetAt <= now) {
		w = { count: 0, resetAt: now + WINDOW_MS }
		windows.set(key, w)
	}
	w.count++

	const remaining = Math.max(0, MAX_REQUESTS - w.count)
	c.header('RateLimit-Limit', String(MAX_REQUESTS))
	c.header('RateLimit-Remaining', String(remaining))
	c.header('RateLimit-Reset', String(Math.ceil((w.resetAt - now) / 1000)))

	if (w.count > MAX_REQUESTS) {
		c.header('Retry-After', String(Math.ceil((w.resetAt - now) / 1000)))
		return c.json({ error: 'Too many requests' }, 429)
	}

	await next()
})
