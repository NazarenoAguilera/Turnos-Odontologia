# Spec Delta

## Purpose

Permite consultar los recursos con los que se arma un turno (pacientes, profesionales, sillones/boxes y prestaciones) para que un cliente, como la interfaz web de recepción, pueda ofrecerlos para elegir sin conocer sus ids de antemano.

> Convenciones de los escenarios: todos los datos son ficticios y salen del seed del proyecto. Profesionales: Dra. Ana Prueba, Dr. Bruno Ejemplo y Dra. Carla Demo. Sillones: Sillón 1, Sillón 2 y Box 3. Prestaciones: Consulta (15 min), Limpieza (30), Extracción simple (45) y Endodoncia (90). Pacientes: Paciente Ficticio Uno, Dos y Tres. Todos activos salvo que se indique otra cosa.

## ADDED Requirements

### Requirement: Listar profesionales activos
El sistema SHALL responder `GET /profesionales` con `200` y un arreglo con los profesionales activos, ordenados por nombre. Cada elemento MUST tener solo `id` y `nombre`. Los profesionales inactivos MUST NOT aparecer. Si no hay ninguno activo, la respuesta es `200` con un arreglo vacío.

#### Scenario: Profesionales del seed
- **GIVEN** el seed ficticio cargado
- **WHEN** se pide `GET /profesionales`
- **THEN** la respuesta es `200`
- **AND** el cuerpo es `[{ id, nombre: "Dr. Bruno Ejemplo" }, { id, nombre: "Dra. Ana Prueba" }, { id, nombre: "Dra. Carla Demo" }]`
- **AND** ningún elemento tiene `matricula` ni `activo`

#### Scenario: Profesional inactivo excluido
- **GIVEN** la Dra. Carla Demo está inactiva
- **WHEN** se pide `GET /profesionales`
- **THEN** la respuesta es `200` con 2 profesionales
- **AND** la Dra. Carla Demo no aparece

#### Scenario: Sin profesionales activos
- **GIVEN** los tres profesionales están inactivos
- **WHEN** se pide `GET /profesionales`
- **THEN** la respuesta es `200` con el arreglo vacío `[]`

### Requirement: Listar sillones activos
El sistema SHALL responder `GET /sillones` con `200` y un arreglo con los sillones/boxes activos, ordenados por nombre. Cada elemento MUST tener solo `id` y `nombre`. Los sillones inactivos MUST NOT aparecer.

#### Scenario: Sillones del seed
- **GIVEN** el seed ficticio cargado
- **WHEN** se pide `GET /sillones`
- **THEN** la respuesta es `200`
- **AND** los nombres son, en orden, `Box 3`, `Sillón 1` y `Sillón 2`

#### Scenario: Sillón inactivo excluido
- **GIVEN** el Sillón 2 está inactivo
- **WHEN** se pide `GET /sillones`
- **THEN** la respuesta es `200` con `Box 3` y `Sillón 1`
- **AND** el Sillón 2 no aparece

### Requirement: Listar prestaciones activas con su duración
El sistema SHALL responder `GET /prestaciones` con `200` y un arreglo con las prestaciones activas, ordenadas por nombre. Cada elemento MUST tener solo `id`, `nombre` y `duracionMin`. Las prestaciones inactivas MUST NOT aparecer.

#### Scenario: Prestaciones del seed con duración
- **GIVEN** el seed ficticio cargado
- **WHEN** se pide `GET /prestaciones`
- **THEN** la respuesta es `200` con 4 prestaciones, en orden `Consulta`, `Endodoncia`, `Extracción simple` y `Limpieza`
- **AND** `Limpieza` tiene `duracionMin` 30 y `Endodoncia` tiene `duracionMin` 90

#### Scenario: Prestación inactiva excluida
- **GIVEN** la Endodoncia está inactiva
- **WHEN** se pide `GET /prestaciones`
- **THEN** la respuesta es `200` con 3 prestaciones
- **AND** la Endodoncia no aparece

### Requirement: Listar pacientes sin datos de contacto
El sistema SHALL responder `GET /pacientes` con `200` y un arreglo con todos los pacientes, ordenados por apellido y nombre. Cada elemento MUST tener solo `id`, `nombre` y `apellido`. La respuesta MUST NOT incluir teléfono, email, obra social ni ningún otro dato de la ficha.

#### Scenario: Pacientes del seed
- **GIVEN** el seed ficticio cargado
- **WHEN** se pide `GET /pacientes`
- **THEN** la respuesta es `200` con 3 pacientes
- **AND** los apellidos son, en orden, `Ficticio Dos`, `Ficticio Tres` y `Ficticio Uno`

#### Scenario: Sin datos de contacto en la respuesta
- **GIVEN** Paciente Ficticio Uno tiene teléfono `+54 9 11 0000-0001`, email y obra social cargados
- **WHEN** se pide `GET /pacientes`
- **THEN** ningún elemento tiene las propiedades `telefono`, `email` ni `obraSocial`
- **AND** el texto de la respuesta no contiene `0000-0001`
