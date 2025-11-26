import { Direction } from "@/types/direction";
import { SubState } from "@/types/light-state";
import { SimulationConfig } from "@/types/simulation-config";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const DEFAULT_CONFIG: SimulationConfig = {
  GREEN_MIN: 6,
  YELLOW: 2,
  ALL_RED: 1,
  SERVICE_RATE: 1,
  SWITCH_THRESHOLD: 1,
};

const DIR_ORDER: Direction[] = ["N", "E", "S", "W"];

export function useHeuristicTrafficLightSim(
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

  // para calcular espera média por veículo atendido
  const bornTimesRef = useRef<Record<Direction, number[]>>({
    N: [],
    E: [],
    S: [],
    W: [],
  });
  

  // marca o tempo em que a fila começou a esperar
  const waitStartRef = useRef<Record<Direction, number>>({
    N: 0,
    E: 0,
    S: 0,
    W: 0,
  });


  // tempos de espera por fila
  const waitTimes = useMemo(() => {
  const wt: Record<Direction, number> = { N: 0, E: 0, S: 0, W: 0 };

  (["N", "E", "S", "W"] as Direction[]).forEach((d) => {
    const start = waitStartRef.current[d];

    // fila está esperando → calcula tempo
    if (counts[d] > 0 && start > 0) {
      wt[d] = simTime - start;
    } else {
      wt[d] = 0;
    }
  });

  return wt;
}, [simTime, counts]);


  
  // ---- ações públicas
  const addCar = useCallback(
    (d: Direction) => {
      setCounts((c) => {
        const wasEmpty = c[d] === 0;
        if (wasEmpty) {
          // fila começou a esperar
          waitStartRef.current[d] = simTime;
        }
        return { ...c, [d]: c[d] + 1 };
      });

      bornTimesRef.current[d].push(simTime);
    },
    [simTime]
  );

  const reset = useCallback(() => {
    setCounts({ N: 0, E: 0, S: 0, W: 0 });
    bornTimesRef.current = { N: [], E: [], S: [], W: [] };
    waitStartRef.current = { N: 0, E: 0, S: 0, W: 0 };
    setPhase("N");
    setSubState("green");
    setTimer(config.GREEN_MIN);
    setSimTime(0);
    setServed(0);
    setAvgWait(0);
    setPaused(false);
  }, [config.GREEN_MIN]);

  const togglePause = useCallback(() => setPaused((p) => !p), []);

  // ---- política heurística com tempo de espera
  const chooseNextPhase = useCallback(
    (c: Record<Direction, number>, current: Direction): Direction => {
      const others = DIR_ORDER.filter((d) => d !== current);

      const best = others.reduce((acc, d) => {
        if (c[d] !== c[acc]) return c[d] > c[acc] ? d : acc;

        // usa o tempo REAL de espera, não o tempo quando começou a esperar
        const accWait = waitTimes[acc];
        const dWait = waitTimes[d];

        return dWait > accWait ? d : acc;
      }, others[0]);

      const hasPriority =
        c[best] >= c[current] + config.SWITCH_THRESHOLD ||
        waitTimes[best] > waitTimes[current];

      if (hasPriority) return best;

      const idx = DIR_ORDER.indexOf(current);
      return DIR_ORDER[(idx + 1) % DIR_ORDER.length];
    },
    [config.SWITCH_THRESHOLD, waitTimes]
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
            // atualizar métricas de espera
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

          const newCount = Math.max(0, c[d] - config.SERVICE_RATE);

          // se a fila zerou → resetar tempo de espera
          if (newCount === 0) {
            waitStartRef.current[d] = 0;
          }

          return { ...c, [d]: newCount };
        });
      }

      // 3) controlador de fases
      setTimer((t) => t - 1);

      const decideAfterGreen = () => {
        const next = chooseNextPhase(counts, phase);

        if (next !== phase || counts[phase] === 0) {
          setSubState("yellow");
          setTimer(config.YELLOW);
        } else {
          setTimer(Math.ceil(config.GREEN_MIN / 2));
        }
      };


      // transições
      setTimeout(() => {
        if (timer - 1 > 0) return;

        if (subState === "green") {
          decideAfterGreen();
        } else if (subState === "yellow") {
          setSubState("allred");
          setTimer(config.ALL_RED);
        } else if (subState === "allred") {
          const next = chooseNextPhase(counts, phase);
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
    chooseNextPhase,
  ]);

  const canvas = {
    width: canvasSize.width ?? 900,
    height: canvasSize.height ?? 600,
  };
  

  return {
    counts,
    waitTimes,   // <--- ADICIONE AQUI
    phase,
    subState,
    timer,
    simTime,
    served,
    avgWait,
    paused,
    config,
    canvas,
    actions: { addCar, reset, togglePause },
  };

}
