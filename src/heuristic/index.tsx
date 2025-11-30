import SimulatorCanvas from "@/components/simulationCanvas";
import { useHeuristicTrafficLightSim } from "./hooks/use-heuristic";
import ControlsPanel from "@/components/controlPanel";

export default function HeuristicTrafficLightSim() {
  const sim = useHeuristicTrafficLightSim(
    // config opcional:
    { GREEN_MIN: 6, SERVICE_RATE: 1, SWITCH_THRESHOLD: 1 },
    // tamanho do canvas:
    { width: 900, height: 600 }
  );

  return (
    <div style={{ minHeight: '100vh', background: '#0b1020', color: '#e7eefc', fontFamily: 'system-ui' }}>
      <header style={{ padding: '12px 16px', borderBottom: '1px solid #1f2937' }}>
        <h1 style={{ margin: 0, fontSize: 18 }}>🚦 TrafficLight AI — MVP</h1>
      </header>

      <main style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, padding: 16 }}>
        <section style={{ background: '#0f172a', border: '1px solid #1f2937', borderRadius: 16, overflow: 'hidden' }}>
          <SimulatorCanvas
            width={sim.canvas.width}
            height={sim.canvas.height}
            counts={sim.counts}
            waitTimes={sim.waitTimes}
            phase={sim.phase}
            subState={sim.subState}
            timer={sim.timer}
            simTime={sim.simTime}
            served={sim.served}
            avgWait={sim.avgWait}
          />
        </section>

        <ControlsPanel
          counts={sim.counts}
          paused={sim.paused}
          onAdd={sim.actions.addCar}
          onReset={sim.actions.reset}
          onTogglePause={sim.actions.togglePause}
          policyNote={`Política heurística: após o verde mínimo, troca se outra direção tiver pelo menos +${sim.config.SWITCH_THRESHOLD} carro(s) e em caso de empate, analisam-se os tempos de espera das filas; amarelo ${sim.config.YELLOW}s; all-red ${sim.config.ALL_RED}s; atendimento ${sim.config.SERVICE_RATE}/s.`}
        />
      </main>
    </div>
  );
}