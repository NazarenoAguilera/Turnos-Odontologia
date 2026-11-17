import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { construirApp } from './http/app.js';
import { abrirBase } from './infrastructure/sqlite/conexion.js';
import { cargarSeedFicticio } from './infrastructure/sqlite/seed.js';

// Configuración por variables de entorno (ver .env.example). Sin secretos en el código.
const puerto = Number(process.env.PORT ?? 3000);
const rutaBase = process.env.DB_PATH ?? './data/turnos.db';
const cargarSeed = (process.env.SEED_FICTICIO ?? 'true').toLowerCase() === 'true';

if (rutaBase !== ':memory:') mkdirSync(dirname(rutaBase), { recursive: true });

const db = abrirBase(rutaBase);
if (cargarSeed) cargarSeedFicticio(db);

const app = construirApp({ db, logger: true });

const cerrar = async () => {
  await app.close();
  db.close();
  process.exit(0);
};
process.on('SIGINT', cerrar);
process.on('SIGTERM', cerrar);

await app.listen({ port: puerto, host: '127.0.0.1' });
