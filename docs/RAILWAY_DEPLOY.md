# 🚂 Railway Deployment - EDUEXCE Backend

## ⚡ Variables de Entorno Requeridas

Configura estas variables en Railway → Settings → Variables:

### 🔧 Básicas (Requeridas)
```
NODE_ENV=production
HOST=0.0.0.0
LOG_LEVEL=info
```

### 🔑 Seguridad (Generar nuevas)
```
APP_KEY=[generar-32-caracteres]
JWT_SECRET=[generar-32-caracteres]
```

### 📧 Email SMTP
```
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=[tu-brevo-login]
SMTP_PASS=[tu-brevo-api-key]
SMTP_FROM=[tu-email@gmail.com]
```

### 🤖 OpenAI (Opcional)
```
OPENAI_API_KEY=[tu-api-key]
OPENAI_MODEL=gpt-4o-mini
USE_OPENAI_DIRECT=true
```

## 📊 Base de Datos

Agrega PostgreSQL desde Railway dashboard:
**Add Service → Database → PostgreSQL**

Railway configurará automáticamente: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_DATABASE`

## 🚀 Deploy

1. Variables configuradas ✅
2. PostgreSQL agregado ✅  
3. Railway despliega automáticamente
4. Health check `/health` debe pasar