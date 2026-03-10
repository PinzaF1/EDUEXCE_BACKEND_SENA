#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const { Client } = require('pg')
const jwt = require('jsonwebtoken')

function parseEnvFile(p) {
  const content = fs.readFileSync(p, 'utf8')
  const lines = content.split(/\r?\n/)
  const out = {}
  for (const l of lines) {
    const m = l.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m) {
      let v = m[2]
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith('\'') && v.endsWith('\''))) {
        v = v.slice(1, -1)
      }
      out[m[1]] = v
    }
  }
  return out
}

async function main() {
  const token = process.env.FCM_TOKEN
  const host = process.env.HOST || process.argv[2]
  if (!token) { console.error('FCM_TOKEN env var is required'); process.exit(2) }
  if (!host) { console.error('HOST arg or HOST env var is required e.g. https://xyz.ngrok-free.dev'); process.exit(2) }

  const envPath = path.join(process.cwd(), '.env')
  let env = {}
  if (fs.existsSync(envPath)) env = parseEnvFile(envPath)

  const dbHost = process.env.DB_HOST || env.DB_HOST || 'localhost'
  const dbPort = Number(process.env.DB_PORT || env.DB_PORT || 5432)
  const dbUser = process.env.DB_USER || env.DB_USER
  const dbPassword = process.env.DB_PASSWORD || env.DB_PASSWORD
  const dbDatabase = process.env.DB_DATABASE || env.DB_DATABASE || 'postgres'
  const jwtSecret = process.env.JWT_SECRET || env.JWT_SECRET || 'secret123'

  if (!dbUser) { console.error('DB_USER not provided in env or .env'); process.exit(3) }

  const client = new Client({
    host: dbHost,
    port: dbPort,
    user: dbUser,
    password: dbPassword,
    database: dbDatabase,
    ssl: false,
  })

  try { await client.connect() } catch (e) { console.error('Error connecting to DB:', e.message || e); process.exit(4) }

  try {
    const res = await client.query('SELECT id_token, id_usuario FROM fcm_tokens WHERE fcm_token = $1 LIMIT 1', [token])
    if (res.rowCount === 0) { console.log('Token no encontrado en fcm_tokens'); await client.end(); process.exit(0) }
    const row = res.rows[0]
    console.log('Found token row:', row)

    const payload = { id_usuario: row.id_usuario, rol: 'estudiante' }
    const generatedJwt = jwt.sign(payload, jwtSecret, { expiresIn: '1h' })
    console.log('\\nGenerated JWT (test):', generatedJwt)

    const url = new URL('/movil/fcm-token', host).toString()
    console.log('\\nCalling DELETE', url)

    const fetch = global.fetch || require('node-fetch')
    const resp = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${generatedJwt}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ token }),
    })

    console.log('Response status:', resp.status)
    const text = await resp.text()
    console.log('Response body:', text)

    await client.end()
  } catch (e) {
    console.error('Error:', e && e.message ? e.message : e)
    try { await client.end() } catch {}
    process.exit(5)
  }
}

main()
