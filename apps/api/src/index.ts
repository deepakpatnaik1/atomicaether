import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import 'dotenv/config'

const app = new Hono()

app.use('/*', cors())

app.get('/', (c) => {
  return c.json({ message: 'Hello from atomicaether API' })
})

app.get('/health', (c) => {
  return c.json({ status: 'ok' })
})

const port = Number(process.env.PORT) || 3001

serve({
  fetch: app.fetch,
  port
})

console.log(`Server is running on port ${port}`)