import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { secureHeaders } from 'hono/secure-headers'
import { authMiddleware } from './middleware/auth'
import { rateLimit } from './middleware/rate-limit'
import { apikeysRoute } from './routes/apikeys'
import { callsRoute } from './routes/calls'
import { communicationsRoute } from './routes/communications'
import { contactsRoute, offerContactsRoute } from './routes/contacts'
import { cvsRoute } from './routes/cvs'
import { healthRoute } from './routes/health'
import { offersRoute } from './routes/offers'
import { pipelineStagesRoute } from './routes/pipeline-stages'
import { questionsRoute } from './routes/questions'
import { remindersRoute } from './routes/reminders'
import { offerTechnologiesRoute, technologiesRoute } from './routes/technologies'
import { timelineRoute } from './routes/timeline'
import { workspacesRoute } from './routes/workspaces'

const app = new Hono()

app.use('*', logger())
// El origen de la aplicacion de escritorio es `tauri://localhost`, y va en el
// valor por defecto a proposito: sin el, quien se autoaloje la API descubre que
// su propia aplicacion no puede hablar con ella, y el fallo aparece como una
// lista vacia en vez de como un error — el navegador bloquea la peticion real
// tras el preflight y no queda rastro en los registros del servidor.
// CORS_ORIGIN acepta varios origenes separados por coma.
const corsOrigins = (process.env.CORS_ORIGIN ?? 'tauri://localhost,http://localhost:5173')
	.split(',')
	.map((o) => o.trim())
	.filter(Boolean)

app.use('*', cors({ origin: corsOrigins }))
app.use('*', secureHeaders())

app.onError((err, c) => {
	console.error(`[${c.req.method}] ${c.req.path}:`, err)
	return c.json({ error: 'Internal Server Error' }, 500)
})

// Public routes (no auth required)
app.route('/', healthRoute)

// Protected routes. The rate limiter runs BEFORE auth on purpose: placed after,
// every unauthenticated request would already have hit the database looking up
// the key hash, which is the exhaustion path being closed here.
app.use('/api/*', rateLimit)
app.use('/api/*', authMiddleware)

app.route('/api/offers', offersRoute)
app.route('/api/pipeline-stages', pipelineStagesRoute)
app.route('/api/workspaces', workspacesRoute)
app.route('/api/contacts', contactsRoute)
app.route('/api/offers', offerContactsRoute)
app.route('/api/offers', callsRoute)
app.route('/api/offers', communicationsRoute)
app.route('/api/technologies', technologiesRoute)
app.route('/api/offers', offerTechnologiesRoute)
app.route('/api/offers', questionsRoute)
app.route('/api/offers', remindersRoute)
app.route('/api/cvs', cvsRoute)
app.route('/api/apikeys', apikeysRoute)
app.route('/api/timeline', timelineRoute)

const port = Number(process.env.PORT) || 3000

console.log(`JobTracker API running on port ${port}`)

export default {
	port,
	fetch: app.fetch,
}
