# 🚀 INSTRUCCIONES PARA CONFIGURAR PRODUCCIÓN

## 📋 **PASOS PARA EL COMPAÑERO EN EL SERVIDOR**

### **1. Crear archivo .env.production**

En el servidor donde está el proyecto, crear el archivo `.env.production`:

```bash
cd /ruta/del/proyecto
nano .env.production
```

O si prefieres:
```bash
cp env.production.example .env.production
```

### **2. Copiar este contenido EXACTO:**

```bash
NODE_ENV=production
PORT=3333
HOST=0.0.0.0
APP_KEY=oX6-X96FTJHunx3nupxa0n-BJdufzSS1

DB_HOST=aws-0-us-east-2.pooler.supabase.com
DB_PORT=6543
DB_USER=postgres.rzxaitwarwlsnyphpgcf
DB_PASSWORD=Sena12345Zavira
DB_DATABASE=postgres

JWT_SECRET=secret123
JWT_EXPIRES_IN=86400
JWT_RECOVERY_EXPIRES=900

REDIS_URL=redis://redis:6379

SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=TU_LOGIN_BREVO_AQUI@smtp-brevo.com
SMTP_PASS=xsmtpsib-TU_CLAVE_SMTP_DE_BREVO_AQUI
SMTP_FROM=tu-email-de-registro-brevo@gmail.com

FRONT_URL=https://gillian-semiluminous-blubberingly.ngrok-free.dev
```

### **3. Guardar el archivo**

Si usas `nano`:
- Presiona `Ctrl + O` para guardar
- Presiona `Enter` para confirmar
- Presiona `Ctrl + X` para salir

### **4. Verificar que el archivo existe**

```bash
ls -la .env.production
cat .env.production
```

Debe mostrar el contenido completo.

### **5. Reiniciar Docker**

```bash
# Detener contenedores
docker-compose down

# Reconstruir (IMPORTANTE: --no-cache para forzar rebuild)
docker-compose build --no-cache

# Iniciar
docker-compose up -d

# Ver logs en tiempo real
docker-compose logs -f api
```

### **6. Verificar que está funcionando**

En los logs deberías ver:
```
[Redis] Conectado exitosamente
✅ Servidor iniciado en puerto 3333
```

### **7. Probar desde Android**

1. Abrir app móvil EDUEXCE
2. Ir a "Olvidé mi contraseña"
3. Ingresar un correo REAL de un estudiante
4. Solicitar código

### **8. Verificar en logs**

```bash
docker-compose logs -f api
```

Deberías ver:
```
✅ [Recuperación] Email enviado exitosamente para: correo-estudiante@gmail.com
```

### **9. Verificar email del estudiante**

El estudiante debe recibir el email con código de 6 dígitos en 10-30 segundos.

---

## 🔧 **SOLUCIÓN DE PROBLEMAS**

### **Error: "Cannot find module .env.production"**
```bash
# Verifica que el archivo existe
ls -la .env.production
# Si no existe, créalo con el contenido de arriba
```

### **Error: Redis connection failed**
```bash
# Verifica que Redis está corriendo
docker-compose ps
# Si no está, reinicia todo
docker-compose down
docker-compose up -d
```

### **Error: Email no llega**
```bash
# Verifica los logs
docker-compose logs -f api | grep Recuperación
# Deberías ver ✅ o ❌ con el detalle del error
```

### **Email llega a spam**
- Normal la primera vez
- Pedir al estudiante que lo marque como "No es spam"
- Los siguientes llegarán a bandeja principal

---

## ✅ **CHECKLIST FINAL**

- [ ] Archivo `.env.production` creado
- [ ] Todas las variables copiadas correctamente
- [ ] `docker-compose down` ejecutado
- [ ] `docker-compose build --no-cache` ejecutado
- [ ] `docker-compose up -d` ejecutado
- [ ] Logs muestran conexión Redis exitosa
- [ ] Logs muestran servidor iniciado
- [ ] Prueba desde Android funciona
- [ ] Email llega a estudiante real
- [ ] Código se puede verificar y cambiar contraseña

---

## 📞 **SI ALGO FALLA**

1. Comparte los logs completos: `docker-compose logs api > logs.txt`
2. Verifica el contenido del `.env.production`
3. Verifica que las credenciales de Brevo sean las correctas
4. Prueba el script `node test-smtp.cjs` en el servidor

---

**¡Eso es todo! Una vez completados estos pasos, los emails llegarán a los correos reales de los estudiantes.** 🎉

