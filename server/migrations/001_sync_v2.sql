-- FORTIXAM — migración 001: sync v2
--
-- Dos cambios:
--  1. workout_sessions.exercises (JSONB): el detalle del entrenamiento
--     (ejercicios → series) viajaba solo en las tablas normalizadas
--     exercise_logs/set_logs, que el endpoint /api/sync no mapeaba. Resultado:
--     el servidor devolvía sesiones sin detalle y el cliente las guardaba
--     encima de las locales, borrando las series. Con la columna JSONB el
--     detalle viaja dentro de la sesión y el merge es atómico.
--  2. user_documents: tabla genérica para entidades tipo documento
--     (Routine, Exercise, PlannedSession, Achievement, UserProfile...).
--     Antes se encolaban para sincronizar pero el servidor las ignoraba en
--     silencio y la cola las descartaba igual.
--
-- Es idempotente: se puede ejecutar varias veces sin efectos secundarios.
--   psql "$DATABASE_URL" -f server/migrations/001_sync_v2.sql

BEGIN;

ALTER TABLE workout_sessions
  ADD COLUMN IF NOT EXISTS exercises JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS user_documents (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  client_id TEXT,
  data JSONB NOT NULL,
  version INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  modified_at TIMESTAMPTZ DEFAULT NOW(),
  deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_user_documents_user
  ON user_documents(user_id, entity_type, modified_at);

-- Rellenar el detalle de las sesiones existentes desde las tablas
-- normalizadas, para que el historial ya guardado no se pierda al sincronizar.
UPDATE workout_sessions s
SET exercises = COALESCE((
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', el.id,
      'clientId', el.client_id,
      'exerciseId', el.exercise_id,
      'exerciseName', el.exercise_name,
      'order', el.exercise_order,
      'targetSets', el.target_sets,
      'targetReps', el.target_reps,
      'restSeconds', el.rest_seconds,
      'groupId', el.group_id,
      'version', el.version,
      'createdAt', el.created_at,
      'modifiedAt', el.modified_at,
      'sets', COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', sl.id,
            'clientId', sl.client_id,
            'setNumber', sl.set_number,
            'weight', sl.weight,
            'reps', sl.reps,
            'durationSeconds', sl.duration_seconds,
            'rpe', sl.rpe,
            'completed', sl.completed,
            'side', sl.side,
            'timestamp', sl.timestamp,
            'version', sl.version,
            'createdAt', sl.created_at,
            'modifiedAt', sl.modified_at
          ) ORDER BY sl.set_number
        )
        FROM set_logs sl
        WHERE sl.exercise_log_id = el.id
      ), '[]'::jsonb)
    ) ORDER BY el.exercise_order
  )
  FROM exercise_logs el
  WHERE el.session_id = s.id
), '[]'::jsonb)
WHERE s.exercises = '[]'::jsonb
  AND EXISTS (SELECT 1 FROM exercise_logs el WHERE el.session_id = s.id);

COMMIT;
