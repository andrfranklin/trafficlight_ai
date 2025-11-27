// src/rl/dqn-agent.ts
"use client";

import * as tf from "@tensorflow/tfjs";

interface Transition {
  state: number[];     // s
  action: number;      // a
  reward: number;      // r
  nextState: number[]; // s'
  done: boolean;       // done
}

export class ReplayBuffer {
  private buffer: Transition[] = [];
  private maxSize: number;

  constructor(maxSize = 10000) {
    this.maxSize = maxSize;
  }

  add(tr: Transition) {
    if (this.buffer.length >= this.maxSize) {
      this.buffer.shift();
    }
    this.buffer.push(tr);
  }

  sample(batchSize: number): Transition[] {
    const res: Transition[] = [];
    for (let i = 0; i < batchSize; i++) {
      const idx = Math.floor(Math.random() * this.buffer.length);
      res.push(this.buffer[idx]);
    }
    return res;
  }

  size() {
    return this.buffer.length;
  }
}

export interface DQNConfig {
  stateSize: number;
  actionSize: number;
  gamma: number;
  lr: number;
  epsilonStart: number;
  epsilonEnd: number;
  epsilonDecay: number; // por episódio
  batchSize: number;
  minBufferSize: number;
  targetUpdateFreq: number; // a cada N episódios
}

export class DQNAgent {
  private cfg: DQNConfig;
  private qNet: tf.LayersModel;
  private targetNet: tf.LayersModel;
  private buffer: ReplayBuffer;
  private epsilon: number;

  constructor(cfg: DQNConfig) {
    this.cfg = cfg;
    this.epsilon = cfg.epsilonStart;
    this.buffer = new ReplayBuffer(20000);
    this.qNet = this.buildModel();
    this.targetNet = this.buildModel();
    this.updateTarget();
  }

  private buildModel(): tf.LayersModel {
    const model = tf.sequential();
    model.add(
      tf.layers.dense({
        units: 64,
        activation: "relu",
        inputShape: [this.cfg.stateSize],
      })
    );
    model.add(tf.layers.dense({ units: 64, activation: "relu" }));
    model.add(
      tf.layers.dense({ units: this.cfg.actionSize, activation: "linear" })
    );

    model.compile({
      optimizer: tf.train.adam(this.cfg.lr),
      loss: "meanSquaredError",
    });

    return model;
  }

  private updateTarget() {
    const weights = this.qNet.getWeights();
    this.targetNet.setWeights(weights);
  }

  // política ε-greedy
  act(state: number[]): number {
    if (Math.random() < this.epsilon) {
      return Math.floor(Math.random() * this.cfg.actionSize);
    }
    const s = tf.tensor2d([state]);
    const qValues = this.qNet.predict(s) as tf.Tensor2D;
    const data = qValues.dataSync();
    s.dispose();
    qValues.dispose();
    let best = 0;
    for (let i = 1; i < data.length; i++) {
      if (data[i] > data[best]) best = i;
    }
    return best;
  }

  remember(tr: Transition) {
    this.buffer.add(tr);
  }

  async replay(): Promise<void> {
    if (this.buffer.size() < this.cfg.minBufferSize) return;

    const batch = this.buffer.sample(this.cfg.batchSize);

    const stateBatch = batch.map((b) => b.state);
    const nextStateBatch = batch.map((b) => b.nextState);

    const states = tf.tensor2d(stateBatch);
    const nextStates = tf.tensor2d(nextStateBatch);

    const qNext = this.targetNet.predict(nextStates) as tf.Tensor2D;
    const qNextData = qNext.arraySync() as number[][];

    const qTargets = this.qNet.predict(states) as tf.Tensor2D;
    const qTargetsData = qTargets.arraySync() as number[][];

    batch.forEach((b, i) => {
      const target = qTargetsData[i];
      const maxNext = Math.max(...qNextData[i]);
      const y =
        b.done ? b.reward : b.reward + this.cfg.gamma * maxNext;
      target[b.action] = y;
    });

    const yTensor = tf.tensor2d(qTargetsData);
    await this.qNet.fit(states, yTensor, {
      epochs: 1,
      batchSize: this.cfg.batchSize,
      shuffle: true,
    });

    states.dispose();
    nextStates.dispose();
    qNext.dispose();
    qTargets.dispose();
    yTensor.dispose();
  }

  decayEpsilon() {
    this.epsilon = Math.max(
      this.cfg.epsilonEnd,
      this.epsilon * this.cfg.epsilonDecay
    );
  }

  maybeUpdateTarget(episode: number) {
    if (episode % this.cfg.targetUpdateFreq === 0) {
      this.updateTarget();
    }
  }

  async saveLocal() {
    await this.qNet.save("localstorage://traffic-dqn");
  }

  static async loadLocal(cfg: DQNConfig): Promise<DQNAgent | null> {
    try {
      const model = await tf.loadLayersModel(
        "localstorage://traffic-dqn"
      );
      const agent = new DQNAgent(cfg);
      agent.qNet = model;
      agent.updateTarget();
      return agent;
    } catch {
      return null;
    }
  }
}
