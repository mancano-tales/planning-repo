# **Regra sobre Hard Links**: Agentes de IA **NÃO devem perder tempo** testando, auditando ou recriando hard links manualmente (mklink). O script de auto-cura automatizado (alidate-governance.R / setup) cuida disso sozinho. Foque estritamente no objetivo principal da tarefa.

# Gabinete de Planejamento — planning-repo

Site estático (GitHub Pages) para acompanhamento de projetos pessoais de Tales Mancano.
Publicado em: https://mancano-tales.github.io/planning-repo/

## Estrutura

```
index.html             Dashboard: relógio, foco, agenda, projetos, controles
project.html           Página de projeto (fases, tarefas com prazo, Gantt)
music.html             Música de trabalho (YouTube embed, paleta verde fixa)
assets/styles.css      Estilos compartilhados (~2900 linhas)
assets/shared.js       Pomodoro, mini-player extras, wallpaper/wave, paletas,
                       quicklist integrada, helpers
projects/              JSONs canônicos (servem como base; localStorage tem prioridade)
  manifest.json        Índice dos projetos
  dissertacao.json     M.A. Thesis: The Politics of Redistributing Tertiary Education
  schedelik.json       Resenha com Eric Rinaldi
  antitrust.json       Paper com André Nahoum
```

## Paleta e temas

12 paletas selecionáveis, agrupadas em grade 6×2 no painel do canto superior direito:

| Linha | Paletas (monocromáticas / misturas)                                                          |
|-------|----------------------------------------------------------------------------------------------|
| 1     | Terracota (default), Sálvia, Oceano, Lavanda, Floresta, **Noite (dark)**                     |
| 2     | Pôr do Sol, Areia & Mar, Bosque, Outono, Brisa, Brasa                                        |

Cada paleta é um conjunto de overrides via `:root.palette-<id>` em `assets/styles.css`:
sobrescreve `--accent*`, `--paper*`, `--done*`, `--ink*` (quando dark), e os 7
triplets `--pal-c1`..`--pal-c7` que alimentam os blobs do fundo.

`music.html` tem paleta verde própria (override em `<style>` no head) e ignora
o seletor de paletas.

Suporte a `prefers-color-scheme: dark` no `:root` continua presente, mas as
paletas (especialmente *Noite*) são o canal recomendado para tema escuro.

## Painel de controle (top-right)

Container único `.intensity-ctrl` com:

1. **Slider de intensidade** (`◐`) — controla `--bg-a` de `0.30` a `10.00`
   (input vai de 30 a 1000, dividido por 100). Persistido em
   `planning-repo:bg-intensity`.
2. **Seletor de paletas** — 12 swatches em grade 6×2, injetados por
   `shared.js`. Click aplica a paleta; persistido em `planning-repo:palette`.

## Movimento "ondas do mar"

Substitui o antigo `mousemove`. `shared.js` anima `--mx` e `--my`
continuamente via `requestAnimationFrame`:

- `--mx` = `50 + 38·sin(t·2π/28) + 9·sin(t·2π/9)` → maré 28s + vagalhão 9s
- `--my` = `55 + 32·sin(t·2π/44) + 7·sin(t·2π/13)` → maré 44s + vagalhão 13s

Respeita `prefers-reduced-motion: reduce` (deixa estático em 50%/70%).

## Dados e persistência (localStorage)

| Chave                                | Conteúdo                                                          |
|--------------------------------------|-------------------------------------------------------------------|
| `planning-repo:project:{id}`         | JSON completo do projeto (fases + tarefas com `done`/`deadline`)  |
| `planning-repo:manifest-cache`       | Manifest importado (prioritário sobre `projects/manifest.json`)   |
| `planning-repo:manifest-overrides`   | `{ [id]: { name?, subtitle? } }` — edições inline nos cards       |
| `planning-repo:project-order`        | `[id, id, ...]` — ordem definida via drag-and-drop                |
| `planning-repo:quicklist`            | `{ items: [{ text, done }] }`                                     |
| `planning-repo:quicklist-focus`      | Índice da tarefa marcada como foco do pomodoro                    |
| `planning-repo:nowplaying`           | Track atual `{ id, list, name }`                                  |
| `planning-repo:player-minimized`     | `'1'`/`'0'`                                                       |
| `planning-repo:pomodoro`             | Estado completo (mode/running/endsAt/workMin/breakMin/sessions)   |
| `planning-repo:pomodoro-pos`         | `{ top, left }` — posição do widget arrastável                    |
| `planning-repo:bg-intensity`         | Valor do slider (30–1000)                                         |
| `planning-repo:palette`              | ID da paleta ativa (string vazia = Terracota default)             |
| `planning-repo:focus:YYYY-MM-DD`     | `{ text, done }` — foco do dia                                    |
| `planning-repo:user-name`            | Nome usado na saudação ("Tales" default)                          |

## Schema de tarefa

```json
{
  "text": "Descrição da tarefa",
  "done": false,
  "deadline": "2026-06-15"
}
```

`deadline` é opcional (formato `YYYY-MM-DD`). Tarefas com prazo aparecem na
**Agenda** do dashboard, ordenadas por data ascendente, com badge de
urgência (≤7d em accent, vencido em danger).

