# Desarrollo con Docker + ngrok

Este documento explica cómo levantar el backend dentro de Docker y exponerlo temporalmente con ngrok para pruebas o demos.

Requisitos:
- Docker y Docker Compose instalados
- ngrok account (opcional, pero recomendado) para un túnel estable

Pasos rápidos (PowerShell):

1) Copia el ejemplo de env y añade tu token de ngrok:

```powershell
copy .env.development.example .env.development
# Edita .env.development y pega tu NGROK_AUTHTOKEN
notepad .env.development
```

2) Levanta los servicios con docker-compose (el override se usa automáticamente):

```powershell
docker-compose up -d --build
```

3) Revisa los logs del servicio `ngrok` para obtener la URL pública:

```powershell
docker logs -f eduexce-ngrok
# o consulta la API web de ngrok (puerto 4040) desde el host
curl http://localhost:4040/api/tunnels
```

4) Actualiza `FRONT_URL` en tu `.env.development` si quieres usar la URL pública de ngrok
   (útil para probar llamadas cruzadas desde el frontend remoto).

Notas de seguridad y buenas prácticas:
- No pongas en producción este túnel. ngrok es para desarrollo y demos.
- Protege endpoints sensibles con autenticación; considera habilitar autenticación HTTP en frontend/demo si compartes la URL.
- El servicio `ngrok` en `docker-compose.override.yml` expone la interfaz web en el puerto `4040` del host.

Troubleshooting:
- Si no ves la URL pública en los logs, asegúrate de que el token es correcto y de que la imagen `ngrok/ngrok:latest` funciona en tu plataforma.
- Alternativa: ejecuta ngrok en tu máquina local en vez de en Docker: `ngrok http 3333`.
