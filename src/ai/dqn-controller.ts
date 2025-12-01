// src/ai/dqn-controller.ts
"use client";

import { Direction } from "@/types/direction";
import { SubState } from "@/types/light-state";
import { DQNAgent, DQNConfig } from "@/rl/dqn-agent";

const DIRS: Direction[] = ["N", "E", "S", "W"];

export interface UIStateForRL {
  counts: Record<Direction, number>;
  phase: Direction;
  subState: SubState;
}

function encodeState(s: UIStateForRL): number[] {
  return [
    s.counts.N,
    s.counts.E,
    s.counts.S,
    s.counts.W,
    s.phase === "N" ? 1 : 0,
    s.phase === "E" ? 1 : 0,
    s.phase === "S" ? 1 : 0,
    s.phase === "W" ? 1 : 0,
    s.subState === "green" ? 1 : 0,
    s.subState === "yellow" ? 1 : 0,
    s.subState === "allred" ? 1 : 0,
  ];
}

const DQN_CFG_UI: DQNConfig = {
  stateSize: 11,
  actionSize: 4,
  gamma: 0.99,
  lr: 0.001,
  epsilonStart: 0.0, // NA UI queremos política GREEDY
  epsilonEnd: 0.0,
  epsilonDecay: 1.0,
  batchSize: 1,
  minBufferSize: 0,
  targetUpdateFreq: 1000,
};

export class DqnUIController {
  private agent: DQNAgent | null = null;

  async init() {
    const loaded = await DQNAgent.loadFromFile(DQN_CFG_UI);
    if (!loaded) {
      throw new Error("Modelo DQN não encontrado");
    }
    this.agent = loaded;
  }

  decideNextPhase(uiState: UIStateForRL): Direction {
    if (!this.agent) {
      // fallback: abre sempre o maior
      const { counts } = uiState;
      return DIRS.reduce((acc, d) =>
        counts[d] > counts[acc] ? d : acc
      , "N" as Direction);
    }

    const stateVec = encodeState(uiState);
    const action = this.agent.act(stateVec); // epsilon=0 => greedy
    return DIRS[action] ?? "N";
  }
}
