'use client';
import { useEffect, useRef, useState } from 'react';

type Dir = 'N'|'E'|'S'|'W';
type Phase = Dir; // abriremos um por vez para começar simples

const GREEN_MIN = 6;   // s mínimo de verde
const YELLOW = 2;      // s amarelo
const ALL_RED = 1;     // s vermelho total entre trocas
const SERVICE_RATE = 1; // carros por segundo atendidos no verde
const SWITCH_THRESHOLD = 1; // troca se outro lado tiver pelo menos +1 carro (após GREEN_MIN)

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [counts, setCounts] = useState<Record<Dir, number>>({N:0,E:0,S:0,W:0});
  const [phase, setPhase] = useState<Phase>('N');
  const [subState, setSubState] = useState<'green'|'yellow'|'allred'>('green');
  const [timer, setTimer] = useState<number>(GREEN_MIN);
  const [paused, setPaused] = useState(false);
  const [simTime, setSimTime] = useState(0);
  const [served, setServed] = useState(0);
  const [avgWait, setAvgWait] = useState(0); // manteremos simples (refinamos depois)

  // fila de “nascimentos” para avgWait simples (opcional)
  const bornTimesRef = useRef<Record<Dir, number[]>>({N:[],E:[],S:[],W:[]});

  // add carro
  function addCar(d: Dir) {
    setCounts(c => ({...c, [d]: c[d] + 1}));
    bornTimesRef.current[d].push(simTime);
  }

  // desenhar
  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext('2d')!;
    const W = cvs.width, H = cvs.height;
    const cx = W/2, cy = H/2, laneW = 60, stopDist = 90;

    function light(x:number,y:number,on:boolean,color:string){
      ctx.fillStyle = on ? color : '#253041';
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x,y,10,0,Math.PI*2); ctx.fill(); ctx.stroke();
    }

    function draw(){
      ctx.fillStyle = '#0b1020'; ctx.fillRect(0,0,W,H);

      // pistas
      ctx.fillStyle = '#111827';
      ctx.fillRect(0, cy-laneW, W, laneW*2);
      ctx.fillRect(cx-laneW, 0, laneW*2, H);

      // linhas de retenção
      ctx.strokeStyle = '#334155';
      ctx.setLineDash([8,8]); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx- stopDist, cy-laneW); ctx.lineTo(cx- stopDist, cy+laneW); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx+ stopDist, cy-laneW); ctx.lineTo(cx+ stopDist, cy+laneW); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx-laneW, cy- stopDist); ctx.lineTo(cx+laneW, cy- stopDist); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx-laneW, cy+ stopDist); ctx.lineTo(cx+laneW, cy+ stopDist); ctx.stroke();
      ctx.setLineDash([]);

      // luzes (posições semelhantes ao seu sketch)
      const isGreen = (d:Dir) => subState==='green' && phase===d;
      const isYellow = subState==='yellow';
      light(cx - laneW*0.01, cy - stopDist - 24, isGreen('N'), '#22c55e'); // N
      light(cx + stopDist + 24, cy - laneW* 0.01, isGreen('E'), '#22c55e'); // E
      light(cx + laneW*0.01, cy + stopDist + 24, isGreen('S'), '#22c55e'); // S
      light(cx - stopDist - 24, cy + laneW* 0.01, isGreen('W'), '#22c55e'); // W
      light(cx, cy, isYellow, '#f59e0b'); // amarelo no centro

      // contagens (em preto + vermelho embaixo se quiser comparar)
      ctx.fillStyle = '#e7eefc'; ctx.font = '14px ui-monospace';
      ctx.textAlign = 'center';
      ctx.fillText(String(counts.N), cx, cy - stopDist - 48);
      ctx.fillText(String(counts.E), cx + stopDist + 48, cy);
      ctx.fillText(String(counts.S), cx, cy + stopDist + 48);
      ctx.fillText(String(counts.W), cx - stopDist - 48, cy);

      // HUD simples
      ctx.fillStyle = 'rgba(15,23,42,.7)';
      ctx.fillRect(12,12,250,100);
      ctx.fillStyle = '#cdd5e1'; ctx.textAlign = 'left';
      ctx.fillText(`Fase: ${phase} (${subState})`, 22, 36);
      ctx.fillText(`Tempo restante: ${timer.toFixed(1)}s`, 22, 56);
      ctx.fillText(`Tempo simulado: ${simTime.toFixed(0)}s`, 22, 76);
      ctx.fillText(`Servidos: ${served} | Espera média: ${avgWait.toFixed(2)}s`, 22, 96);
    }

    draw();
  }, [counts, phase, subState, timer, simTime, served, avgWait]);

  // loop 1s por tick
  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      setSimTime(t => t + 1);

      // consumir veículos do lado verde
      if (subState === 'green') {
        setCounts(c => {
          const d = phase;
          const canServe = Math.min(SERVICE_RATE, c[d]);
          if (canServe > 0) {
            // atualizar espera média usando bornTimes
            const births = bornTimesRef.current[d];
            let waitSum = 0;
            for (let i=0; i<canServe; i++) {
              const born = births.shift();
              if (born != null) waitSum += (simTime + 1 - born); // +1 porque estamos no próximo segundo
            }
            if (canServe > 0) {
              setServed(s => s + canServe);
              setAvgWait(w => {
                const totalServed = served + canServe;
                const newTotalWait = w * served + waitSum;
                return newTotalWait / totalServed;
              });
            }
          }
          return {...c, [d]: Math.max(0, c[d] - SERVICE_RATE)};
        });
      }

      // controlador
      setTimer(t => t - 1);
      if (timer - 1 <= 0) {
        if (subState === 'green') {
          // pós mínimo de verde: decidir trocar?
          const others: Dir[] = ['N','E','S','W'].filter(d => d !== phase) as Dir[];
          const best = others.reduce((acc, d) => counts[d] > counts[acc] ? d : acc, others[0]);
          const shouldSwitch = counts[best] >= counts[phase] + SWITCH_THRESHOLD;

          if (shouldSwitch) {
            setSubState('yellow'); setTimer(YELLOW);
          } else {
            // mantém mais um bloco de verde (opcional) ou vai amarelo se fila zerou
            const keepGreen = counts[phase] > 0;
            if (keepGreen) { setTimer(GREEN_MIN/2); }
            else { setSubState('yellow'); setTimer(YELLOW); }
          }
        } else if (subState === 'yellow') {
          setSubState('allred'); setTimer(ALL_RED);
        } else if (subState === 'allred') {
          // escolhe próxima fase: quem tem maior fila agora
          const dirs: Dir[] = ['N','E','S','W'];
          const next = dirs.reduce((acc, d) => counts[d] > counts[acc] ? d : acc, 'N' as Dir);
          setPhase(next); setSubState('green'); setTimer(GREEN_MIN);
        }
      }
    }, 1000);
    return () => clearInterval(id);
  }, [paused, subState, phase, timer, counts, simTime, served]);

  return (
    <div style={{minHeight:'100vh', background:'#0b1020', color:'#e7eefc', fontFamily:'system-ui'}}>
      <header style={{padding:'12px 16px', borderBottom:'1px solid #1f2937'}}>
        <h1 style={{margin:0, fontSize:18}}>🚦 TrafficLight AI — MVP heurístico</h1>
      </header>

      <main style={{display:'grid', gridTemplateColumns:'1fr 320px', gap:16, padding:16}}>
        <section style={{background:'#0f172a', border:'1px solid #1f2937', borderRadius:16, overflow:'hidden'}}>
          <canvas ref={canvasRef} width={900} height={600} />
        </section>

        <aside style={{background:'#111827', border:'1px solid #1f2937', borderRadius:16, padding:16}}>
          <h3>Controles</h3>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8}}>
            {(['N','E','S','W'] as Dir[]).map(d => (
              <div key={d} style={{background:'#0f172a', border:'1px solid #1f2937', borderRadius:12, padding:12}}>
                <div style={{display:'flex', justifyContent:'space-between', marginBottom:8}}>
                  <strong>{d}</strong>
                  <span>{counts[d]} veículos</span>
                </div>
                <button onClick={() => addCar(d)} style={{width:'100%', padding:'8px 10px', borderRadius:10, border:'1px solid #334155', background:'#1f2937', color:'#e7eefc'}}>
                  +1 carro
                </button>
              </div>
            ))}
          </div>

          <div style={{marginTop:12, display:'flex', gap:8}}>
            <button onClick={() => setPaused(p => !p)} style={{flex:1, padding:'10px 12px', borderRadius:10, border:'1px solid #334155', background:'#1f2937', color:'#e7eefc'}}>
              {paused ? 'Retomar' : 'Pausar'}
            </button>
            <button onClick={() => {
              setCounts({N:0,E:0,S:0,W:0});
              bornTimesRef.current = {N:[],E:[],S:[],W:[]};
              setPhase('N'); setSubState('green'); setTimer(GREEN_MIN);
              setSimTime(0); setServed(0); setAvgWait(0);
            }} style={{flex:1, padding:'10px 12px', borderRadius:10, border:'none', background:'#38bdf8', color:'#001018', fontWeight:700}}>
              Reiniciar
            </button>
          </div>

          <div style={{marginTop:16, fontSize:13, color:'#94a3b8'}}>
            Política heurística: abre o lado com maior fila após o verde mínimo; consome {SERVICE_RATE}/s; amarelo {YELLOW}s; all-red {ALL_RED}s.
          </div>
        </aside>
      </main>
    </div>
  );
}
