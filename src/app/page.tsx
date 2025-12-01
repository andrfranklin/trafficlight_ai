'use client';

import Link from 'next/link';

export default function Home() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0b1020',
        color: '#e7eefc',
        fontFamily: 'system-ui',
      }}
    >
      <header
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #1f2937',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <h1 style={{ margin: 0, fontSize: 18 }}>
          🚦 TrafficLight AI — Playground
        </h1>
        <span style={{ fontSize: 12, color: '#9ca3af' }}>
          Escolha uma implementação para testar
        </span>
      </header>

      <main
        style={{
          padding: 24,
          maxWidth: 960,
          margin: '0 auto',
          display: 'grid',
          gap: 16,
        }}
      >
        <section
          style={{
            background: '#0f172a',
            border: '1px solid #1f2937',
            borderRadius: 16,
            padding: 20,
          }}
        >
          <h2 style={{ marginTop: 0, marginBottom: 12, fontSize: 20 }}>
            Bem-vindo ao TrafficLight AI
          </h2>
          <p style={{ margin: 0, color: '#9ca3af', fontSize: 14 }}>
            Este projeto contém diferentes estratégias de controle de semáforo:
            uma heurística clássica e uma versão com aprendizado por reforço
            (DQN). Clique em uma das opções abaixo para abrir a simulação.
          </p>
        </section>

        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 16,
          }}
        >
          {/* Card Heurística */}
          <Link
            href="/heuristic"
            style={{
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            <article
              style={{
                background: '#0f172a',
                border: '1px solid #1f2937',
                borderRadius: 16,
                padding: 20,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.transform =
                  'translateY(-2px)';
                (e.currentTarget as HTMLDivElement).style.boxShadow =
                  '0 10px 25px rgba(15,23,42,0.7)';
                (e.currentTarget as HTMLDivElement).style.borderColor =
                  '#4b5563';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.transform =
                  'translateY(0)';
                (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                (e.currentTarget as HTMLDivElement).style.borderColor =
                  '#1f2937';
              }}
            >
              <h3 style={{ margin: 0, fontSize: 18 }}>Heuristic Controller</h3>
              <p style={{ margin: 0, fontSize: 13, color: '#9ca3af' }}>
                Simulador com política heurística: abre o lado com maior fila,
                usa limiar de troca e tempo mínimo de verde, amarelo e all-red.
              </p>
              <div
                style={{
                  marginTop: 'auto',
                  display: 'flex',
                  justifyContent: 'flex-end',
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    background: '#111827',
                    borderRadius: 999,
                    padding: '6px 10px',
                    border: '1px solid #1f2937',
                  }}
                >
                  Ir para /heuristic →
                </span>
              </div>
            </article>
          </Link>

          {/* Card RL / DQN */}
          <Link
            href="/ai"
            style={{
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            <article
              style={{
                background: '#0f172a',
                border: '1px solid #1f2937',
                borderRadius: 16,
                padding: 20,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.transform =
                  'translateY(-2px)';
                (e.currentTarget as HTMLDivElement).style.boxShadow =
                  '0 10px 25px rgba(15,23,42,0.7)';
                (e.currentTarget as HTMLDivElement).style.borderColor =
                  '#4b5563';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.transform =
                  'translateY(0)';
                (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                (e.currentTarget as HTMLDivElement).style.borderColor =
                  '#1f2937';
              }}
            >
              <h3 style={{ margin: 0, fontSize: 18 }}>RL / DQN Controller</h3>
              <p style={{ margin: 0, fontSize: 13, color: '#9ca3af' }}>
                Versão com aprendizado por reforço: um agente DQN decide a
                próxima fase com base no estado atual do cruzamento. Caso o
                modelo não esteja disponível, cai no fallback heurístico.
              </p>
              <div
                style={{
                  marginTop: 'auto',
                  display: 'flex',
                  justifyContent: 'flex-end',
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    background: '#111827',
                    borderRadius: 999,
                    padding: '6px 10px',
                    border: '1px solid #1f2937'
                  }}
                >
                  Ir para /ai →
                </span>
              </div>
            </article>
          </Link>
        </section>

        <section
          style={{
            marginTop: 8,
            fontSize: 12,
            color: '#6b7280',
          }}
        >
          <p style={{ margin: 0 }}>
            Dica: você pode usar esta página como hub para comparar as
            políticas, medir métricas e eventualmente adicionar outras versões
            (por exemplo, diferentes heurísticas ou modelos de RL).
          </p>
        </section>
      </main>
    </div>
  );
}
