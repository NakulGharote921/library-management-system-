import { existsSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const dist = join(process.cwd(), 'dist')
if (!existsSync(dist)) {
  console.error('dist/ is missing — run vite build first.')
  process.exit(1)
}

const backend = (process.env.BACKEND_URL || '').trim().replace(/\/$/, '')

const lines = []
if (backend) {
  lines.push(`/api/* ${backend}/api/:splat 200`)
}

lines.push('/* /index.html 200')

writeFileSync(join(dist, '_redirects'), `${lines.join('\n')}\n`)
