# Sistema de Reservas - Cancha de Pádel (Municipalidad de Aldea San Antonio)

Este proyecto es una plataforma web completa de reserva de turnos para la cancha de pádel de la Municipalidad de Aldea San Antonio. Cuenta con un sistema automatizado de control de iluminación a través de domótica Shelly, gestión de tarifas, administración de usuarios y estadísticas avanzadas de uso en tiempo real.

---

## 🛠️ Tecnologías Utilizadas

### Backend:
* **Node.js** con **Express** (arquitectura de repositorios y servicios).
* **MySQL** como motor de base de datos relacional.
* **Axios** para integración con Shelly Cloud HTTP API.
* **Nodemailer** para notificaciones y alertas automáticas por correo electrónico.

### Frontend:
* **Angular 21** con **Angular Material** y **FullCalendar**.
* **RxJS** para la gestión de flujos de datos asíncronos.
* **Vanilla CSS** para diseño responsivo moderno y premium.

---

## ⚙️ Configuración del Entorno (Variables en `.env`)

Crea un archivo `.env` en la raíz del proyecto backend con las siguientes claves:

```ini
# Configuración de Base de Datos MySQL
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=reservas_user
DB_PASSWORD=reservas2026
DB_NAME=reservas

# Configuración de Servidores
PORT=8080
URL_BACKEND=http://localhost:8080
URL_FRONTEND=http://localhost:4200

# Seguridad
JWT_SECRET=TU_SECRETO_PARA_TOKENS_JWT

# Notificaciones por Correo (Gmail SMTP)
GMAIL_USER=tu-correo-rentas@gmail.com
GMAIL_PASSWORD=tu-contraseña-de-aplicacion

# Domótica Shelly Cloud (Luces de Cancha)
SHELLY_CLOUD_URL=https://shelly-265-eu.shelly.cloud
SHELLY_DEVICE_ID=d0cf13d218d8
SHELLY_AUTH_KEY=TU_LLAVE_DE_AUTORIZACION_SHELLY
```

---

## 🚀 Instalación y Desarrollo Local

### 1. Requisitos Previos:
* Node.js v18 o superior.
* MySQL Server.

### 2. Base de Datos:
Ejecuta las migraciones necesarias para crear las tablas base en tu motor MySQL:
```sql
CREATE TABLE IF NOT EXISTS configuracion (
    clave VARCHAR(50) PRIMARY KEY,
    valor VARCHAR(255) NOT NULL
);
INSERT INTO configuracion (clave, valor) VALUES ('precio_cancha', '5000') ON DUPLICATE KEY UPDATE valor = valor;
```

### 3. Levantar Backend:
```bash
cd BACKEND_RESERVAS
npm install
npm run dev
```

### 4. Levantar Frontend:
1. Asegúrate de tener instalado el CLI de Angular (`npm install -g @angular/cli`).
2. Configura un proxy local de desarrollo (`proxy.conf.json`) si deseas redirigir la API `/api` al puerto `8080`.
3. Levanta el servidor local:
```bash
cd FRONTEND_RESERVAS/frontend-reservas
npm install
ng serve --proxy-config proxy.conf.json
```

---

## 🌐 Instrucciones de Despliegue en Servidor de Producción (Ubuntu / Linux)

### 1. Actualizar el Frontend:
```bash
cd /home/administrador/frontend-reservas
git pull
ng build --base-href /reservas/
sudo cp -r dist/frontend-reservas/browser/* /var/www/frontend/browser/
sudo systemctl reload nginx
```

### 2. Actualizar el Backend:
```bash
cd /home/administrador/backend-reservas
git pull
pm2 restart all
```

---

## 📈 Funcionalidades Clave Implementadas

* **Tarifa Dinámica:** Permite que la recepción edite el valor de la cancha a demanda.
* **Panel de Estadísticas (Dashboard):** Análisis gráfico en historial de reservas de:
  * Total de reservas, aprobadas y canceladas.
  * Horario más solicitado de la cancha.
  * Top 5 de usuarios con mayor actividad.
* **Control Inteligente de Iluminación:** Un proceso en segundo plano (Scheduler) sincroniza las luces de la cancha a través de la nube de Shelly, encendiéndolas **5 minutos antes** de cada turno aprobado y apagándolas automáticamente al cumplirse la hora.
