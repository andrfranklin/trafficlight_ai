# Controle Inteligente de Semáforos com Reinforcement Learning

**Disciplina:** Introdução à Inteligência Artificial  
**Semestre:** 2025.2  
**Professor:** Andre Luis Fonseca Faustino
**Turma:** T03

## Integrantes do Grupo

- André Franklin de Oliveira Lima (20200049143)
- Chrystian Ruan Inacio de Sousa (20230079742)
- Iago Gabriel Nobre de Macedo (20220037927)

## Descrição do Projeto

Este projeto consiste no desenvolvimento de uma aplicação web para simular e visualizar um sistema de controle de semáforos inteligente. A solução utiliza técnicas de Aprendizagem por Reforço (Reinforcement Learning), especificamente o algoritmo Deep Q-Network (DQN), para otimizar o fluxo de tráfego em um cruzamento.

A aplicação foi construída com Next.js e React para a interface de usuário e TensorFlow.js para a implementação e execução do modelo de IA diretamente no navegador. O sistema permite comparar o desempenho do agente inteligente com uma abordagem heurística tradicional.

## Guia de Instalação e Execução

O guia abaixo descreve os passos para instalar e executar o projeto localmente.

### 1. Instalação das Dependências

Certifique-se de ter o **Node.js v20** (ou superior) e o **npm** instalados. Clone o repositório e instale as dependências listadas no `package.json`:

```bash
# Clone o repositório
git clone https://github.com/andrfranklin/trafficlight_ai

# Entre na pasta do projeto
cd trafficlight-ai

# Instale as dependências
npm install
```

### 2. Como Executar

Execute o comando abaixo no terminal para iniciar o servidor de desenvolvimento:

```bash
# Inicia a aplicação em modo de desenvolvimento
npm run dev
```

O servidor será iniciado na porta 3000. Acesse [http://localhost:3000](http://localhost:3000) em seu navegador para visualizar a simulação.

## Estrutura dos Arquivos

A estrutura de pastas do projeto está organizada da seguinte forma, seguindo as convenções de um projeto Next.js:

- `src/app/`: Contém as diferentes páginas da aplicação, como a página da simulação com IA (`/ai`), a simulação com heurística (`/heuristic`) e a de treinamento (`/train`).
- `src/components/`: Componentes React reutilizáveis, como o painel de controle (`controlPanel`) e a tela de simulação (`simulationCanvas`).
- `src/rl/`: Contém a lógica principal de Aprendizagem por Reforço, incluindo a definição do ambiente (`traffic-env.ts`), o agente DQN (`dqn-agent.ts`) e o script de treinamento (`train-traffic.ts`).
- `src/ai/`: Lógica do controlador que integra o modelo treinado à simulação.
- `public/models/`: Armazena os arquivos do modelo de TensorFlow.js pré-treinado (`.json` e `.bin`).
- `package.json`: Define os metadados do projeto e as dependências (Next.js, React, TensorFlow.js).

## Resultados e Demonstração

### Dataset utilizado
- **15 carros** inicialmente na fila **N**. Posteriormente, a adição de **15 carros** a **cada fila**, a **cada 3s** (seguindo a ordem S, E e W).
- Adicionar **5 carros** a cada fila **recém liberada** (em média 1 carro por segundo)
- Manipulação durante **2min30s**

#### Modelo heurístico
- **Resultados obtidos**
    - Pico por fila: **16 carros**
    - Duração do processo: **3min e 33s**
    - Carros liberados: **131**
    - Tempo médio de espera: **1min e 6s (66s)**

- **Evidências**
    - Durante processamento
    ![Durante processamento](image-1.png)
    - Término do processamento
    ![Término do processamento](image-2.png)

#### Modelo de Aprendizado por Reforço (RL)
- **Resultados obtidos**
    - Pico por fila: **15 carros**
    - Duração do processo: **3min e 38s**
    - Carros liberados: **139**
    - Tempo médio de espera: **58s**

- **Evidências**
    - Durante processamento
    ![Durante processamento](image-3.png)
    - Término do processamento
    ![Término do processamento](image-4.png)

### Análise

Comparando os dois modelos com base nos resultados apresentados:

- Vazão (cars released): o modelo de RL liberou 139 carros contra 131 do heurístico, um ganho de 8 carros (~6,1% de aumento na taxa de liberação).  
- Tempo médio de espera: o RL reduziu o tempo médio de espera de 66s para 58s — redução absoluta de 8s (~12,1% relativo), indicando melhor experiência média para os veículos.  
- Pico por fila: o pico máximo por fila caiu de 16 (heurístico) para 15 (RL), sugerindo que o agente RL controla melhor os congestionamentos pontuais.  
- Duração total: o processo com RL foi 5s mais longo (3m38s vs 3m33s), um aumento pequeno (~2,3%) que parece aceitável diante do aumento de vazão e da redução do tempo médio de espera.

**Interpretação**:
- O agente de RL apresenta vantagem na eficiência do sistema (mais veículos liberados e menor espera média), com redução do pico de fila — isto é consistente com uma política que equilibra melhor o fluxo entre direções.  

**Conclusão**: com os resultados atuais, o modelo de Aprendizado por Reforço supera a heurística em throughput e tempo médio de espera, além de reduzir picos de congestionamento, tornando-o a opção preferível condicionado à confirmação por experimentos adicionais.

## Referências


- https://medium.com/analytics-vidhya/building-a-powerful-dqn-in-tensorflow-2-0-explanation-tutorial-d48ea8f3177a
- https://www.tensorflow.org/agents/tutorials/1_dqn_tutorial?hl=pt-br
- https://nextjs.org
- https://www.tensorflow.org
- Aulas ministradas
