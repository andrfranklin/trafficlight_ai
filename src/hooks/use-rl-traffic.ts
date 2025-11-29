// src/hooks/use-rl-traffic.ts
"use client";

import { Direction } from "@/types/direction";
import { SubState } from "@/types/light-state";
import { SimulationConfig } from "@/types/simulation-config";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DqnUIController } from "@/ai/dqn-controller";

const DEFAULT_CONFIG: SimulationConfig = {
  GREEN_MIN: 6,
  YELLOW: 2,
  ALL_RED: 1,
  SERVICE_RATE: 1,
  SWITCH_THRESHOLD: 1,
};

const DIR_ORDER: Direction[] = ["N", "E", "S", "W"];

export function useRLTrafficLightSim(
  initial?: Partial<SimulationConfig>,
  canvasSize: { width?: number; height?: number } = {}
) {
  const config = useMemo<SimulationConfig>(
    () => ({ ...DEFAULT_CONFIG, ...initial }),
    [initial]
  );

  // ---- estado principal
  const [counts, setCounts] = useState<Record<Direction, number>>({
    N: 0,
    E: 0,
    S: 0,
    W: 0,
  });
  const [phase, setPhase] = useState<Direction>("N");
  const [subState, setSubState] = useState<SubState>("green");
  const [timer, setTimer] = useState<number>(config.GREEN_MIN);
  const [paused, setPaused] = useState(false);
  const [simTime, setSimTime] = useState(0);
  const [served, setServed] = useState(0);
  const [avgWait, setAvgWait] = useState(0);

  // ---- IA (DQN controller)
  const controllerRef = useRef<DqnUIController | null>(null);
  const [controllerReady, setControllerReady] = useState(false);
  const [controllerError, setControllerError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function initController() {
      try {
        const ctrl = new DqnUIController();
        await ctrl.init(); // tenta carregar modelo
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

  // para calcular espera média por veículo atendido
  // e também tempo de espera atual por fila (espera do 1º carro)
  const bornTimesRef = useRef<Record<Direction, number[]>>({
    N: [],
    E: [],
    S: [],
    W: [],
  });

  const waitTimes = useMemo(() => {
    const wt: Record<Direction, number> = { N: 0, E: 0, S: 0, W: 0 };

    (["N", "E", "S", "W"] as Direction[]).forEach((d) => {
      if (counts[d] > 0 && bornTimesRef.current[d].length > 0) {
        wt[d] = simTime - bornTimesRef.current[d][0];
      } else {
        wt[d] = 0;
      }
    });

    return wt;
  }, [simTime, counts]);

  // ---- ações públicas
  const addCar = useCallback(
    (d: Direction) => {
      setCounts((c) => ({ ...c, [d]: c[d] + 1 }));
      bornTimesRef.current[d].push(simTime);
    },
    [simTime]
  );

  const reset = useCallback(() => {
    setCounts({ N: 0, E: 0, S: 0, W: 0 });
    bornTimesRef.current = { N: [], E: [], S: [], W: [] };
    setPhase("N");
    setSubState("green");
    setTimer(config.GREEN_MIN);
    setSimTime(0);
    setServed(0);
    setAvgWait(0);
    setPaused(false);
  }, [config.GREEN_MIN]);

  const togglePause = useCallback(() => setPaused((p) => !p), []);

  // ---- política heurística (fallback se IA não estiver disponível)
  const chooseNextPhaseHeuristic = useCallback(
    (
      c: Record<Direction, number>,
      current: Direction,
      now: number
    ): Direction => {
      const others = DIR_ORDER.filter((d) => d !== current);

      // 1) maior contagem entre os outros
      let maxOthersCount = -Infinity;
      others.forEach((d) => {
        if (c[d] > maxOthersCount) maxOthersCount = c[d];
      });

      const bestCandidates = others.filter((d) => c[d] === maxOthersCount);

      const getWait = (d: Direction) =>
        c[d] > 0 && bornTimesRef.current[d].length > 0
          ? now - bornTimesRef.current[d][0]
          : 0;

      // 2) se algum outro tem pelo menos SWITCH_THRESHOLD a mais
      if (maxOthersCount >= c[current] + config.SWITCH_THRESHOLD) {
        return bestCandidates.reduce((acc, d) =>
          getWait(d) > getWait(acc) ? d : acc
        , bestCandidates[0]);
      }

      // 3) empate de contagem com a corrente: escolher quem espera mais
      if (maxOthersCount === c[current]) {
        const tied = DIR_ORDER.filter((d) => c[d] === c[current]);
        const chosen = tied.reduce((acc, d) =>
          getWait(d) > getWait(acc) ? d : acc
        , tied[0]);

        if (chosen !== current) return chosen;
      }

      // 4) caso contrário, segue a ordem de rotação
      const idx = DIR_ORDER.indexOf(current);
      return DIR_ORDER[(idx + 1) % DIR_ORDER.length];
    },
    [config.SWITCH_THRESHOLD]
  );

  // ---- loop: 1 tick = 1 segundo
  useEffect(() => {
    if (paused) return;

    const id = setInterval(() => {
      // 1) tempo simulado
      setSimTime((t) => t + 1);

      // 2) atendimento no verde
      if (subState === "green") {
        setCounts((c) => {
          const d = phase;
          const canServe = Math.min(config.SERVICE_RATE, c[d]);

          if (canServe > 0) {
            const births = bornTimesRef.current[d];
            let waitSum = 0;
            for (let i = 0; i < canServe; i++) {
              const born = births.shift();
              if (born != null) waitSum += simTime + 1 - born;
            }

            if (canServe > 0) {
              setServed((sPrev) => {
                const newServed = sPrev + canServe;
                setAvgWait((wPrev) => {
                  const newTotalWait = wPrev * sPrev + waitSum;
                  return newServed > 0 ? newTotalWait / newServed : 0;
                });
                return newServed;
              });
            }
          }

          const newCount = Math.max(0, c[d] - config.SERVICE_RATE);

          if (newCount === 0) {
            bornTimesRef.current[d] = [];
          }

          return { ...c, [d]: newCount };
        });
      }

      // 3) decrementa timer
      setTimer((t) => t - 1);

      const decideAfterGreen = () => {
        const next = chooseNextPhaseHeuristic(counts, phase, simTime);

        if (next !== phase || counts[phase] === 0) {
          setSubState("yellow");
          setTimer(config.YELLOW);
        } else {
          setTimer(Math.ceil(config.GREEN_MIN / 2));
        }
      };

      // 4) transições de sub-fase
      setTimeout(() => {
        if (timer - 1 > 0) return;

        if (subState === "green") {
          decideAfterGreen();
        } else if (subState === "yellow") {
          setSubState("allred");
          setTimer(config.ALL_RED);
        } else if (subState === "allred") {
          const ctrl = controllerRef.current;

          let next: Direction;
          if (ctrl && controllerReady && !controllerError) {
            // IA decide a próxima fase (UI → DQN)
            next = ctrl.decideNextPhase({
              counts,
              phase,
              subState,
            });
          } else {
            // fallback heurístico com mesma lógica do hook heurístico
            next = chooseNextPhaseHeuristic(counts, phase, simTime);
          }

          setPhase(next);
          setSubState("green");
          setTimer(config.GREEN_MIN);
        }
      }, 0);
    }, 1000);

    return () => clearInterval(id);
  }, [
    paused,
    subState,
    phase,
    timer,
    counts,
    simTime,
    served,
    config.ALL_RED,
    config.GREEN_MIN,
    config.SERVICE_RATE,
    config.SWITCH_THRESHOLD,
    config.YELLOW,
    chooseNextPhaseHeuristic,
    controllerReady,
    controllerError,
  ]);

  const canvas = {
    width: canvasSize.width ?? 900,
    height: canvasSize.height ?? 600,
  };

  return {
    counts,
    waitTimes,
    phase,
    subState,
    timer,
    simTime,
    served,
    avgWait,
    paused,
    config,
    canvas,
    controllerReady,
    controllerError,
    actions: { addCar, reset, togglePause },
  };
}
