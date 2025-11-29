# TrafficLight
**Disciplina:** Introdução à Inteligência Artificial  
**Semestre:** 2025.2  
**Professor:** André Luis Fonseca Faustino   
**Turma:** T03  
## Integrantes do grupo
- Iago Gabriel Nobre de Macedo (20220037927)
- André Franklin de Oliveira Lima (20200049143)
- Chrystian Ruan Inácio de sousa (20230079742)

## Descrição do Projeto
O projeto consiste em um simulador de trafégo onde possuímos um semáforo que responde a 4 vias. Essas 4 vias podem receber diferentes quantidades de carro, o desafio do semáforo é equilibrar a abertura das vias da melhor forma com as informações que possui. Realizamos duas implementações, uma que utiliza heurística e outra que utiliza  

## Guia de Instalação e Execução
- Clone o repositório
- Acesse a raiz do projeto e instale as dependências com 'npm install' (necessário possuir node)
- Execute a aplicação com 'npm run dev'

A aplicação executará em [http://localhost:3000](http://localhost:3000)

## Estrutura dos Arquivos

## `src/`
Pasta raiz de todo o código-fonte do aplicativo.

---
### `src/app/`
Contém as páginas do sistema, cada uma virando uma rota do Next.js.

### `app/heuristic/`
- **page.tsx** → Tela que roda a simulação usando **apenas heurística**.  
- Importa o hook `useHeuristicTrafficLightSim`.  
- Serve como baseline (controle clássico).

### `app/ai/`
- **page.tsx** → Tela que roda a simulação usando **IA DQN treinada**.  
- Importa o hook `useRLTrafficLightSim`.  
- Exibe status “IA carregada”, erros, fallback, etc.

### `app/train/`
- **page.tsx** → Interface para **iniciar o treino do agente DQN**.  
- Usa `train-traffic.ts` (TensorFlow.js).  
- Exibe logs, progresso e salva o modelo no LocalStorage.

---

### `src/components/`
Organiza blocos visuais reutilizáveis, independentes da simulação.

### `components/controlPanel/`
- Botões de:
  - adicionar carros  
  - pausar  
  - resetar  
- Exibe informações da política (heurística ou IA).

### `components/simulationCanvas/`
- Renderiza o cruzamento e luzes.
- Mostra filas, estado atual e tempos.

---

### `src/heuristic/hooks/`
Contém a lógica central que atualiza o estado da simulação.

## `use-heuristic.ts`
- Hook **sem IA**, apenas regra heurística.  
- Implementa:
  - filas de carros  
  - fases do semáforo  
  - timers (green → yellow → allred → green)  
  - métricas: tempo médio, atendidos  
  - rotação de fase com threshold  
- Usado exclusivamente pela rota `/heuristic`.

## `use-rl-traffic.ts`
- Hook que usa **DQN treinado**.  
- No ciclo allred → green, usa:
  ```ts
  controller.decideNextPhase()
  ```
- Se o modelo não carregar, cai automaticamente para heurística.
- Usado exclusivamente pela rota /ai.
---
### `src/rl/`
Tudo relacionado ao agente DQN, estado de treino e simulação acelerada fica nesta pasta.

---

## `dqn-agent.ts`
Implementação completa do agente **Deep Q-Network (DQN)**:

- Rede neural principal (*Q-Network*)
- Rede neural alvo (*Target Network*)
- Replay Buffer para armazenar transições
- Política epsilon-greedy com decaimento
- Otimização e backpropagation
- Salvamento e carregamento do modelo via LocalStorage

É o “cérebro” da IA.

---

## `traffic-env.ts`
Ambiente de treino acelerado (sem canvas).  
Responsável por simular rapidamente as interações agente → ambiente.

Expõe:

- `reset()` — reinicia estado
- `step(action)` — executa a ação e devolve:
  - **observation** (vetor do estado)
  - **reward**
  - **done**
  - **nextState**
- Modela filas, delays, fases e recompensas

Usado exclusivamente pelo processo de treinamento.

---

## `simulation-state.ts`
Define os tipos e helpers para representar o **estado interno do ambiente de treino**:

- estado compactado (para RL)
- helpers para normalização
- modelagem de observações

Mantém o agente independente da simulação real da UI.

---

## `train-traffic.ts`
Arquivo responsável por **treinar o agente DQN**.

Funções principais:

- Loop de episódios (episodic training)
- Coleta de transições (state → action → reward → nextState)
- Atualização periódica da Target Network
- Ajuste do epsilon (exploração → exploração reduzida)
- Log de progresso a cada episódio:

## Resultados e Demonstração



## Referências
