// Segunda "recepcionista": corre en otro hilo con SU PROPIA conexión al mismo archivo SQLite.
import { parentPort, workerData } from 'node:worker_threads';
import { abrirBase } from '../../src/infrastructure/sqlite/conexion.js';
import { crearTurno } from '../../src/application/crear-turno.js';
import { ErrorDeNegocio } from '../../src/domain/errores.js';

const { ruta, senal, pedido } = workerData as {
  ruta: string;
  senal: SharedArrayBuffer;
  pedido: Parameters<typeof crearTurno>[1];
};
const estado = new Int32Array(senal);

const db = abrirBase(ruta, { busyTimeoutMs: 15_000 });

// Espera a que la conexión principal tenga el lock de escritura (estado 1).
Atomics.wait(estado, 0, 0, 15_000);
// Avisa que está por intentar su propia reserva (estado 2).
Atomics.store(estado, 0, 2);
Atomics.notify(estado, 0);

const t0 = performance.now();
try {
  const turno = crearTurno(db, pedido);
  parentPort?.postMessage({ ok: true, turnoId: turno.id, esperaMs: performance.now() - t0 });
} catch (e) {
  parentPort?.postMessage({
    ok: false,
    codigo: e instanceof ErrorDeNegocio ? e.codigo : String(e),
    esperaMs: performance.now() - t0,
  });
} finally {
  db.close();
}
