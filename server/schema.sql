-- FORTIXAM v8 — PostgreSQL schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  username TEXT NOT NULL,
  password_hash TEXT,
  auth_provider TEXT DEFAULT 'local',
  avatar_color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ
);

-- Profiles (goal, level, preferences)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  goal TEXT,
  level TEXT,
  days_per_week INT,
  equipment TEXT[],
  birth_date DATE,
  height_cm INT,
  weight_goal NUMERIC,
  restrictions TEXT[],
  onboarding_complete BOOLEAN DEFAULT FALSE,
  preferences JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Workout sessions
CREATE TABLE IF NOT EXISTS workout_sessions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL,
  routine_id TEXT,
  routine_name TEXT,
  mode TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration_seconds INT,
  total_sets INT DEFAULT 0,
  total_reps INT DEFAULT 0,
  total_volume NUMERIC DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  notes TEXT,
  version INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  modified_at TIMESTAMPTZ DEFAULT NOW(),
  deleted BOOLEAN DEFAULT FALSE
);

-- Exercise logs within a session
CREATE TABLE IF NOT EXISTS exercise_logs (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES workout_sessions(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL,
  exercise_id TEXT,
  exercise_name TEXT,
  exercise_order INT,
  target_sets INT,
  target_reps TEXT,
  rest_seconds INT,
  group_id TEXT,
  version INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  modified_at TIMESTAMPTZ DEFAULT NOW()
);

-- Set logs
CREATE TABLE IF NOT EXISTS set_logs (
  id UUID PRIMARY KEY,
  exercise_log_id UUID REFERENCES exercise_logs(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL,
  set_number INT,
  weight NUMERIC,
  reps INT,
  duration_seconds INT,
  rpe INT,
  completed BOOLEAN DEFAULT TRUE,
  side TEXT,
  timestamp TIMESTAMPTZ,
  version INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  modified_at TIMESTAMPTZ DEFAULT NOW()
);

-- Weight entries
CREATE TABLE IF NOT EXISTS weight_entries (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL,
  weight NUMERIC NOT NULL,
  date DATE NOT NULL,
  version INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  modified_at TIMESTAMPTZ DEFAULT NOW(),
  deleted BOOLEAN DEFAULT FALSE
);

-- Plans
CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL,
  name TEXT,
  description TEXT,
  goal TEXT,
  level TEXT,
  days_per_week INT,
  weeks INT,
  schedule JSONB,
  active BOOLEAN DEFAULT FALSE,
  version INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  modified_at TIMESTAMPTZ DEFAULT NOW(),
  deleted BOOLEAN DEFAULT FALSE
);

-- Achievements
CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  title TEXT,
  description TEXT,
  progress NUMERIC DEFAULT 0,
  target NUMERIC,
  completed BOOLEAN DEFAULT FALSE,
  unlocked_at TIMESTAMPTZ,
  icon TEXT,
  color TEXT,
  version INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  modified_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON workout_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_modified ON workout_sessions(modified_at);
CREATE INDEX IF NOT EXISTS idx_exercise_logs_session ON exercise_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_set_logs_exercise ON set_logs(exercise_log_id);
CREATE INDEX IF NOT EXISTS idx_weights_user_date ON weight_entries(user_id, date);
CREATE INDEX IF NOT EXISTS idx_plans_user ON plans(user_id);
CREATE INDEX IF NOT EXISTS idx_achievements_user ON achievements(user_id, key);
