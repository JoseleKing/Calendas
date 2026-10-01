-- Totales de respuestas por día del duelo.
CREATE TABLE conteo (
  fecha TEXT PRIMARY KEY,           -- 'AAAA-MM-DD', día del duelo en Madrid
  aciertos INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0
);
