// src/hooks/use-rl-traffic.ts (por exemplo)
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
        await ctrl.init(); // tenta carregar modelo do localStorage
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
  const bornTimesRef = useRef<Record<Direction, number[]>>({
    N: [],
    E: [],
    S: [],
    W: [],
  });

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
    (c: Record<Direction, number>, current: Direction): Direction => {
      const others = DIR_ORDER.filter((d) => d !== current);
      const best = others.reduce(
        (acc, d) => (c[d] > c[acc] ? d : acc),
        others[0]
      );

      const hasPriority = c[best] >= c[current] + config.SWITCH_THRESHOLD;

      if (hasPriority) return best;

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
              setServed((s) => s + canServe);
              setAvgWait((w) => {
                const totalServed = served + canServe;
                const newTotalWait = w * served + waitSum;
                return totalServed > 0 ? newTotalWait / totalServed : 0;
              });
            }
          }
          return { ...c, [d]: Math.max(0, c[d] - config.SERVICE_RATE) };
        });
      }

      // 3) controlador de fases → decrementa timer
      setTimer((t) => t - 1);

      const decideAfterGreen = () => {
        const others: Direction[] = (["N", "E", "S", "W"] as Direction[]).filter(
          (d) => d !== phase
        );
        const best = others.reduce(
          (acc, d) => (counts[d] > counts[acc] ? d : acc),
          others[0]
        );
        const shouldSwitch =
          counts[best] >= counts[phase] + config.SWITCH_THRESHOLD;

        if (shouldSwitch || counts[phase] === 0) {
          setSubState("yellow");
          setTimer(config.YELLOW);
        } else {
          setTimer(Math.ceil(config.GREEN_MIN / 2));
        }
      };

      // 4) quando o timer zerar, transiciona a sub-fase
      setTimeout(() => {
        if (timer - 1 > 0) return;

        if (subState === "green") {
          decideAfterGreen();
        } else if (subState === "yellow") {
          setSubState("allred");
          setTimer(config.ALL_RED);
        } else if (subState === "allred") {
          // 🔥 AQUI entra a IA (DqnUIController) em vez de só heurística
          const ctrl = controllerRef.current;

          let next: Direction;
          if (ctrl && controllerReady && !controllerError) {
            next = ctrl.decideNextPhase({
              counts,
              phase,
              subState,
            });
          } else {
            // fallback heurístico
            next = chooseNextPhaseHeuristic(counts, phase);
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
