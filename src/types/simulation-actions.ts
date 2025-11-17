import { Direction } from "./direction";

export interface SimulationActions {
  addCar: (d: Direction) => void;
  reset: () => void;
  togglePause: () => void;
}
