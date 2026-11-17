import type { DatabaseSync } from 'node:sqlite';

/**
 * Datos de ejemplo 100 % FICTICIOS (regla dura: nunca datos reales de pacientes).
 * Fuente: knowledge-base/04_modelo_de_datos.md §Seed data inicial.
 */
export const SEED = {
  profesionales: { ana: 1, bruno: 2, carla: 3 },
  sillones: { sillon1: 1, sillon2: 2, box3: 3 },
  prestaciones: { consulta: 1, limpieza: 2, extraccion: 3, endodoncia: 4 },
  pacientes: { uno: 1, dos: 2, tres: 3 },
} as const;

export function cargarSeedFicticio(db: DatabaseSync): void {
  const profesional = db.prepare('INSERT OR IGNORE INTO profesional (id, nombre, matricula) VALUES (?, ?, ?)');
  profesional.run(SEED.profesionales.ana, 'Dra. Ana Prueba', 'MP-0001-FICTICIA');
  profesional.run(SEED.profesionales.bruno, 'Dr. Bruno Ejemplo', 'MP-0002-FICTICIA');
  profesional.run(SEED.profesionales.carla, 'Dra. Carla Demo', 'MP-0003-FICTICIA');

  const sillon = db.prepare('INSERT OR IGNORE INTO sillon (id, nombre) VALUES (?, ?)');
  sillon.run(SEED.sillones.sillon1, 'Sillón 1');
  sillon.run(SEED.sillones.sillon2, 'Sillón 2');
  sillon.run(SEED.sillones.box3, 'Box 3');

  const prestacion = db.prepare('INSERT OR IGNORE INTO prestacion (id, nombre, duracion_min) VALUES (?, ?, ?)');
  prestacion.run(SEED.prestaciones.consulta, 'Consulta', 15);
  prestacion.run(SEED.prestaciones.limpieza, 'Limpieza', 30);
  prestacion.run(SEED.prestaciones.extraccion, 'Extracción simple', 45);
  prestacion.run(SEED.prestaciones.endodoncia, 'Endodoncia', 90);

  const paciente = db.prepare(
    'INSERT OR IGNORE INTO paciente (id, nombre, apellido, telefono, email, obra_social) VALUES (?, ?, ?, ?, ?, ?)',
  );
  paciente.run(SEED.pacientes.uno, 'Paciente', 'Ficticio Uno', '+54 9 11 0000-0001', 'uno@ejemplo.invalid', 'Obra Social Ficticia');
  paciente.run(SEED.pacientes.dos, 'Paciente', 'Ficticio Dos', '+54 9 11 0000-0002', 'dos@ejemplo.invalid', null);
  paciente.run(SEED.pacientes.tres, 'Paciente', 'Ficticio Tres', '+54 9 11 0000-0003', null, null);
}
