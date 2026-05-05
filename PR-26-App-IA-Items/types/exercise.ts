export type ExerciseIntensityBackend = "bajo" | "medio" | "alto";

export interface ExerciseLog {
  idExercise: number;
  idUser: number;
  idDailyLog?: number | null;
  exerciseName: string;
  durationMinutes: number;
  burnedCalories: number;
  intensity: ExerciseIntensityBackend | string;
  registeredDate: string;
  dateModification?: string | null;
}

export interface CreateExerciseLogPayload {
  idUser: number;
  exerciseName: string;
  durationMinutes: number;
  burnedCalories: number;
  intensity: ExerciseIntensityBackend | string;
  registeredDate: string;
  dateModification?: string;
}

export interface UpdateExerciseLogPayload extends CreateExerciseLogPayload {
  idExercise: number;
}
