-- Titanium PWA Database Schema v2.0
-- PostgreSQL 15

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users/Profiles table
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    username VARCHAR(50) UNIQUE,
    email VARCHAR(255) UNIQUE,
    avatar_url TEXT,
    preferences JSONB DEFAULT '{}',
    weight_unit VARCHAR(10) DEFAULT 'kg',
    audio_enabled BOOLEAN DEFAULT true
);

-- Workout Sessions table
CREATE TABLE IF NOT EXISTS workout_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    routine_id INTEGER NOT NULL,
    routine_name VARCHAR(100) NOT NULL,
    mode VARCHAR(20) NOT NULL CHECK (mode IN ('guided', 'individual')),
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER,
    total_sets INTEGER DEFAULT 0,
    total_reps INTEGER DEFAULT 0,
    total_volume DECIMAL(10,2) DEFAULT 0,
    completed BOOLEAN DEFAULT false,
    notes TEXT
);

-- Exercise Logs table
CREATE TABLE IF NOT EXISTS exercise_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    session_id UUID REFERENCES workout_sessions(id) ON DELETE CASCADE,
    exercise_id VARCHAR(50) NOT NULL,
    exercise_name VARCHAR(100) NOT NULL,
    exercise_order INTEGER NOT NULL,
    sets_completed INTEGER DEFAULT 0,
    target_sets INTEGER NOT NULL,
    target_reps VARCHAR(20),
    rest_seconds INTEGER DEFAULT 60
);

-- Set Logs table
CREATE TABLE IF NOT EXISTS set_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    exercise_log_id UUID REFERENCES exercise_logs(id) ON DELETE CASCADE,
    set_number INTEGER NOT NULL,
    weight DECIMAL(8,2),
    reps INTEGER,
    duration_seconds INTEGER,
    completed BOOLEAN DEFAULT true,
    rpe INTEGER CHECK (rpe >= 1 AND rpe <= 10)
);

-- Exercise Library table
CREATE TABLE IF NOT EXISTS exercise_library (
    id VARCHAR(50) PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    equipment VARCHAR(50) NOT NULL,
    primary_muscle VARCHAR(50),
    secondary_muscles VARCHAR(50)[],
    description TEXT,
    instructions TEXT[],
    tips TEXT[],
    image_url TEXT,
    video_url TEXT,
    difficulty VARCHAR(20),
    is_active BOOLEAN DEFAULT true
);

-- Routine Templates table
CREATE TABLE IF NOT EXISTS routine_templates (
    id INTEGER PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    name VARCHAR(100) NOT NULL,
    title VARCHAR(100) NOT NULL,
    subtitle TEXT,
    type VARCHAR(20) NOT NULL CHECK (type IN ('strength', 'hiit')),
    duration VARCHAR(20),
    difficulty VARCHAR(20),
    equipment VARCHAR(100),
    exercises JSONB NOT NULL,
    alternative_exercises JSONB,
    is_active BOOLEAN DEFAULT true
);

-- User Preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    default_mode VARCHAR(20) DEFAULT 'guided',
    default_equipment VARCHAR(20) DEFAULT 'dumbbells',
    rest_timer_sound BOOLEAN DEFAULT true,
    completion_sound BOOLEAN DEFAULT true,
    auto_start_rest BOOLEAN DEFAULT true,
    theme VARCHAR(20) DEFAULT 'dark'
);

-- Weight Logs table (for body weight tracking)
CREATE TABLE IF NOT EXISTS weight_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    weight DECIMAL(8,2) NOT NULL,
    date DATE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_weight_logs_user_id ON weight_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_weight_logs_date ON weight_logs(date);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON workout_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_start_time ON workout_sessions(start_time);
CREATE INDEX IF NOT EXISTS idx_exercise_logs_session ON exercise_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_set_logs_exercise ON set_logs(exercise_log_id);
CREATE INDEX IF NOT EXISTS idx_exercise_library_category ON exercise_library(category);
CREATE INDEX IF NOT EXISTS idx_exercise_library_equipment ON exercise_library(equipment);

-- Updated at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for profiles
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at 
    BEFORE UPDATE ON profiles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default exercise library
