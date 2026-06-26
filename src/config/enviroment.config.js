import dotenv from 'dotenv';

// Forzar la carga del .env correcto
dotenv.config({ path: './.env' });

const ENVIROMENT = {
  GMAIL_PASSWORD: process.env.GMAIL_PASSWORD,
  GMAIL_USER: process.env.GMAIL_USER,
  PORT: process.env.PORT,
  URL_FRONTEND: process.env.URL_FRONTEND,
  JWT_SECRET: process.env.JWT_SECRET,
  URL_BACKEND: process.env.URL_BACKEND,

  // Configuración MySQL
  DB_HOST: process.env.DB_HOST,
  DB_PORT: process.env.DB_PORT,
  DB_USER: process.env.DB_USER,
  DB_PASSWORD: process.env.DB_PASSWORD,
  DB_NAME: process.env.DB_NAME,
};

export default ENVIROMENT;

