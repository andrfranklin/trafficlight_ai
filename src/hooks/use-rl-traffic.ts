// src/hooks/use-rl-traffic.ts
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Direction } from "@/types/direction";
import { SubState } from "@/types/light-state";
import { SimulationConfig } from "@/types/simulation-config";
import { DqnUIController } from "@/ai/dqn-controller";

const DEFAULT_CONFIG: SimulationConfig = {
  GREEN_MIN: 6,
  YELLOW: 2,
  ALL_RED: 1,
  SERVICE_RATE: 1,
  SWITCH_THRESHOLD: 1,
};

const DIRECTIONS_IN_ORDER: Direction[] = ["N", "E", "S", "W"];

type QueueByDirection = Record<Direction, number>;
type ArrivalTimesByDirection = Record<Direction, number[]>;
type QueueAgesByDirection = Record<Direction, number>;
type WaitTimesByDirection = Record<Direction, number>;

interface CanvasSize {
  width?: number;
  height?: number;
}

interface SimulationState {
  time: number;
  phase: Direction;
  subState: SubState;
  timer: number;
  queues: QueueByDirection;
  arrivalTimes: ArrivalTimesByDirection;
  queueAges: QueueAgesByDirection;
  servedCount: number;
  totalWaitTime: number;
}

function createEmptyQueues(): QueueByDirection {
  return { N: 0, E: 0, S: 0, W: 0 };
}

function createEmptyArrivalTimes(): ArrivalTimesByDirection {
  return { N: [], E: [], S: [], W: [] };
}

function createEmptyQueueAges(): QueueAgesByDirection {
  return { N: 0, E: 0, S: 0, W: 0 };
}

/**
 * Política heurística:
 * - se alguma outra direção tem fila >= fila atual + limiar → prioriza essa,
 *   escolhendo entre as empatadas pela maior espera
 * - se há empate geral (incluindo a atual) → escolhe entre empatadas quem espera mais
 * - caso contrário → segue round-robin (N → E → S → W → N)
 */
function chooseNextPhaseHeuristic(
  queues: QueueByDirection,
  currentPhase: Direction,
  nowTime: number,
  arrivalTimes: ArrivalTimesByDirection,
  switchThreshold: number
): Direction {
  const otherDirections = DIRECTIONS_IN_ORDER.filter(
    (direction) => direction !== currentPhase
  );

  let maxQueueSizeAmongOthers = -Infinity;
  for (const direction of otherDirections) {
    if (queues[direction] > maxQueueSizeAmongOthers) {
      maxQueueSizeAmongOthers = queues[direction];
    }
  }

  const bestCandidates = otherDirections.filter(
    (direction) => queues[direction] === maxQueueSizeAmongOthers
  );

  const getFirstVehicleWaitTime = (direction: Direction): number => {
    const queueSize = queues[direction];
    const arrivals = arrivalTimes[direction];

    if (queueSize > 0 && arrivals.length > 0) {
      return nowTime - arrivals[0];
    }
    return 0;
  };

  const currentPhaseQueueSize = queues[currentPhase];

  // 1) Alguma outra direção está mais cheia?
  if (maxQueueSizeAmongOthers >= currentPhaseQueueSize + switchThreshold) {
    return bestCandidates.reduce((best, candidate) => {
      const bestWait = getFirstVehicleWaitTime(best);
      const candidateWait = getFirstVehicleWaitTime(candidate);
      return candidateWait > bestWait ? candidate : best;
    }, bestCandidates[0]);
  }

  // 2) Empate entre atual e outras → olha espera
  if (maxQueueSizeAmongOthers === currentPhaseQueueSize) {
    const tiedDirections = DIRECTIONS_IN_ORDER.filter(
      (direction) => queues[direction] === currentPhaseQueueSize
    );

    const chosenDirection = tiedDirections.reduce((best, candidate) => {
      const bestWait = getFirstVehicleWaitTime(best);
      const candidateWait = getFirstVehicleWaitTime(candidate);
      return candidateWait > bestWait ? candidate : best;
    }, tiedDirections[0]);

    if (chosenDirection !== currentPhase) {
      return chosenDirection;
    }
  }

  // 3) Sem motivo forte para trocar → round-robin
  const currentIndex = DIRECTIONS_IN_ORDER.indexOf(currentPhase);
  const nextIndex = (currentIndex + 1) % DIRECTIONS_IN_ORDER.length;
  return DIRECTIONS_IN_ORDER[nextIndex];
}

