# 🚨 INSTRUCCIONES URGENTES - ACTUALIZACIÓN DOCKER

## 📋 PROBLEMA ACTUAL

**Síntoma:** `POST /auth/recovery/admin/enviar` devuelve **404 Not Found**  
**Causa:** Docker está ejecutando código desactualizado (caché de build antiguo)

---

## ✅ SOLUCIÓN (Ejecutar en el servidor con Docker)

### **Paso 1: Ir al directorio del proyecto**
```bash
cd /ruta/al/proyecto/EDUEXCE_BACKEND_SENA
```

### **Paso 2: Traer los últimos cambios**
```bash
git pull origin main
```

**Verifica que descargó cambios nuevos. Deberías ver:**
```
remote: Counting objects: X, done.
Updating 7064486..0c671d5
Fast-forward
```

### **Paso 3: Detener contenedores**
```bash
docker-compose down
```

### **Paso 4: ELIMINAR imagen vieja (CRÍTICO)**
```bash
docker image rm zavira-api
```

Si da error "image not found", ignóralo y continúa.

### **Paso 5: LIMPIAR caché de Docker (MUY IMPORTANTE)**
```bash
docker builder prune -af
```

Escribir `y` cuando pregunte para confirmar.

### **Paso 6: Reconstruir imagen SIN CACHÉ**
```bash
docker-compose build --no-cache --pull
```

**Esto tardará varios minutos.** Espera hasta que termine completamente.

### **Paso 7: Levantar contenedores**
```bash
docker-compose up -d
```

### **Paso 8: Verificar que arrancó correctamente**
```bash
docker-compose logs -f api
```

**Deberías ver algo como:**
```
[ info ] starting HTTP server on 0.0.0.0:3333
✅ [Recuperación] ...
```

Presiona `Ctrl+C` para salir de los logs.

---

## 🧪 VERIFICACIÓN

### **Test 1: Probar Login Admin (para confirmar que el servidor funciona)**
```bash
curl -X POST https://gillian-semiluminous-blubberingly.ngrok-free.dev/admin/login \
  -H "Content-Type: application/json" \
  -H "ngrok-skip-browser-warning: true" \
  -d '{"correo":"test@test.com","password":"test"}'
```

**Esperado:** `{"error":"Credenciales inválidas"}` (esto es correcto, significa que el servidor funciona)

### **Test 2: Probar Recuperación Admin (el endpoint que daba 404)**
```bash
curl -X POST https://gillian-semiluminous-blubberingly.ngrok-free.dev/auth/recovery/admin/enviar \
  -H "Content-Type: application/json" \
  -H "ngrok-skip-browser-warning: true" \
  -d '{"correo":"admin@eduexce.com"}'
```

**Esperado (si el correo existe en BD):** `{"ok":true,"message":"Email enviado correctamente"}`  
**Esperado (si el correo NO existe en BD):** `{"error":"Correo no registrado"}` con código 404

**❌ SI TODAVÍA DA 404 GENÉRICO:** El problema persiste, ver "Troubleshooting" abajo.

---

## 🔧 TROUBLESHOOTING

### **Problema: Docker sigue dando 404**

**1. Verificar que git pull funcionó:**
```bash
git log --oneline -3
```

Deberías ver:
```
0c671d5 fix: eliminar endpoints de debug problemáticos
6cd444d fix: corregir sintaxis de Dockerfile
c872017 feat: agregar endpoints de debug...
```

**2. Verificar que el archivo de rutas está actualizado:**
```bash
cat start/Routes/rol.ts | grep "auth/recovery/admin/enviar"
```

Debería mostrar:
```typescript
Route.post('auth/recovery/admin/enviar', (ctx) => new AuthController().enviarRecoveryAdmin(ctx))
```

**3. Verificar que Docker realmente reconstruyó:**
```bash
docker image ls | grep zavira-api
```

La imagen debería tener una fecha/hora reciente (de hace minutos).

**4. Entrar al contenedor y verificar el código compilado:**
```bash
docker exec -it zavira-api sh
cat build/start/Routes/rol.js | grep "auth/recovery/admin/enviar"
exit
```

Debería mostrar:
```javascript
Route.post('auth/recovery/admin/enviar', (ctx) => new AuthController().enviarRecoveryAdmin(ctx));
```

**5. Si TODO lo anterior está correcto pero sigue dando 404:**

Verifica si hay un **proxy o API Gateway** delante de Docker que esté cacheando las rutas.

---

## 📞 COMUNICACIÓN

**Después de ejecutar los pasos, envía un mensaje confirmando:**

✅ **Si funcionó:**
> "Listo, rebuild completado. Probé el endpoint de recuperación y ahora devuelve {\"ok\":true} o {\"error\":\"Correo no registrado\"} en lugar de 404."

❌ **Si NO funcionó:**
> "Ejecuté todos los pasos. Docker reconstruyó correctamente (adjuntar output de `git log` y `docker image ls`), pero sigue dando 404. Adjunto logs: [pegar output de docker-compose logs api | tail -50]"

---

## 📝 NOTAS IMPORTANTES

1. **NO uses `docker-compose up --build`** sin antes hacer `down` y `prune`, porque Docker puede cachear capas viejas.

2. **El flag `--no-cache`** en el build es CRÍTICO. Sin él, Docker reutiliza capas antiguas.

3. **El `.env.production`** debe existir en el directorio raíz del proyecto (mismo nivel que `docker-compose.yml`). Docker Compose lo carga automáticamente.

4. **Si ngrok muestra una página de verificación**, el frontend debe agregar el header:
   ```javascript
   headers: { 
     'Content-Type': 'application/json',
     'ngrok-skip-browser-warning': 'true' 
   }
   ```

---

**Última actualización:** 31/10/2024  
**Versión del código:** commit `0c671d5`
