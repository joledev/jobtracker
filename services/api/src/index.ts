import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { secureHeaders } from 'hono/secure-headers'
import { authMiddleware } from './middleware/auth'
import { apikeysRoute } from './routes/apikeys'
import { callsRoute } from './routes/calls'
import { contactsRoute, offerContactsRoute } from './routes/contacts'
import { cvsRoute } from './routes/cvs'
import { healthRoute } from './routes/health'
import { offersRoute } from './routes/offers'
import { pipelineStagesRoute } from './routes/pipeline-stages'
import { questionsRoute } from './routes/questions'
import { offerTechnologiesRoute, technologiesRoute } from './routes/technologies'
import { timelineRoute } from './routes/timeline'
import { workspacesRoute } from './routes/workspaces'

const app = new Hono()

app.use('*', logger())
app.use('*', cors())
app.use('*', secureHeaders())

app.onError((err, c) => {
	console.error(`[${c.req.method}] ${c.req.path}:`, err)
	return c.json({ error: 'Internal Server Error' }, 500)
})

// Public routes (no auth required)
app.route('/', healthRoute)

// Protected routes
app.use('/api/*', authMiddleware)

app.route('/api/offers', offersRoute)
app.route('/api/pipeline-stages', pipelineStagesRoute)
app.route('/api/workspaces', workspacesRoute)
app.route('/api/contacts', contactsRoute)
app.route('/api/offers', offerContactsRoute)
app.route('/api/offers', callsRoute)
app.route('/api/technologies', technologiesRoute)
app.route('/api/offers', offerTechnologiesRoute)
app.route('/api/offers', questionsRoute)
app.route('/api/cvs', cvsRoute)
app.route('/api/apikeys', apikeysRoute)
app.route('/api/timeline', timelineRoute)

const port = Number(process.env.PORT) || 3000

console.log(`JobTracker API running on port ${port}`)

export default {
	port,
	fetch: app.fetch,
}