## Edição inline

Todos esses elementos são editáveis com click (ícone ✎ aparece no hover):

- **Saudação** — nome do usuário ("Bom dia, *Tales*") → salva em
  `planning-repo:user-name`.
- **Foco do dia** — input no today-panel → `planning-repo:focus:YYYY-MM-DD`.
- **Cards de projeto** (dashboard) — nome e subtítulo. Click no ✎ ou no texto
  suprime a navegação, vira contenteditable; blur/Enter salva, Esc cancela.
  Persiste em `planning-repo:manifest-overrides` E no JSON do projeto no
  localStorage.
- **Página do projeto** — título, subtítulo e prazo do projeto. Salva no
  JSON do projeto.
- **Tarefas** — texto da tarefa (click), prazo (botão `+ data` / data),
  remoção.

## Drag-and-drop

- **Projetos no dashboard** — handle `⋮⋮` no hover; reordena cards. Indicador
  laranja mostra alvo. Ordem salva em `planning-repo:project-order`.
- **Tarefas dentro de uma fase** — handle pequeno `⋮⋮` à esquerda da tarefa.
  Reordena dentro da MESMA fase apenas.
- **Pomodoro widget** — pill é arrastável por qualquer ponto. Posição salva.
- **Posição do mouse NÃO é mais usada** para o fundo; só drag-and-drop.

## Pomodoro + Quicklist integrados (`assets/shared.js`)

Widget flutuante único (default bottom-left, arrastável). Pill compacto
mostra `MM:SS ▶`/`❚❚`. Click expande um painel com:

1. **Header** — modo (Foco/Pausa) e contador de sessões do dia
2. **Tempo grande** + barra de progresso
3. **Linha "Trabalhando em..."** — visível quando há tarefa marcada como foco
4. **Controles** — Iniciar/Pausar, Reiniciar, Pular
5. **Lista rápida** — items com checkbox, marcador ◉/○ (define foco do
   ciclo), botão de remover. Input "+ nova nota".
6. **Settings** colapsáveis — Foco (min) e Pausa (min)

Características:
- Estado persiste entre páginas/recarregamento (wall-clock based)
- Beep duplo + Notification API ao fim do ciclo
- Auto-troca de modo (Foco → Pausa, Pausa → Foco) sem auto-start
- Título da aba mostra `⏱ MM:SS` enquanto roda
- Sincroniza entre abas via `storage` event

Em mobile landscape (max-height 520px), o widget ancora no canto
**superior-esquerdo** e o painel expande **para baixo** (em vez de para cima)
para não escapar da viewport.

## Mini-player de música

- Play em `music.html` grava `nowplaying`; outras páginas restauram no load
- Botão `—` minimiza o iframe (`height: 0`), mantendo o áudio
- Botão `×` fecha e limpa o estado
- Estado minimizado persiste em `planning-repo:player-minimized`

## Gantt (project.html)

- Barras `.gantt-bar-shell` > `.gantt-bar-fill`; fill animado via rAF
- **Linha "hoje"** vertical tracejada atravessa **todas** as fases via
  `.gantt-overlay`
- Divisores verticais sutis em cada virada de mês
- Tick no fim da barra marca o prazo da fase
- Badge de trajetória compara `actualPct` vs. `plannedPct` (linear) →
  "no prazo" / "adiantado X%" / "atrasado X%"

## Cascata de prazo (project.html)

Em "Tempo restante", três níveis de pressão temporal:

1. **Headline** — `141 dias` (grande, accent)
2. **Breakdown aditivo** — `4 meses · 2 sem · 5 dias` (somam ao total)
3. **Relógio** — `3h 23min` (atualiza a cada 30s)

Vencido → headline vira `vencido` em vermelho.

## Import / Export (footer do dashboard)

- **Exportar manifest.json** — baixa o manifest com a ordem atual
- **Importar manifest.json** — substitui via `planning-repo:manifest-cache`;
  zera overrides e ordem custom
- **Importar projeto.json** (multi-file) — sobrescreve cada
  `planning-repo:project:{id}`
- **+ Novo projeto** — prompts (name, deadline, subtitle), cria estrutura
  inicial com uma fase vazia, adiciona ao manifest cacheado
- **Restaurar ordem original** — apaga `planning-repo:project-order`

Dentro de cada projeto (project.html):
- **Exportar progress.json** — baixa o JSON inteiro (com edições, ordem
  de tarefas, prazos)
- **Importar JSON** — substitui o projeto
- **Sincronizar do repo** — recarrega do JSON canônico
- **Restaurar do repo** — apaga o localStorage e busca do repo

## Convenções

- Sem bundler, sem framework — HTML + CSS + JS vanilla
- Fonts: Fraunces (serif), IBM Plex Sans, IBM Plex Mono via Google Fonts
- Progresso salvo no navegador; sincronia entre dispositivos requer
  export → commit no repositório
- **Uppercase só no `.eyebrow`** (faixa de navegação acima dos títulos).
  Section headings, labels e botões em sentence case.
- `.gitignore` usa paths com `/` no início (`/styles.css` não pega
  `assets/styles.css`)

