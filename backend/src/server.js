const app = require('./app');
const env = require('./config/env');
const pool = require('./config/db');

async function start() {
  try {
    const connection = await pool.getConnection();
    connection.release();
    console.log('Conexión a MySQL establecida correctamente.');
  } catch (err) {
    console.error('No se pudo conectar a MySQL:', err.message);
    process.exit(1);
  }

  app.listen(env.port, () => {
    console.log(`Servidor escuchando en http://localhost:${env.port}`);
  });
}

start();