export function useRLTrafficLightSim(
  initialConfig?: Partial<SimulationConfig>,
  canvasSize: CanvasSize = {}
) {
  const config: SimulationConfig = useMemo(
    () => ({ ...DEFAULT_CONFIG, ...initialConfig }),
    [initialConfig]
  );

  const [isPaused, setIsPaused] = useState(false);
  const [lastNonZeroAvgWait, setLastNonZeroAvgWait] = useState(0);

  const [simulationState, setSimulationState] = useState<SimulationState>(
    () => ({
      time: 0,
      phase: "N",
      subState: "green",
      timer: config.GREEN_MIN,
      queues: createEmptyQueues(),
      arrivalTimes: createEmptyArrivalTimes(),
      queueAges: createEmptyQueueAges(),
      servedCount: 0,
      totalWaitTime: 0,
    })
  );

  // -------- IA (DQN controller) --------

  const controllerRef = useRef<DqnUIController | null>(null);
  const [controllerReady, setControllerReady] = useState(false);
  const [controllerError, setControllerError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function initController() {
      try {
        const ctrl = new DqnUIController();
        await ctrl.init();
        if (!cancelled) {
          controllerRef.current = ctrl;
          setControllerReady(true);
        }
      } catch (err) {
        console.error("Falha ao inicializar DqnUIController:", err);
        if (!cancelled) {
          setControllerError("Modelo DQN não encontrado. Usando heurística.");
          setControllerReady(false);
        }
      }
    }

    initController();

    return () => {
      cancelled = true;
    };
  }, []);

  // -------- derivados --------

  // Tempo médio de espera baseado apenas nas direções com carros
  const averageWaitTime = useMemo(() => {
    let totalWaitTime = 0;
    let directionsWithCars = 0;

    for (const direction of DIRECTIONS_IN_ORDER) {
      const queueSize = simulationState.queues[direction];
      const arrivals = simulationState.arrivalTimes[direction];

      if (queueSize > 0 && arrivals.length > 0) {
        totalWaitTime += simulationState.time - arrivals[0];
        directionsWithCars++;
      }
    }

    const currentAvg =
      directionsWithCars > 0 ? totalWaitTime / directionsWithCars : 0;

    if (currentAvg > 0) {
      setLastNonZeroAvgWait(currentAvg);
      return currentAvg;
    }

    return lastNonZeroAvgWait;
  }, [
    simulationState.queues,
    simulationState.arrivalTimes,
    simulationState.time,
    lastNonZeroAvgWait,
  ]);

  // Tempo de espera = tempo do carro mais antigo da fila
  const waitTimesByDirection: WaitTimesByDirection = useMemo(() => {
    const waitTimes: WaitTimesByDirection = { N: 0, E: 0, S: 0, W: 0 };

    for (const direction of DIRECTIONS_IN_ORDER) {
      const queueSize = simulationState.queues[direction];
      const arrivals = simulationState.arrivalTimes[direction];

      if (queueSize > 0 && arrivals.length > 0) {
        waitTimes[direction] = simulationState.time - arrivals[0];
      } else {
        waitTimes[direction] = 0;
      }
    }

    return waitTimes;
  }, [simulationState.queues, simulationState.arrivalTimes, simulationState.time]);

  // -------- ações públicas --------

  const addCar = useCallback((direction: Direction) => {
    setSimulationState((prev) => {
      const newQueues: QueueByDirection = {
        ...prev.queues,
        [direction]: prev.queues[direction] + 1,
      };

      const newArrivalTimes: ArrivalTimesByDirection = {
        ...prev.arrivalTimes,
        [direction]: [
          ...prev.arrivalTimes[direction],
          prev.time, // tempo atual da simulação como "tempo de chegada"
        ],
      };

      return {
        ...prev,
        queues: newQueues,
        arrivalTimes: newArrivalTimes,
      };
    });
  }, []);

  const resetSimulation = useCallback(() => {
    setSimulationState({
      time: 0,
      phase: "N",
      subState: "green",
      timer: config.GREEN_MIN,
      queues: createEmptyQueues(),
      arrivalTimes: createEmptyArrivalTimes(),
      queueAges: createEmptyQueueAges(),
      servedCount: 0,
      totalWaitTime: 0,
    });
    setIsPaused(false);
    setLastNonZeroAvgWait(0);
  }, [config.GREEN_MIN]);

  const togglePause = useCallback(() => {
    setIsPaused((previous) => !previous);
  }, []);

  // -------- loop de simulação: 1 tick = 1 segundo --------

  useEffect(() => {
    if (isPaused) return;

    const intervalId = setInterval(() => {
      setSimulationState((prev) => {
        const nextTime = prev.time + 1;

        let {
          phase,
          subState,
          timer,
          queues,
          arrivalTimes,
          queueAges,
          servedCount,
          totalWaitTime,
        } = prev;

        // 1) Atendimento no verde
        if (subState === "green") {
          const activeDirection = phase;
          const currentQueueSize = queues[activeDirection];

          const vehiclesThatCanBeServed = Math.min(
            config.SERVICE_RATE,
            currentQueueSize
          );

          if (vehiclesThatCanBeServed > 0) {
            const arrivalQueueCopy = [...arrivalTimes[activeDirection]];

            let accumulatedWaitTime = 0;
            for (let i = 0; i < vehiclesThatCanBeServed; i += 1) {
              const arrivalTime = arrivalQueueCopy.shift();
              if (arrivalTime != null) {
                accumulatedWaitTime += nextTime - arrivalTime;
              }
            }

            const updatedQueueSize =
              currentQueueSize - vehiclesThatCanBeServed;

            const updatedQueues: QueueByDirection = {
              ...queues,
              [activeDirection]: Math.max(0, updatedQueueSize),
            };

            const updatedArrivalTimes: ArrivalTimesByDirection = {
              ...arrivalTimes,
              [activeDirection]: arrivalQueueCopy,
            };

            queues = updatedQueues;
            arrivalTimes = updatedArrivalTimes;
            servedCount += vehiclesThatCanBeServed;
            totalWaitTime += accumulatedWaitTime;
          }
        }

        // 2) Atualizar "idade" das filas (queueAges) - mantido por compatibilidade
        let nextQueueAges: QueueAgesByDirection = { ...queueAges };

        for (const direction of DIRECTIONS_IN_ORDER) {
          const queueSize = queues[direction];

          if (queueSize === 0) {
            nextQueueAges[direction] = 0;
          } else {
            nextQueueAges[direction] = nextQueueAges[direction] + 1;
          }
        }

        // 3) Atualiza timer de subfase
        let nextTimer = timer - 1;
        let nextPhase = phase;
        let nextSubState = subState;

        // 4) Transições de subEstado
        if (nextTimer <= 0) {
          if (subState === "green") {
            const chosenNextPhase = chooseNextPhaseHeuristic(
              queues,
              phase,
              nextTime,
              arrivalTimes,
              config.SWITCH_THRESHOLD
            );

            if (chosenNextPhase !== phase || queues[phase] === 0) {
              // aqui NÃO resetamos mais queueAges[phase]
              nextSubState = "yellow";
              nextTimer = config.YELLOW;
            } else {
              // mantém um pouco mais de verde
              nextTimer = Math.ceil(config.GREEN_MIN / 2);
            }
          } else if (subState === "yellow") {
            nextSubState = "allred";
            nextTimer = config.ALL_RED;
          } else if (subState === "allred") {
            // RL decide aqui; fallback para heurística
            let chosenNextPhase: Direction;

            const ctrl = controllerRef.current;
            if (ctrl && controllerReady && !controllerError) {
              chosenNextPhase = ctrl.decideNextPhase({
                counts: queues,
                phase,
                subState,
              });
            } else {
              chosenNextPhase = chooseNextPhaseHeuristic(
                queues,
                phase,
                nextTime,
                arrivalTimes,
                config.SWITCH_THRESHOLD
              );
            }

            nextPhase = chosenNextPhase;
            nextSubState = "green";
            nextTimer = config.GREEN_MIN;
          }
        }

        return {
          time: nextTime,
          phase: nextPhase,
          subState: nextSubState,
          timer: nextTimer,
          queues,
          arrivalTimes,
          queueAges: nextQueueAges,
          servedCount,
          totalWaitTime,
        };
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [
    isPaused,
    config.SERVICE_RATE,
    config.GREEN_MIN,
    config.YELLOW,
    config.ALL_RED,
    config.SWITCH_THRESHOLD,
    controllerReady,
    controllerError,
  ]);

  const canvas = {
    width: canvasSize.width ?? 900,
    height: canvasSize.height ?? 600,
  };

  return {
    counts: simulationState.queues,
    waitTimes: waitTimesByDirection,        // tempo do carro mais antigo
    phase: simulationState.phase,
    subState: simulationState.subState,
    timer: simulationState.timer,
    simTime: simulationState.time,
    served: simulationState.servedCount,
    avgWait: averageWaitTime,               // média das filas com carros (com memória do último valor)
    paused: isPaused,
    config,
    canvas,
    controllerReady,
    controllerError,
    actions: {
      addCar,
      reset: resetSimulation,
      togglePause,
    },
  };
}
