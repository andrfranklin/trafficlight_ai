// src/rl/train-traffic.ts
"use client";

import { TrafficEnv } from "./traffic-env";
import { DQNAgent, DQNConfig } from "./dqn-agent";

export async function trainTrafficAgent(
  episodes = 500
): Promise<void> {
    const env = new TrafficEnv({
    EPISODE_LENGTH: 200, // antes era 300
    ARRIVAL_RATE: 0.3,
  });

  const cfg: DQNConfig = {
    stateSize: 11,
    actionSize: 4,
    gamma: 0.99,
    lr: 0.001,
    epsilonStart: 1.0,
    epsilonEnd: 0.05,
    epsilonDecay: 0.995,
    batchSize: 64,
    minBufferSize: 1000,
    targetUpdateFreq: 10,
  };

  const agent = new DQNAgent(cfg);

  for (let ep = 1; ep <= episodes; ep++) {
    let state = env.reset();
    let totalReward = 0;

    for (;;) {
      const action = agent.act(state);
      const { state: nextState, reward, done } = env.step(action);

      agent.remember({ state, action, reward, nextState, done });
      await agent.replay();

      state = nextState;
      totalReward += reward;

      if (done) break;
    }

    agent.decayEpsilon();
    agent.maybeUpdateTarget(ep);

    console.log(
      `Episode ${ep}/${episodes} | Reward: ${totalReward.toFixed(
        2
      )} | epsilon=${agent["epsilon"].toFixed(3)}`
    );
  }

  await agent.saveLocal();
  console.log("Modelo salvo em downloads://traffic-dqn");
}
