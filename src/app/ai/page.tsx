'use client'
import ControlsPanel from "@/components/controlPanel";
import SimulatorCanvas from "@/components/simulationCanvas";
import { useRLTrafficLightSim } from "@/hooks/use-rl-traffic";

export default function AiPage() {
    const sim = useRLTrafficLightSim(
        { GREEN_MIN: 6, SERVICE_RATE: 1, SWITCH_THRESHOLD: 1 },
        { width: 900, height: 600 }
    );

    return (
        <div style={{ minHeight: '100vh', background: '#0b1020', color: '#e7eefc', fontFamily: 'system-ui' }}>
            <header style={{ padding: '12px 16px', borderBottom: '1px solid #1f2937' }}>
                <h1 style={{ margin: 0, fontSize: 18 }}>🚦 TrafficLight AI — Modo DQN</h1>
            </header>

            {sim.controllerError && (
                <p style={{ marginTop: 8, fontSize: 12, color: "#f97373", paddingLeft: 16 }}>
                    {sim.controllerError}
                </p>
            )}
            {sim.controllerReady && !sim.controllerError && (
                <p style={{ marginTop: 8, fontSize: 12, color: "#4ade80", paddingLeft: 16 }}>
                    IA DQN carregada ✅
                </p>
            )}

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
                    policyNote={
                        sim.controllerReady && !sim.controllerError
                            ? "Controlador: IA DQN (política aprendida a partir do treino)."
                            : `Controlador: Heurística (fallback). Verde mínimo ${sim.config.GREEN_MIN}s, amarelo ${sim.config.YELLOW}s, all-red ${sim.config.ALL_RED}s.`
                    }
                />
            </main>
        </div>
    );
}