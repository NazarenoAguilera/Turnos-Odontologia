import { afterEach, describe, expect, it } from 'vitest';
import { Worker } from 'node:worker_threads';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { abrirBase } from '../../src/infrastructure/sqlite/conexion.js';
import { cargarSeedFicticio, SEED } from '../../src/infrastructure/sqlite/seed.js';
import { crearTurno, type Reloj } from '../../src/application/crear-turno.js';

const RETENCION_MS = 300;
let directorio: string | undefined;

afterEach(() => {
  if (directorio) rmSync(directorio, { recursive: true, force: true });
  directorio = undefined;
});

describe('Reservas concurrentes sin solapamiento', () => {
  it('Dos reservas simultáneas del mismo sillón', async () => {
    directorio = mkdtempSync(join(tmpdir(), 'turnos-concurrencia-'));
    const ruta = join(directorio, 'agenda.db');

    const db = abrirBase(ruta, { busyTimeoutMs: 15_000 });
    cargarSeedFicticio(db);

    const senal = new SharedArrayBuffer(4);
    const estado = new Int32Array(senal);

    // Pedido de la otra recepcionista: Dr. Bruno Ejemplo, Sillón 1, 10:00-10:30.
    const worker = new Worker(new URL('./concurrencia.worker.ts', import.meta.url), {
      execArgv: ['--import', 'tsx'],
      workerData: {
        ruta,
        senal,
        pedido: {
          pacienteId: SEED.pacientes.dos,
          profesionalId: SEED.profesionales.bruno,
          sillonId: SEED.sillones.sillon1,
          prestacionId: SEED.prestaciones.limpieza,
          inicio: '2026-12-01T10:00:00-03:00',
        },
      },
    });
    const resultadoWorker = new Promise<{ ok: boolean; codigo?: string; esperaMs: number }>((resolve, reject) => {
      worker.once('message', resolve);
      worker.once('error', reject);
    });

    // El reloj se consulta DENTRO de la transacción, con el lock tomado: ahí retenemos
    // a la conexión principal hasta que la segunda esté intentando reservar.
    const relojQueRetiene: Reloj = {
      ahora() {
        Atomics.store(estado, 0, 1);
        Atomics.notify(estado, 0);
        Atomics.wait(estado, 0, 1, 15_000); // hasta que el worker avise (estado 2)
        Atomics.wait(estado, 0, 2, RETENCION_MS); // y un poco más, con el worker ya bloqueado
        return new Date('2026-11-17T12:00:00Z');
      },
    };

    // Pedido de la primera recepcionista: Dra. Ana Prueba, Sillón 1, 10:00-10:30.
    const primero = crearTurno(db, {
      pacienteId: SEED.pacientes.uno,
      profesionalId: SEED.profesionales.ana,
      sillonId: SEED.sillones.sillon1,
      prestacionId: SEED.prestaciones.limpieza,
      inicio: '2026-12-01T10:00:00-03:00',
    }, relojQueRetiene);

    const segundo = await resultadoWorker;
    await worker.terminate();

    // Exactamente uno se crea; el otro recibe el conflicto por sillón.
    expect(primero.id).toBeGreaterThan(0);
    expect(segundo).toMatchObject({ ok: false, codigo: 'TURNO_SOLAPADO_SILLON' });
    // La segunda conexión tuvo que esperar el lock de la primera (no leyó un estado viejo).
    expect(segundo.esperaMs).toBeGreaterThanOrEqual(RETENCION_MS * 0.5);

    const enSillon = db.prepare('SELECT COUNT(*) AS n FROM turno WHERE sillon_id = ?')
      .get(SEED.sillones.sillon1) as { n: number };
    expect(enSillon.n).toBe(1);
    db.close();
    expect(existsSync(ruta)).toBe(true); // se borra en afterEach
  });
});
