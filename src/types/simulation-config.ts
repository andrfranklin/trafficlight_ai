export interface SimulationConfig {
  GREEN_MIN: number; // verde mínimo (s)
  YELLOW: number; // amarelo (s)
  ALL_RED: number; // vermelho total (s)
  SERVICE_RATE: number; // carros/s atendidos no verde
  SWITCH_THRESHOLD: number; // quanto a outra fila precisa ser maior para merecer a troca
}
