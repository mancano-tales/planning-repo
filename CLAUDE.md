# Gabinete de Planejamento — planning-repo

Site estático (GitHub Pages) para acompanhamento de projetos pessoais de Tales Mancano.
Publicado em: https://mancano-tales.github.io/planning-repo/

## Estrutura

```
index.html             Dashboard: relógio, foco, agenda, projetos, quicklist
project.html           Página de projeto (fases, tarefas com prazo, Gantt)
music.html             Música de trabalho (YouTube embed)
assets/styles.css      Estilos compartilhados
assets/shared.js       Pomodoro, mini-player extras, wallpaper, helpers de data
assets/wallpapers/     6 fotos 1920w para o hero rotativo
projects/              JSONs de projetos
  manifest.json
  dissertacao.json
  schedelik.json       Resenha com Eric Rinaldi
  antitrust.json       Paper com André Nahoum
```

## Paleta e temas

- **Terracota boho**: acento primário `#D06224`, dramático `#AE431E`, oliva `#8A8835`
- **Verde (music.html)**: sobrescreve `--accent*` via `:root` no `<style>` da página
- Dark mode via `@media (prefers-color-scheme: dark)` em todos os arquivos
- Fundo: 7 camadas de `radial-gradient` com difusão orgânica + wallpaper fixed atrás

## Variáveis CSS de intensidade

| Var       | Faixa     | Padrão | Função                                            |
|-----------|-----------|--------|---------------------------------------------------|
| `--bg-a`  | 0.30–6.00 | 1.50   | Multiplicador de alpha das camadas radial-gradient |
| `--wp-a`  | 0–1       | 0.22   | Opacidade do wallpaper de fundo                    |
| `--wp-url`| `url(...)`| `none` | Foto atual (rotaciona por dia)                     |

Slider `◐` no canto superior direito controla `--bg-a`.

## Dados e persistência (localStorage)

| Chave                              | Conteúdo                                              |
|------------------------------------|-------------------------------------------------------|
| `planning-repo:project:{id}`       | JSON do projeto (fases + tarefas com `done`/`deadline`) |
| `planning-repo:quicklist`          | Lista rápida `{ items: [{ text, done }] }`             |
| `planning-repo:nowplaying`         | Track atual `{ id, list, name }`                       |
| `planning-repo:player-minimized`   | `'1'`/`'0'` — estado do mini-player                    |
| `planning-repo:bg-intensity`       | Valor do slider (30–600)                               |
| `planning-repo:pomodoro`           | Estado completo do Pomodoro (mode/running/endsAt/...)  |
| `planning-repo:wallpaper`          | `{ date, name }` — wallpaper escolhido hoje            |
| `planning-repo:focus:YYYY-MM-DD`   | `{ text, done }` — foco do dia                         |

## Schema de tarefa

```json
{
  "text": "Descrição da tarefa",
  "done": false,
  "deadline": "2026-06-15"
}
```

`deadline` é opcional (formato `YYYY-MM-DD`). Tarefas com prazo aparecem na
**Agenda** do dashboard, ordenadas por data ascendente.

## Pomodoro (assets/shared.js)

- Widget flutuante bottom-left, persiste entre páginas
- Estado em `planning-repo:pomodoro`; cálculo baseado em wall-clock
- Foco/pausa configuráveis (1–120 min foco, 1–60 min pausa)
- Beep duplo (WebAudio) + Notification API ao terminar
- Título da aba mostra `⏱ MM:SS` enquanto roda

## Mini-player persistente

- Play em `music.html` → grava `nowplaying`; outras páginas restauram no load
- Botão `—` minimiza o iframe (`height: 0`), mantendo o áudio
- Botão `×` fecha e limpa localStorage
- Estado minimizado persiste em `planning-repo:player-minimized`

## Wallpaper (Momentum-style)

- 6 fotos em `assets/wallpapers/`: vernazza, sandstone, banff, tatras, chureito, bettmerhorn
- Selecionada deterministicamente por dia (hash do ano-mês-dia)
- Clicar no relógio do today-panel cicla manualmente
- Renderizada via `<div class="wp-bg">` injetada pelo shared.js
- Opacidade controlada por `--wp-a` (0.22 default)

## Gantt (project.html)

- Barras com `.gantt-bar-shell` > `.gantt-bar-fill`; fill animado via rAF
- Linha vertical "hoje" tracejada atravessa **todas** as fases via `.gantt-overlay`
- Divisores verticais sutis em cada virada de mês
- Tick no fim da barra marca o prazo da fase
- Badge de trajetória compara `actualPct` vs. `plannedPct` (linear)

## Convenções

- Sem bundler, sem framework — HTML + CSS + JS vanilla
- Fonts: Fraunces, IBM Plex Sans, IBM Plex Mono via Google Fonts
- Progresso salvo no navegador; sincronia manual via export/import JSON
- Mouse bloom: `mousemove` → `--mx`/`--my` em todas as páginas
- `.gitignore` usa paths com `/` no início (`/styles.css` não pega `assets/styles.css`)
