// src/app/train/page.tsx
"use client";

import { useState } from "react";
import { trainTrafficAgent } from "@/rl/train-traffic";

export default function TrainPage() {
  const [training, setTraining] = useState(false);
  const [log, setLog] = useState<string | null>(null);
  const [episodes, setEpisodes] = useState(500);

  async function handleTrain() {
    setTraining(true);
    setLog(`Treinando agente DQN com ${episodes} episódios...`);
    try {
      await trainTrafficAgent(episodes);
      setLog("Treino concluído e modelo salvo em downloads");
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
      
      <div style={{ marginTop: 16, marginBottom: 16 }}>
        <label style={{ display: "block", marginBottom: 8, fontSize: 14 }}>
          Número de episódios:
        </label>
        <input
          type="number"
          min="100"
          max="2000"
          value={episodes}
          onChange={(e) => setEpisodes(parseInt(e.target.value) || 500)}
          disabled={training}
          style={{
            padding: "8px 12px",
            borderRadius: 6,
            border: "1px solid #334155",
            background: "#0f172a",
            color: "#e5e7eb",
            fontSize: 14,
            width: "200px",
          }}
        />
      </div>

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
