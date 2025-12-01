// src/rl/traffic-env.ts
import { Direction } from "@/types/direction";

export type SubState = "green" | "yellow" | "allred";

export interface EnvConfig {
  GREEN_MIN: number;
  YELLOW: number;
  ALL_RED: number;
  SERVICE_RATE: number;
  EPISODE_LENGTH: number; // max segundos por episódio
  ARRIVAL_RATE: number;   // taxa média de chegada de carros (por direção)
}

export interface EnvState {
  counts: Record<Direction, number>;
  phase: Direction;
  subState: SubState;
  timer: number;
  t: number; // tempo simulado
}

export interface StepResult {
  state: number[]; // vetor numérico p/ rede
  reward: number;
  done: boolean;
}

const DIRS: Direction[] = ["N", "E", "S", "W"];

export class TrafficEnv {
  private cfg: EnvConfig;
  private counts: Record<Direction, number>;
  private phase: Direction;
  private subState: SubState;
  private timer: number;
  private t: number;

  constructor(cfg: Partial<EnvConfig> = {}) {
    this.cfg = {
      GREEN_MIN: 6,
      YELLOW: 2,
      ALL_RED: 1,
      SERVICE_RATE: 1,
      EPISODE_LENGTH: 300,
      ARRIVAL_RATE: 0.3,
      ...cfg,
    };
    this.counts = { N: 0, E: 0, S: 0, W: 0 };
    this.phase = "N";
    this.subState = "green";
    this.timer = this.cfg.GREEN_MIN;
    this.t = 0;
  }

  private resetInner() {
    this.counts = { N: 0, E: 0, S: 0, W: 0 };
    this.phase = "N";
    this.subState = "green";
    this.timer = this.cfg.GREEN_MIN;
    this.t = 0;
  }

  public reset(): number[] {
    this.resetInner();
    return this.encodeState();
  }

  private poisson(lambda: number) {
    // bem simples/maleta, mas ok pra sim
    const L = Math.exp(-lambda);
    let p = 1;
    let k = 0;
    do {
      k++;
      p *= Math.random();
    } while (p > L);
    return k - 1;
  }

  private carArrivals() {
    DIRS.forEach((d) => {
      const arrivals = this.poisson(this.cfg.ARRIVAL_RATE);
      this.counts[d] += arrivals;
    });
  }

  private serveCars() {
    if (this.subState !== "green") return;
    const d = this.phase;
    const served = Math.min(this.cfg.SERVICE_RATE, this.counts[d]);
    this.counts[d] -= served;
  }

  private encodeState(): number[] {
    const { counts, phase, subState } = this;
    const vec: number[] = [
      counts.N,
      counts.E,
      counts.S,
      counts.W,
      // phase one-hot
      phase === "N" ? 1 : 0,
      phase === "E" ? 1 : 0,
      phase === "S" ? 1 : 0,
      phase === "W" ? 1 : 0,
      // subState one-hot
      subState === "green" ? 1 : 0,
      subState === "yellow" ? 1 : 0,
      subState === "allred" ? 1 : 0,
    ];
    return vec;
  }

  /**
   * action: 0..3 = próxima direção a abrir no verde
   */
  public step(action: number): StepResult {
    // 1) incrementa tempo
    this.t += 1;

    // 2) chegam carros
    this.carArrivals();

    // 3) servimos carros se estiver verde
    this.serveCars();

    // 4) atualiza timer da subfase
    this.timer -= 1;

    // 5) se acabou subfase -> transiciona conforme action
    if (this.timer <= 0) {
      if (this.subState === "green") {
        // sempre vai pra amarelo
        this.subState = "yellow";
        this.timer = this.cfg.YELLOW;
      } else if (this.subState === "yellow") {
        // sempre vai all-red
        this.subState = "allred";
        this.timer = this.cfg.ALL_RED;
      } else if (this.subState === "allred") {
        // aqui o agente escolhe a próxima direção
        const next = DIRS[action] ?? "N";
        this.phase = next;
        this.subState = "green";
        this.timer = this.cfg.GREEN_MIN;
      }
    }

    // 6) calcula recompensa
    const totalQueue =
      this.counts.N + this.counts.E + this.counts.S + this.counts.W;
    // reward negativa = queremos filas pequenas
    const reward = -totalQueue;

    // 7) encodar estado e checar terminal
    const state = this.encodeState();
    const done = this.t >= this.cfg.EPISODE_LENGTH;

    return { state, reward, done };
  }

  // getter opcional pra conectar na UI depois
  public getRawState(): EnvState {
    return {
      counts: { ...this.counts },
      phase: this.phase,
      subState: this.subState,
      timer: this.timer,
      t: this.t,
    };
  }
}
