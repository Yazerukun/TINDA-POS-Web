import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

/**
 * Local Sentry Ingestion Collector Plugin.
 * Ingests Sentry envelope POST requests on /api/:projectId/envelope/
 * and provides /api/sentry/events for live inspection during development.
 */
function localSentryPlugin(): Plugin {
  const events: Array<{
    id: string
    receivedAt: string
    header: Record<string, unknown>
    itemHeader: Record<string, unknown>
    payload: Record<string, unknown>
  }> = []

  return {
    name: 'local-sentry-collector',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url || ''

        // Ingest Sentry envelope dispatches or adblocker-safe telemetry tunnel
        if (url.includes('/envelope/') || url.includes('/api/telemetry/stream')) {
          let body = ''
          req.on('data', (chunk: Buffer) => {
            body += chunk.toString('utf-8')
          })
          req.on('end', () => {
            try {
              const lines = body.split('\n').filter(Boolean)
              const header = lines[0] ? JSON.parse(lines[0]) : {}
              const itemHeader = lines[1] ? JSON.parse(lines[1]) : {}
              const payload = lines[2] ? JSON.parse(lines[2]) : {}
              const eventId = (header.event_id as string) || ''
              const record = {
                id: `ingest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                eventId: eventId || `sentry-${Date.now()}`,
                receivedAt: new Date().toISOString(),
                header,
                itemHeader,
                payload
              }
              events.unshift(record)
              if (events.length > 50) events.pop()
              console.log(`\x1b[32m[Sentry Live Ingest]\x1b[0m Ingested ${(itemHeader.type as string) || 'event'}: ${record.eventId}`)
            } catch (err) {
              console.error('[Sentry Live Ingest] Error parsing envelope:', err)
            }
            res.setHeader('Content-Type', 'application/json')
            res.setHeader('Access-Control-Allow-Origin', '*')
            res.writeHead(200)
            res.end(JSON.stringify({ id: 'ok' }))
          })
          return
        }

        // Expose collected events for live inspector
        if (url === '/api/sentry/events') {
          res.setHeader('Content-Type', 'application/json')
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.writeHead(200)
          res.end(JSON.stringify(events))
          return
        }

        // Handle local dev heartbeat mock
        if (url === '/api/heartbeat') {
          res.setHeader('Content-Type', 'application/json')
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.writeHead(200)
          res.end(JSON.stringify({ ok: true, devMock: true }))
          return
        }

        next()
      })
    }
  }
}

export default defineConfig({
  plugins: [react(), localSentryPlugin()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    port: 5173,
    host: true
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor-react'
          }
          if (id.includes('node_modules/dexie')) {
            return 'vendor-db'
          }
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-icons'
          }
          if (id.includes('node_modules/@sentry')) {
            return 'vendor-sentry'
          }
        }
      }
    }
  }
})
