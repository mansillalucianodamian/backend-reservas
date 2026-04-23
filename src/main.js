import express from 'express';
import cors from 'cors';
import ENVIROMENT from './config/enviroment.config.js';

// Conexión MySQL
import { pool } from './config/db.js';

// Routers
import authRouter from './routes/auth.router.js';
import workspaceRouter from './routes/workspace.router.js';
import memberRouter from './routes/member.router.js';

// Otros
import randomMiddleware from './middlewares/random.middleware.js';
import mailTransporter from './config/mailTransporter.config.js';
import MessagesChannelRepository from './repositories/messageChannel.repository.js';

const app = express();

// Configuración global
app.use(cors());
app.use(express.json());

// Rutas principales
app.use('/api/auth', authRouter);
app.use('/api/workspace', workspaceRouter);
app.use('/api/member', memberRouter);

// Endpoint de prueba para verificar conexión MySQL
app.get('/ping', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1 + 1 AS result');
    res.json({ message: 'Conexión OK', result: rows[0].result });
  } catch (error) {
    console.error('[SERVER ERROR]: Fallo en la conexión', error);
    res.status(500).json({ error: 'Error en la conexión a MySQL' });
  }
});

// Servidor
app.listen(ENVIROMENT.PORT || 8080, () => {
  console.log(`Tu servidor se está ejecutando correctamente en el puerto ${ENVIROMENT.PORT || 8080}`);
});
