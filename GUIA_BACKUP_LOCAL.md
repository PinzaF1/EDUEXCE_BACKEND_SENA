# 🗄️ GUÍA: Trabajar con Backup de Supabase en PostgreSQL Local

Esta guía te ayuda a configurar tu entorno de desarrollo local usando un backup de la base de datos de Supabase.

---

## 📋 REQUISITOS PREVIOS

✅ PostgreSQL instalado localmente (veo que tienes PostgreSQL 17)  
✅ pgAdmin configurado  
✅ Backup de Supabase descargado (archivo `.sql` o `.dump`)  
✅ Backend de EDUEXCE clonado  

---

## 🚀 PASO A PASO

### **1️⃣ CREAR BASE DE DATOS LOCAL**

#### Opción A: Desde pgAdmin (Visual)
1. Abre **pgAdmin 4**
2. Conecta al servidor **PostgreSQL 17** (localhost)
3. Click derecho en **Databases** → **Create** → **Database...**
4. Configuración:
   - **Database name:** `eduexce_local`
   - **Owner:** `postgres`
   - Click **Save**

#### Opción B: Desde Terminal (Más Rápido)
```powershell
# Crear la base de datos
psql -U postgres -c "CREATE DATABASE eduexce_local;"
```

---

### **2️⃣ RESTAURAR BACKUP DE SUPABASE**

#### Opción A: Desde pgAdmin (Visual)
1. En pgAdmin, click derecho en la base de datos **eduexce_local**
2. **Restore...**
3. Configuración:
   - **Format:** Custom, tar, o Plain (según tu backup)
   - **Filename:** Selecciona tu archivo backup
   - **Role name:** `postgres`
4. Click **Restore**
5. Revisa la pestaña **Messages** para ver el progreso

#### Opción B: Desde Terminal (Más Rápido)
```powershell
# Si tu backup es .sql (texto plano)
psql -U postgres -d eduexce_local -f "C:\ruta\al\backup.sql"

# Si tu backup es .dump (formato custom)
pg_restore -U postgres -d eduexce_local -v "C:\ruta\al\backup.dump"

# Si tienes problemas con permisos, agrega --no-owner
pg_restore -U postgres -d eduexce_local --no-owner --role=postgres -v "C:\ruta\al\backup.dump"
```

---

### **3️⃣ VERIFICAR QUE EL BACKUP SE RESTAURÓ CORRECTAMENTE**

```powershell
# Conectar a la base de datos
psql -U postgres -d eduexce_local

# Listar todas las tablas
\dt

# Deberías ver tablas como:
# - usuarios
# - sesiones
# - banco_preguntas
# - instituciones
# - etc.

# Ver cuántos registros hay en usuarios
SELECT COUNT(*) FROM usuarios;

# Salir
\q
```

O desde **pgAdmin**:
- Navega a: **Databases** → **eduexce_local** → **Schemas** → **public** → **Tables**
- Deberías ver todas las tablas del sistema

---

### **4️⃣ CONFIGURAR EL BACKEND PARA USAR BD LOCAL**

Ya creé los archivos necesarios. Solo ejecuta:

```powershell
# Cambiar a base de datos LOCAL
.\usar-bd-local.ps1

# Iniciar el servidor
npm run dev
```

El servidor ahora se conectará a tu PostgreSQL local en lugar de Supabase.

---

### **5️⃣ VERIFICAR LA CONEXIÓN**

El servidor debería mostrar en consola:
```
✅ Conexión a base de datos exitosa
DB_HOST: localhost
DB_DATABASE: eduexce_local
```

Puedes probar un endpoint:
```bash
# Listar estudiantes (requiere autenticación)
GET http://localhost:3333/admin/estudiantes
```

---

## 🔄 CAMBIAR ENTRE AMBIENTES

### **Usar Base de Datos LOCAL (PostgreSQL)**
```powershell
.\usar-bd-local.ps1
npm run dev
```

### **Volver a Base de Datos SUPABASE (Producción)**
```powershell
.\usar-bd-supabase.ps1
npm run dev
```

---

## 🛠️ CONFIGURACIÓN DE CONEXIÓN

