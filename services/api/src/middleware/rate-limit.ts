import { getConnInfo } from 'hono/bun'
import { createMiddleware } from 'hono/factory'

/**
 * Fixed-window rate limiter, in memory.
 *
 * The real risk here is not brute force: API keys are 256-bit, so guessing one
 * is not on the table. It is that every unauthenticated request reaches the
 * database to look up the key hash, and the pool holds 10 connections. Without
 * a limit, anyone who can reach the API can exhaust it without a credential.
 *
 * Written by hand rather than pulled in: Hono's core has no rate limiter, and
 * this instance is single-node, so a dependency plus a Redis store would buy
 * nothing. If the API is ever scaled past one process, this needs to move to a
 * shared store -- an in-memory window is per-process by definition.
 */

type Window = { count: number; resetAt: number }

const windows = new Map<string, Window>()

const WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS) || 60_000
const MAX_REQUESTS = Number(process.env.RATE_LIMIT_MAX) || 100

// Without this the map grows one entry per distinct IP, forever.
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
	const ip = info.remote.address ?? 'unknown'
	const now = Date.now()

	let w = windows.get(ip)
	if (!w || w.resetAt <= now) {
		w = { count: 0, resetAt: now + WINDOW_MS }
		windows.set(ip, w)
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
