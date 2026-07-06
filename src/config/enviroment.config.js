import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Detectar ruta del archivo actual
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar siempre el .env desde la raíz del proyecto
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const ENVIROMENT = {
  // Configuración MySQL
  DB_HOST: process.env.DB_HOST,
  DB_PORT: process.env.DB_PORT,
  DB_USER: process.env.DB_USER,
  DB_PASSWORD: process.env.DB_PASSWORD,
  DB_NAME: process.env.DB_NAME,

  // Configuración general
  PORT: process.env.PORT,
  URL_BACKEND: process.env.URL_BACKEND,
  URL_FRONTEND: process.env.URL_FRONTEND,
  GMAIL_USER: process.env.GMAIL_USER,
  GMAIL_PASSWORD: process.env.GMAIL_PASSWORD,
  JWT_SECRET: process.env.JWT_SECRET,
  SHELLY_CLOUD_URL: process.env.SHELLY_CLOUD_URL,
  SHELLY_DEVICE_ID: process.env.SHELLY_DEVICE_ID,
  SHELLY_AUTH_KEY: process.env.SHELLY_AUTH_KEY,
};

export default ENVIROMENT;