INSERT INTO exercise_library (id, name, category, equipment, primary_muscle, description) VALUES
('bench_press', 'Press de Banca Plano', 'strength', 'dumbbells', 'chest', 'Empuje horizontal con mancuernas'),
('one_arm_row', 'Remo a una mano', 'strength', 'dumbbells', 'back', 'Remo unilateral con mancuerna'),
('seated_press', 'Press Militar Sentado', 'strength', 'dumbbells', 'shoulders', 'Press de hombros sentado'),
('bicep_curl', 'Curl de Bíceps Clásico', 'strength', 'dumbbells', 'biceps', 'Curl con palmas hacia arriba'),
('chest_fly', 'Aperturas en Banco', 'strength', 'dumbbells', 'chest', 'Aperturas controladas en banco'),
('tricep_extension', 'Copa de Tríceps', 'strength', 'dumbbells', 'triceps', 'Extensión de tríceps por encima de la cabeza'),
('hammer_curl', 'Curl Martillo', 'strength', 'dumbbells', 'biceps', 'Curl con palmas neutras'),
('tricep_kickback', 'Patada de Tríceps', 'strength', 'dumbbells', 'triceps', 'Extensión de tríceps a una mano'),
('goblet_squat', 'Sentadilla Goblet', 'strength', 'dumbbells', 'quads', 'Sentadilla con mancuerna al pecho'),
('romanian_deadlift', 'Peso Muerto Rumano', 'strength', 'dumbbells', 'hamstrings', 'Peso muerto a piernas rígidas'),
('crunch', 'Crunch Abdominal', 'strength', 'bodyweight', 'abs', 'Encogimiento abdominal'),
('bulgarian_split', 'Zancada Búlgara', 'strength', 'dumbbells', 'quads', 'Zancada con pie trasero elevado'),
('glute_bridge', 'Puente de Glúteo', 'strength', 'bodyweight', 'glutes', 'Hip thrust en suelo'),
('plank', 'Plancha Abdominal', 'strength', 'bodyweight', 'abs', 'Plancha isométrica'),
('step_up', 'Step-Up', 'strength', 'dumbbells', 'quads', 'Subida a banco con mancuernas'),
-- NEW Day 1 exercises
('lateral_raise', 'Elevaciones Laterales', 'strength', 'dumbbells', 'shoulders', 'Elevación lateral de brazos'),
('front_raise', 'Elevaciones Frontales', 'strength', 'dumbbells', 'shoulders', 'Elevación frontal de brazos'),
('upright_row', 'Remo al Mentón', 'strength', 'dumbbells', 'shoulders', 'Tira vertical hacia el mentón'),
('reverse_fly', 'Aperturas Inversas', 'strength', 'dumbbells', 'back', 'Apertura invertida para deltoides posterior'),
('shrug', 'Encogimientos', 'strength', 'dumbbells', 'shoulders', 'Encogimiento de hombros con mancuernas'),
-- NEW Day 2 exercises
('calf_raise', 'Elevación de Gemelos', 'strength', 'dumbbells', 'calves', 'Elevación de talones con mancuernas'),
('wall_sit', 'Sentadilla en Pared', 'strength', 'bodyweight', 'quads', 'Isométrico con espalda en pared'),
('leg_raise', 'Elevación de Piernas', 'strength', 'bodyweight', 'abs', 'Elevación de piernas rectas tumbado'),
('russian_twist', 'Russian Twist', 'strength', 'bodyweight', 'abs', 'Giro de torso ruso con peso'),
-- HIIT exercises
('thrusters', 'Dumbbell Thrusters', 'hiit', 'dumbbells', 'full_body', 'Sentadilla con press de hombros'),
('renegade_row', 'Renegade Row', 'hiit', 'dumbbells', 'full_body', 'Remo en posición de plancha'),
('dumbbell_swing', 'Swing con Mancuerna', 'hiit', 'dumbbells', 'full_body', 'Swing ruso con mancuerna'),
('jump_lunge', 'Zancadas con Salto', 'hiit', 'bodyweight', 'legs', 'Zancadas alternas con salto'),
('devil_press', 'Devil Press', 'hiit', 'dumbbells', 'full_body', 'Burpee con mancuernas y press'),
('jump_squat', 'Sentadillas con Salto', 'hiit', 'bodyweight', 'legs', 'Sentadilla con salto en la subida'),
('push_up', 'Flexiones', 'hiit', 'bodyweight', 'chest', 'Push-ups clásicas'),
('mountain_climber', 'Mountain Climbers', 'hiit', 'bodyweight', 'full_body', 'Escaladores en plancha'),
('jumping_jack', 'Jumping Jacks', 'hiit', 'bodyweight', 'full_body', 'Saltos de tijera'),
('burpee', 'Burpees Clásicos', 'hiit', 'bodyweight', 'full_body', 'Burpees completos con pecho al suelo'),
-- NEW HIIT exercises
('high_knees', 'High Knees', 'hiit', 'bodyweight', 'full_body', 'Corre en sitio subiendo rodillas'),
('plank_jack', 'Plank Jacks', 'hiit', 'bodyweight', 'core', 'Abre y cierra piernas en plancha'),
('tuck_jump', 'Tuck Jumps', 'hiit', 'bodyweight', 'legs', 'Salto vertical con rodillas al pecho'),
-- NEW Day 5 Full Body exercises
('clean_press', 'Clean & Press', 'strength', 'dumbbells', 'full_body', 'Clean con mancuernas seguido de press'),
('sumo_squat', 'Sentadilla Sumo', 'strength', 'dumbbells', 'quads', 'Sentadilla con pies abiertos'),
('deadlift', 'Peso Muerto', 'strength', 'dumbbells', 'full_body', 'Peso muerto con mancuernas'),
('push_press', 'Push Press', 'strength', 'dumbbells', 'shoulders', 'Press con impulso de piernas'),
('woodchopper', 'Woodchopper', 'strength', 'dumbbells', 'core', 'Giro diagonal con mancuerna'),
('man_maker', 'Man Makers', 'strength', 'dumbbells', 'full_body', 'Burpee + remo + flexión + press')
ON CONFLICT (id) DO NOTHING;

