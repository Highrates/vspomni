/** PM2: pm2 start ecosystem.config.cjs && pm2 save */
const fs = require('fs')
const path = require('path')

/** Подгрузка .env в env PM2 (Next.js не перечитывает новые ключи без rebuild). */
function loadDotEnv(filePath) {
  const out = {}
  if (!fs.existsSync(filePath)) return out
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq).trim()
    let val = trimmed.slice(eq + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    out[key] = val
  }
  return out
}

const dotenv = loadDotEnv(path.join(__dirname, '.env'))

module.exports = {
  apps: [
    {
      name: 'vspomni-front',
      cwd: __dirname,
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3001',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: '3001',
        ...dotenv,
      },
      max_memory_restart: '512M',
    },
  ],
}
