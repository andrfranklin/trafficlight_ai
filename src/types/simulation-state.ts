import { Direction } from "./direction";
import { SubState } from "./light-state";

export interface SimulationState {
  counts: Record<Direction, number>;
  phase: Direction; // abrindo 1 direção por vez para simplicidade
  subState: SubState;
  timer: number; // tempo restante da sub-fase atual
  simTime: number; // s
  served: number;
  avgWait: number;
  paused: boolean;
}