-- Insert routine templates
INSERT INTO routine_templates (id, name, title, subtitle, type, duration, difficulty, equipment, exercises) VALUES
(1, 'Día 1', 'Día 1: Empuje/Tirón', 'Combinación explosiva de movimientos de tracción y empuje', 'strength', '50 MIN', 'Intermedio', 'MANCUERNAS • CABLES', 
'[
  {"id": "d1-1", "name": "Press de Banca Plano", "sets": 3, "reps": "10-12", "restSeconds": 90},
  {"id": "d1-2", "name": "Remo a una mano", "sets": 3, "reps": "10-12", "restSeconds": 90},
  {"id": "d1-3", "name": "Press Militar Sentado", "sets": 3, "reps": "10", "restSeconds": 90},
  {"id": "d1-4", "name": "Curl de Bíceps Clásico", "sets": 3, "reps": "12", "restSeconds": 60},
  {"id": "d1-5", "name": "Aperturas en Banco", "sets": 3, "reps": "12-15", "restSeconds": 60},
  {"id": "d1-6", "name": "Copa de Tríceps", "sets": 3, "reps": "12", "restSeconds": 60},
  {"id": "d1-7", "name": "Curl Martillo", "sets": 3, "reps": "12", "restSeconds": 60},
  {"id": "d1-8", "name": "Patada de Tríceps", "sets": 3, "reps": "12", "restSeconds": 60},
  {"id": "d1-9", "name": "Elevaciones Laterales", "sets": 3, "reps": "12-15", "restSeconds": 60},
  {"id": "d1-10", "name": "Elevaciones Frontales", "sets": 3, "reps": "12", "restSeconds": 60},
  {"id": "d1-11", "name": "Remo al Mentón", "sets": 3, "reps": "10-12", "restSeconds": 75},
  {"id": "d1-12", "name": "Aperturas Inversas", "sets": 3, "reps": "12-15", "restSeconds": 60},
  {"id": "d1-13", "name": "Encogimientos", "sets": 3, "reps": "15", "restSeconds": 45}
]'::jsonb
),
(2, 'Día 2', 'Día 2: Tronco Inferior y Core', 'Cimiento sólido. Trabajo pesado de tren inferior y estabilidad abdominal', 'strength', '55 MIN', 'Avanzado', 'MANCUERNAS • PESO CORPORAL',
'[
  {"id": "d2-1", "name": "Sentadilla Goblet", "sets": 4, "reps": "12", "restSeconds": 90},
  {"id": "d2-2", "name": "Peso Muerto Rumano", "sets": 4, "reps": "12-15", "restSeconds": 90},
  {"id": "d2-3", "name": "Crunch Abdominal", "sets": 3, "reps": "20", "restSeconds": 60},
  {"id": "d2-4", "name": "Zancada Búlgara", "sets": 3, "reps": "10", "restSeconds": 90},
  {"id": "d2-5", "name": "Puente de Glúteo", "sets": 3, "reps": "15", "restSeconds": 60},
  {"id": "d2-6", "name": "Plancha Abdominal", "sets": 3, "reps": "45-60s", "restSeconds": 60},
  {"id": "d2-7", "name": "Step-Up", "sets": 3, "reps": "12", "restSeconds": 90},
  {"id": "d2-8", "name": "Elevación de Gemelos", "sets": 4, "reps": "20", "restSeconds": 45},
  {"id": "d2-9", "name": "Sentadilla en Pared", "sets": 3, "reps": "45s", "restSeconds": 60},
  {"id": "d2-10", "name": "Elevación de Piernas", "sets": 3, "reps": "15", "restSeconds": 60},
  {"id": "d2-11", "name": "Russian Twist", "sets": 3, "reps": "20", "restSeconds": 45}
]'::jsonb
),
(3, 'Día 3', 'Día 3: HIIT', 'Máxima intensidad en corto tiempo', 'hiit', '30 MIN', 'Cardio HIIT', 'EQUIPAMIENTO',
'[
  {"id": "d3-a-1", "name": "Dumbbell Thrusters", "sets": 4, "reps": "15", "restSeconds": 90},
  {"id": "d3-a-2", "name": "Renegade Row", "sets": 4, "reps": "12", "restSeconds": 90},
  {"id": "d3-a-3", "name": "Swing con Mancuerna", "sets": 4, "reps": "20", "restSeconds": 90},
  {"id": "d3-a-4", "name": "Zancadas con Salto", "sets": 4, "reps": "30s", "restSeconds": 60},
  {"id": "d3-a-5", "name": "Devil Press", "sets": 4, "reps": "10", "restSeconds": 90},
  {"id": "d3-a-6", "name": "High Knees", "sets": 4, "reps": "45s", "restSeconds": 60},
  {"id": "d3-a-7", "name": "Plank Jacks", "sets": 4, "reps": "30s", "restSeconds": 45},
  {"id": "d3-a-8", "name": "Tuck Jumps", "sets": 4, "reps": "10", "restSeconds": 60}
]'::jsonb
),
(4, 'Extra', 'Extra: Libre', 'Ejercicio libre configurable', 'strength', '20 MIN', 'Intermedio', 'LIBRE',
'[
  {"id": "ex-1", "name": "Ejercicio Libre", "sets": 3, "reps": "Tu elección", "restSeconds": 60}
]'::jsonb
),
(5, 'Día 5', 'Día 5: Full Body', 'Entrenamiento completo de cuerpo entero', 'strength', '45 MIN', 'Avanzado', 'MANCUERNAS',
'[
  {"id": "d5-1", "name": "Clean & Press", "sets": 4, "reps": "10", "restSeconds": 90},
  {"id": "d5-2", "name": "Sentadilla Sumo", "sets": 4, "reps": "12", "restSeconds": 90},
  {"id": "d5-3", "name": "Peso Muerto", "sets": 4, "reps": "10-12", "restSeconds": 90},
  {"id": "d5-4", "name": "Push Press", "sets": 3, "reps": "12", "restSeconds": 75},
  {"id": "d5-5", "name": "Woodchopper", "sets": 3, "reps": "12", "restSeconds": 60},
  {"id": "d5-6", "name": "Man Makers", "sets": 3, "reps": "8", "restSeconds": 90}
]'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- Add alternative exercises for Day 3
UPDATE routine_templates 
SET alternative_exercises = '[
  {"id": "d3-b-1", "name": "Sentadillas con Salto", "sets": 4, "reps": "15", "restSeconds": 60},
  {"id": "d3-b-2", "name": "Flexiones", "sets": 4, "reps": "Al fallo", "restSeconds": 60},
  {"id": "d3-b-3", "name": "Mountain Climbers", "sets": 4, "reps": "45s", "restSeconds": 60},
  {"id": "d3-b-4", "name": "Jumping Jacks", "sets": 4, "reps": "60s", "restSeconds": 60},
  {"id": "d3-b-5", "name": "Burpees Clásicos", "sets": 4, "reps": "12", "restSeconds": 60},
  {"id": "d3-b-6", "name": "Sentadilla con Salto", "sets": 4, "reps": "15", "restSeconds": 60}
]'::jsonb
WHERE id = 3;