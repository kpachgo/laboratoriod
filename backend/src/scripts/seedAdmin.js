// Crea (o actualiza la contraseña de) el usuario admin inicial.
// Uso: node src/scripts/seedAdmin.js <usuario> <password> [nombre]
const bcrypt = require('bcrypt');
const pool = require('../config/db');

async function main() {
  const [usuario, password, nombre] = process.argv.slice(2);

  if (!usuario || !password) {
    console.error('Uso: node src/scripts/seedAdmin.js <usuario> <password> [nombre]');
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const [existing] = await pool.query('SELECT id FROM usuarios WHERE usuario = ?', [usuario]);

  if (existing[0]) {
    await pool.query('UPDATE usuarios SET password_hash = ?, rol = ?, activo = TRUE WHERE id = ?', [
      passwordHash,
      'admin',
      existing[0].id,
    ]);
    console.log(`Usuario admin "${usuario}" actualizado.`);
  } else {
    await pool.query(
      'INSERT INTO usuarios (nombre, usuario, password_hash, rol, clinica_id, activo) VALUES (?, ?, ?, ?, NULL, TRUE)',
      [nombre || usuario, usuario, passwordHash, 'admin']
    );
    console.log(`Usuario admin "${usuario}" creado.`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
