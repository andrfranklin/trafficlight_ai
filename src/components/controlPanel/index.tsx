'use client';

import { Direction } from '@/types/direction';

interface Props {
  counts: Record<Direction, number>;
  paused: boolean;
  onAdd: (d: Direction) => void;
  onReset: () => void;
  onTogglePause: () => void;
  policyNote?: string;
}

export default function ControlsPanel({
  counts, paused, onAdd, onReset, onTogglePause, policyNote,
}: Props) {
  const dirs: Direction[] = ['N', 'E', 'S', 'W'];
  return (
    <aside style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 16, padding: 16 }}>
      <h3>Controles</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {dirs.map(d => (
          <div key={d} style={{ background: '#0f172a', border: '1px solid #1f2937', borderRadius: 12, padding: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <strong>{d}</strong>
              <span>{counts[d]} veículos</span>
            </div>
            <button
              onClick={() => onAdd(d)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 10, border: '1px solid #334155', background: '#1f2937', color: '#e7eefc' }}
            >
              +1 carro
            </button>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
        <button onClick={onTogglePause} style={{ flex: 1, padding: '10px 12px', borderRadius: 10, border: '1px solid #334155', background: '#1f2937', color: '#e7eefc' }}>
          {paused ? 'Retomar' : 'Pausar'}
        </button>
        <button onClick={onReset} style={{ flex: 1, padding: '10px 12px', borderRadius: 10, border: 'none', background: '#38bdf8', color: '#001018', fontWeight: 700 }}>
          Reiniciar
        </button>
      </div>

      {policyNote && (
        <div style={{ marginTop: 16, fontSize: 13, color: '#94a3b8' }}>{policyNote}</div>
      )}
    </aside>
  );
}
