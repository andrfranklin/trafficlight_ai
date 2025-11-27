// src/app/train/page.tsx
"use client";

import { useState } from "react";
import { trainTrafficAgent } from "@/rl/train-traffic";

export default function TrainPage() {
  const [training, setTraining] = useState(false);
  const [log, setLog] = useState<string | null>(null);

  async function handleTrain() {
    setTraining(true);
    setLog("Treinando agente DQN...");
    try {
      await trainTrafficAgent();
      setLog("Treino concluído e modelo salvo em localStorage.");
    } catch (e) {
      console.error(e);
      setLog("Erro durante o treino. Veja o console.");
    } finally {
      setTraining(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#020617", color: "#e5e7eb", padding: 24 }}>
      <h1>Treino do agente DQN</h1>
      <button
        disabled={training}
        onClick={handleTrain}
        style={{
          marginTop: 12,
          padding: "10px 16px",
          borderRadius: 8,
          border: "1px solid #334155",
          background: training ? "#1e293b" : "#0ea5e9",
          color: "#020617",
          fontWeight: 600,
        }}
      >
        {training ? "Treinando..." : "Iniciar treino"}
      </button>
      {log && <p style={{ marginTop: 12, fontSize: 14 }}>{log}</p>}
    </div>
  );
}
