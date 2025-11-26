const fs = require('fs');
const path = require('path');
let jwt;
try {
  jwt = require('jsonwebtoken');
} catch (e) {
  console.error('Este script requiere el paquete `jsonwebtoken`. Instálalo con:');
  console.error('  npm install jsonwebtoken');
  process.exit(2);
}

function readDotEnv(envPath) {
  try {
    const txt = fs.readFileSync(envPath, 'utf8');
    const lines = txt.split(/\r?\n/);
    const kv = {};
    for (const l of lines) {
      const m = l.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) {
        let val = m[2] || '';
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        kv[m[1]] = val;
      }
    }
    return kv;
  } catch (err) {
    return {};
  }
}

// Parse simple args --id 1 --role admin --exp 3600 --secret <secret>
const argv = process.argv.slice(2);
const opts = {};
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a.startsWith('--')) {
    const k = a.slice(2);
    const v = argv[i + 1];
    if (v && !v.startsWith('--')) {
      opts[k] = v;
      i++;
    } else {
      opts[k] = true;
    }
  }
}

// Load .env if exists
const envPath = path.resolve(process.cwd(), '.env');
const fileEnv = readDotEnv(envPath);

const secret = opts.secret || process.env.JWT_SECRET || fileEnv.JWT_SECRET;
if (!secret) {
  console.error('No se encontró `JWT_SECRET`. Pásalo con --secret <secret>, exporta JWT_SECRET o añade en .env');
  process.exit(3);
}

const id = opts.id ? Number(opts.id) : (process.env.DEFAULT_ADMIN_ID ? Number(process.env.DEFAULT_ADMIN_ID) : 1);
const role = opts.role || 'admin';
const expSeconds = opts.exp ? Number(opts.exp) : 60 * 60;

const payload = {
  id_usuario: id,
  rol: role,
};

const token = jwt.sign(payload, secret, { expiresIn: expSeconds });
console.log(token);
