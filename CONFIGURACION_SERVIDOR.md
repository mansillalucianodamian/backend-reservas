# Guía de Configuración del Servidor de Producción (Reservas Backend)

Este documento contiene toda la información técnica, accesos, puertos, comandos y configuraciones de red del servidor de producción de la Municipalidad para el proyecto **Backend Reservas**.

---

## 1. Credenciales y Acceso al Servidor

* **IP Pública**: `45.7.251.99`
* **Puerto SSH**: `9422`
* **Usuario**: `administrador`
* **Contraseña**: `12357`

### Comando de conexión directa SSH:
```bash
ssh administrador@45.7.251.99 -p 9422
```

---

## 2. Configuración de Red y Acceso Local

* **IP Interna (Red de la Municipalidad)**: `192.168.0.215`
* **Puerto de Servicio Público/Local**: `80` (gestionado por Nginx)

### Puntos de acceso de la API (Endpoints):
* **Desde fuera (Público)**: `http://45.7.251.99/ping` *(requiere redirección del puerto 80 en el router municipal)*
* **Desde dentro (Red Local Municipal)**: `http://192.168.0.215/ping` *(listo para usar el lunes)*
* **Prueba directa interna (en el servidor)**: `curl -i http://127.0.0.1:8080/ping`

---

## 3. Túnel SSH (Para desarrollo local remoto)

Para probar la API de producción en tu computadora local sin que esté abierta al público todavía, puedes abrir un túnel SSH que redireccione el puerto `8080` de producción a tu computadora local.

### Comando del Túnel:
```bash
ssh -L 8080:127.0.0.1:8080 administrador@45.7.251.99 -p 9422
```

* **Cómo usarlo**: Ejecuta el comando anterior en una terminal de Windows y **déjala abierta**.
* **URL de API local**: Configura el frontend local para apuntar a:
  ```text
  http://localhost:8080
  ```

---

## 4. Configuración del Servidor Web (Nginx)

Nginx actúa como proxy inverso. Escucha en el puerto `80` de las IPs autorizadas y envía las peticiones al backend en `http://127.0.0.1:8080`.

* **Archivo de configuración**: `/etc/nginx/sites-available/reservas.conf`
* **Enlace activo**: `/etc/nginx/sites-enabled/reservas.conf`

### Bloque de configuración actual:
```nginx
server {
    listen 80;

    server_name 45.7.251.99 192.168.0.215;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Comandos útiles para Nginx:
```bash
# Validar sintaxis del archivo
sudo nginx -t

# Recargar configuración sin caídas de servicio
sudo systemctl reload nginx

# Reiniciar el servicio por completo
sudo systemctl restart nginx
```

---

## 5. Administrador de Procesos (PM2)

El backend corre en segundo plano como un servicio gestionado por PM2.

* **Nombre del proceso**: `reservas-backend`
* **Archivo de inicio**: `/home/administrador/backend-reservas/ecosystem.config.cjs`
* **Ubicación del proyecto**: `/home/administrador/backend-reservas`

### Comandos de administración de PM2:
```bash
# Ver lista de aplicaciones corriendo
pm2 list

# Ver logs en tiempo real (salida y errores)
pm2 logs

# Ver las últimas 100 líneas de log
pm2 logs --lines 100

# Detener el backend
pm2 stop reservas-backend

# Iniciar o reiniciar tras cambios de código o .env
cd /home/administrador/backend-reservas
pm2 start ecosystem.config.cjs

# Matar el demonio PM2 por completo (limpia caché de variables de entorno)
pm2 kill
```

---

## 6. Base de Datos (MySQL)

* **Host**: `127.0.0.1` (localhost)
* **Puerto**: `3306`
* **Usuario**: `reservas_user`
* **Contraseña**: `reservas2026`
* **Nombre de base de datos**: `reservas`

Las credenciales están definidas en el archivo `/home/administrador/backend-reservas/.env` y se inyectan al proceso a través del archivo de configuración `ecosystem.config.cjs` para evitar fugas de memoria o variables vacías.