### **Base de Datos LOCAL** (`.env.local`)
```dotenv
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_DATABASE=eduexce_local
```

### **Base de Datos SUPABASE** (`.env` original)
```dotenv
DB_HOST=aws-1-us-east-2.pooler.supabase.com
DB_PORT=5432
DB_USER=postgres.qjqhdfhiedsqrstymbio
DB_PASSWORD=Sena12345Zavira
DB_DATABASE=postgres
```

---

## 🔍 SOLUCIÓN DE PROBLEMAS

### **Error: "database does not exist"**
```powershell
# Crear la base de datos primero
psql -U postgres -c "CREATE DATABASE eduexce_local;"
```

### **Error: "password authentication failed"**
```powershell
# Verifica tu contraseña de PostgreSQL local
# Generalmente es "postgres" por defecto
# O cambia en .env.local:
DB_PASSWORD=tu_password_local
```

### **Error: "relation does not exist"**
```powershell
# El backup no se restauró correctamente, intenta:
psql -U postgres -d eduexce_local -f backup.sql

# O si es .dump:
pg_restore -U postgres -d eduexce_local --clean --if-exists -v backup.dump
```

### **Error: "role does not exist"**
```powershell
# Si el backup tiene roles de Supabase, ignóralos:
pg_restore -U postgres -d eduexce_local --no-owner --role=postgres -v backup.dump
```

### **Tablas con datos de Supabase (auth, storage, etc.)**
```sql
-- El backup de Supabase incluye sus tablas internas
-- Puedes ignorarlas, solo usa las del schema "public"
-- O eliminarlas si quieres:
DROP SCHEMA IF EXISTS auth CASCADE;
DROP SCHEMA IF EXISTS storage CASCADE;
DROP SCHEMA IF EXISTS extensions CASCADE;
```

---

## 📊 VERIFICAR DATOS RESTAURADOS

```sql
-- Ver todas las tablas
\dt

-- Ver cantidad de usuarios
SELECT COUNT(*) FROM usuarios;

-- Ver cantidad de instituciones
SELECT COUNT(*) FROM instituciones;

-- Ver cantidad de preguntas
SELECT COUNT(*) FROM banco_preguntas;

-- Ver últimas sesiones
SELECT id_sesion, id_usuario, area, tipo, created_at 
FROM sesiones 
ORDER BY created_at DESC 
LIMIT 10;
```

---

## 💡 VENTAJAS DE TRABAJAR CON BD LOCAL

✅ **Velocidad:** Sin latencia de red, consultas instantáneas  
✅ **Seguridad:** No modificas datos de producción  
✅ **Testing:** Prueba cambios destructivos sin miedo  
✅ **Debugging:** Inspecciona datos con pgAdmin fácilmente  
✅ **Offline:** Trabaja sin conexión a internet  

---

## ⚠️ IMPORTANTE

- **NO hagas push** del archivo `.env` con credenciales
- El `.gitignore` ya está configurado para proteger:
  - `.env`
  - `.env.local`
  - `.env.supabase.backup`
- Los scripts `usar-bd-*.ps1` SON SEGUROS para subir a GitHub

---

## 🎯 FLUJO DE TRABAJO RECOMENDADO

```
1. Descargar backup de Supabase
2. Restaurar en PostgreSQL local
3. Ejecutar: .\usar-bd-local.ps1
4. Desarrollar y probar cambios
5. Ejecutar: .\usar-bd-supabase.ps1
6. Verificar en producción (Supabase)
7. Commit y push de código (SIN .env)
```

---

## 📞 ¿NECESITAS AYUDA?

Si tienes problemas:
1. Verifica logs del servidor (`npm run dev`)
2. Revisa logs de PostgreSQL en pgAdmin
3. Ejecuta las queries de verificación de arriba
4. Comparte el error específico que aparece

---

## 🔗 RECURSOS ÚTILES

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [pgAdmin Documentation](https://www.pgadmin.org/docs/)
- [Supabase Backups](https://supabase.com/docs/guides/platform/backups)

---

**Última actualización:** 14 de noviembre de 2025
