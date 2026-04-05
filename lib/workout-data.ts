export interface Exercise {
  id: string;
  name: string;
  /** Enlace al video (p. ej. YouTube: watch, youtu.be, Shorts). */
  videoUrl?: string;
  sets: number;
  targetReps?: string;
  targetTime?: number;
  notes?: string;
  isTimeBased?: boolean;
  isChecklist?: boolean;
}

export interface Block {
  id: string;
  name: string;
  rounds: number;
  notes?: string;
  exercises: Exercise[];
}

export interface WorkoutDay {
  id: string;
  name: string;
  subtitle: string;
  emoji: string;
  color: string;
  blocks: Block[];
  estimatedTime: number;
}

export interface SetLog {
  weight: number;
  reps: number;
  completed: boolean;
}

export interface WorkoutLog {
  id?: string;
  user_id?: string;
  day_id: string;
  date: string;
  exercises: Record<string, SetLog[]>;
  completed: boolean;
}

export const seedWorkoutDays: WorkoutDay[] = [
  // ===== DÍA 1: PIERNAS Y GLÚTEOS =====
  {
    id: "day-1",
    name: "PIERNAS Y GLÚTEOS",
    subtitle: "Fuerza sin fallo muscular",
    emoji: "🦵",
    color: "from-primary/20 to-primary/5",
    estimatedTime: 80,
    blocks: [
      {
        id: "b1-calor",
        name: "ENTRADA EN CALOR",
        rounds: 1,
        notes: "Hacer 15 repeticiones con la barra liviana antes de arrancar.",
        exercises: [
          { id: "e1-1", name: "Movilidad y fuerza con barra", sets: 1, targetReps: "15", isChecklist: true },
        ],
      },
      {
        id: "b1-1",
        name: "BLOQUE 1",
        rounds: 4,
        notes: "Descanso 2' – 2:30\" entre vueltas. Moderado a pesado, sin fallo.",
        exercises: [
          { id: "e1-2", name: "Sentadilla trasnuca", sets: 4, targetReps: "6" },
          { id: "e1-3", name: "Plancha baja", sets: 1, targetTime: 40, isTimeBased: true },
          { id: "e1-4", name: "Posición de hollow", sets: 1, targetTime: 40, isTimeBased: true },
        ],
      },
      {
        id: "b1-2",
        name: "BLOQUE 2",
        rounds: 4,
        notes: "Descanso 2' – 2:30\" entre vueltas.",
        exercises: [
          { id: "e1-5", name: "Hip thrust", sets: 4, targetReps: "8" },
          { id: "e1-6", name: "Plancha con toque de hombros", sets: 1, targetTime: 40, isTimeBased: true },
          { id: "e1-7", name: "Plancha dinámica", sets: 1, targetTime: 40, isTimeBased: true },
        ],
      },
      {
        id: "b1-3",
        name: "BLOQUE 3",
        rounds: 4,
        notes: "Descanso 2' – 2:30\" entre vueltas.",
        exercises: [
          { id: "e1-8", name: "Peso muerto", sets: 4, targetReps: "6" },
          { id: "e1-9", name: "Plancha baja", sets: 1, targetTime: 30, isTimeBased: true },
          { id: "e1-10", name: "Plancha dinámica", sets: 1, targetTime: 30, isTimeBased: true },
          { id: "e1-11", name: "Hollow", sets: 1, targetTime: 30, isTimeBased: true },
        ],
      },
      {
        id: "b1-4",
        name: "BLOQUE 4",
        rounds: 3,
        notes: "Siempre el mismo peso en la sentadilla sumo. Descanso 2'.",
        exercises: [
          { id: "e1-12", name: "Sentadilla sumo con mancuerna", sets: 3, targetReps: "8" },
          { id: "e1-13", name: "Sit ups", sets: 1, targetReps: "20", isChecklist: true },
        ],
      },
      {
        id: "b1-5",
        name: "BLOQUE 5",
        rounds: 3,
        notes: "Descanso 2' entre vueltas.",
        exercises: [
          { id: "e1-14", name: "Patada de glúteo mayor", sets: 3, targetReps: "10/10" },
          { id: "e1-15", name: "Patada de glúteo medio", sets: 3, targetReps: "10/10" },
          { id: "e1-16", name: "Sit ups", sets: 1, targetReps: "20", isChecklist: true },
          { id: "e1-17", name: "V ups alternos", sets: 1, targetReps: "20", isChecklist: true },
          { id: "e1-18", name: "Mountain climbers", sets: 1, targetReps: "20/20", isChecklist: true },
        ],
      },
    ],
  },

  // ===== DÍA 2: ESPALDA =====
  {
    id: "day-2",
    name: "ESPALDA",
    subtitle: "Espalda + Tríceps + Aeróbico",
    emoji: "🔥",
    color: "from-orange-500/20 to-orange-500/5",
    estimatedTime: 75,
    blocks: [
      {
        id: "b2-calor",
        name: "ENTRADA EN CALOR",
        rounds: 2,
        notes: "2 vueltas de todos los ejercicios.",
        exercises: [
          { id: "e2-1", name: "Walkout", sets: 1, targetReps: "10", isChecklist: true, videoUrl: "https://youtube.com/shorts/6PH9CjOytYE" },
          { id: "e2-2", name: "Nados", sets: 1, targetReps: "20", isChecklist: true, videoUrl: "https://youtube.com/shorts/c14e2VcONCk" },
          { id: "e2-3", name: "Plancha con toque de hombros", sets: 1, targetReps: "10/10", isChecklist: true },
          { id: "e2-4", name: "Yoga push ups", sets: 1, targetReps: "10", isChecklist: true, videoUrl: "https://youtu.be/-7TEPQKkTxI" },
        ],
      },
      {
        id: "b2-1",
        name: "BLOQUE 1",
        rounds: 4,
        exercises: [
          { id: "e2-5", name: "Remo con barra", sets: 4, targetReps: "12", videoUrl: "https://youtube.com/shorts/tIoFoKz0aWs" },
          { id: "e2-6", name: "Remo combinado en TRX", sets: 4, targetReps: "8/6", notes: "Los dos movimientos = 1 rep" },
          { id: "e2-7", name: "Lateral drag", sets: 4, targetReps: "8/8", videoUrl: "https://youtube.com/shorts/qloJQtRogbw" },
        ],
      },
      {
        id: "b2-2",
        name: "BLOQUE 2",
        rounds: 4,
        exercises: [
          { id: "e2-8", name: "Remo a un brazo en polea", sets: 4, targetReps: "10/10", videoUrl: "https://youtube.com/shorts/OZ6OVdhGIss" },
          { id: "e2-9", name: "Flexión en barra", sets: 4, targetReps: "12/10" },
          { id: "e2-10", name: "Agrupados con disco", sets: 4, targetReps: "20" },
        ],
      },
      {
        id: "b2-3",
        name: "BLOQUE 3 - TRÍCEPS",
        rounds: 3,
        exercises: [
          { id: "e2-11", name: "Tríceps francés con barra", sets: 3, targetReps: "12", videoUrl: "https://youtube.com/shorts/0xGlRUFKG2c" },
          { id: "e2-12", name: "Tríceps en polea", sets: 3, targetReps: "12", videoUrl: "https://youtube.com/shorts/fyY-ubX23j8" },
        ],
      },
      {
        id: "b2-4",
        name: "BLOQUE AERÓBICO",
        rounds: 3,
        notes: "20 segundos cada ejercicio. Después de las 3 vueltas: trotar en cinta 15 min.",
        exercises: [
          { id: "e2-13", name: "Mountain climbers", sets: 1, targetTime: 20, isTimeBased: true, videoUrl: "https://youtube.com/shorts/7W4JEfEKuC4" },
          { id: "e2-14", name: "Plank jacks", sets: 1, targetTime: 20, isTimeBased: true, videoUrl: "https://youtu.be/PR9nHQXCZMo" },
          { id: "e2-15", name: "Burpees", sets: 1, targetTime: 20, isTimeBased: true },
          { id: "e2-16", name: "Sentadillas sin peso", sets: 1, targetTime: 20, isTimeBased: true },
          { id: "e2-17", name: "Trote en cinta 15 min", sets: 1, targetReps: "15 min", isChecklist: true, notes: "Al finalizar las 3 vueltas" },
        ],
      },
    ],
  },

  // ===== DÍA 3: HOMBROS Y METABÓLICO =====
  {
    id: "day-3",
    name: "HOMBROS Y METABÓLICO",
    subtitle: "Hombros + WOD + Abs",
    emoji: "💪",
    color: "from-blue-500/20 to-blue-500/5",
    estimatedTime: 70,
    blocks: [
      {
        id: "b3-1",
        name: "HOMBROS - BLOQUE 1",
        rounds: 4,
        notes: "Controlado sin rebotar.",
        exercises: [
          { id: "e3-1", name: "Press militar con barra", sets: 4, targetReps: "10" },
        ],
      },
      {
        id: "b3-2",
        name: "HOMBROS - BLOQUE 2",
        rounds: 4,
        exercises: [
          { id: "e3-2", name: "Press Arnold sentada", sets: 4, targetReps: "10" },
        ],
      },
      {
        id: "b3-3",
        name: "HOMBROS - BLOQUE 3",
        rounds: 3,
        exercises: [
          { id: "e3-3", name: "Vuelos laterales", sets: 3, targetReps: "10" },
          { id: "e3-4", name: "Vuelos posteriores", sets: 3, targetReps: "10" },
          { id: "e3-5", name: "Vuelos frontales", sets: 3, targetReps: "10" },
        ],
      },
      {
        id: "b3-4",
        name: "METABÓLICO - BLOQUE 1",
        rounds: 3,
        notes: "45 seg de descanso entre vueltas.",
        exercises: [
          { id: "e3-6", name: "Peso muerto con mancuernas", sets: 3, targetReps: "12" },
          { id: "e3-7", name: "Caminata en estocada con sandbag 10kg", sets: 1, targetReps: "10 pasos + 10 sent. + 10 pasos + 10 sent.", isChecklist: true, notes: "10 pasos ida, 10 sentadillas, 10 pasos vuelta, 10 sentadillas" },
          { id: "e3-8", name: "Sprawl con pelota", sets: 1, targetReps: "10", isChecklist: true },
        ],
      },
      {
        id: "b3-5",
        name: "METABÓLICO - BLOQUE 2",
        rounds: 4,
        notes: "1 min de descanso entre vueltas. Wall ball baja reps cada vuelta: 20/18/16/14.",
        exercises: [
          { id: "e3-9", name: "Wall ball", sets: 4, targetReps: "20/18/16/14", notes: "Baja reps cada vuelta" },
          { id: "e3-10", name: "Burpees", sets: 1, targetReps: "10", isChecklist: true },
          { id: "e3-11", name: "200 mts run", sets: 1, targetReps: "200m", isChecklist: true },
        ],
      },
      {
        id: "b3-6",
        name: "BLOQUE DE ABS",
        rounds: 3,
        exercises: [
          { id: "e3-12", name: "Abs agrupados con pelota de 3kg", sets: 1, targetReps: "15", isChecklist: true },
          { id: "e3-13", name: "Crunch estático con pelota", sets: 1, targetReps: "15", isChecklist: true },
          { id: "e3-14", name: "V ups alternos con pelota", sets: 1, targetReps: "10/10", isChecklist: true },
          { id: "e3-15", name: "Plank jacks", sets: 1, targetReps: "20", isChecklist: true },
        ],
      },
    ],
  },
];
