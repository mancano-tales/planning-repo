# Gabinete de Planejamento — planning-repo

Site estático (GitHub Pages) para acompanhamento de projetos pessoais de Tales Mancano.
Publicado em: https://mancano-tales.github.io/planning-repo/

## Estrutura

```
index.html          Dashboard com cards de projetos, quicklist, stats
project.html        Página de projeto individual (fases, tarefas, Gantt)
music.html          Página de música de trabalho (YouTube embed)
assets/styles.css   Estilos compartilhados (único CSS externo)
projects/           JSONs de projetos (um por arquivo)
  manifest.json     Índice de projetos carregados pelo dashboard
  dissertacao.json  Projeto da dissertação de mestrado
```

## Paleta e temas

- **Terracota boho**: acento primário `#D06224`, acento dramático `#AE431E`, oliva `#8A8835`
- **Verde (music.html)**: sobrescreve `--accent*` via `:root` no `<style>` da página
- Suporte a dark mode via `@media (prefers-color-scheme: dark)` em todos os arquivos
- Fundo: 7 camadas de `radial-gradient` com difusão orgânica (ink bleed), segue o mouse via `--mx`/`--my`

## Variável `--bg-a` (regulador de intensidade)

Todas as cores de fundo usam `rgb(R G B / calc(alpha * var(--bg-a)))`.
O slider no canto superior direito (`◐`) define `--bg-a` de 0.30 a 3.00 (padrão 1.50).
Valor persistido em `localStorage['planning-repo:bg-intensity']`.

## Dados e persistência (localStorage)

| Chave                              | Conteúdo                          |
|------------------------------------|-----------------------------------|
| `planning-repo:project:{id}`       | JSON completo do projeto (fases + tarefas com `done`) |
| `planning-repo:quicklist`          | Lista rápida `{ items: [{ text, done }] }` |
| `planning-repo:nowplaying`         | Track atual `{ id, list, name }` para mini-player |
| `planning-repo:bg-intensity`       | Valor do slider de intensidade (30–300) |

## Mini-player persistente

- Ao clicar play em `music.html`, grava `nowplaying` em localStorage
- `index.html` e `project.html` restauram o player automaticamente no load
- Fechar o player (`×`) limpa o localStorage

## Gantt interativo (project.html)

- Barras com estrutura `.gantt-bar-shell` > `.gantt-bar-fill`
- Fill animado com `requestAnimationFrame` proporcional a `phaseProgress().pct`
- Shell usa `--accent-tint` como fundo para ser visível mesmo com 0% de progresso
- Click → abre a fase e faz scroll suave (`scrollIntoView`)
- Hover → tooltip flutuante com nome, datas e % concluído

## Convenções

- Sem bundler, sem framework — HTML + CSS + JS vanilla
- Fonts: Fraunces (serif), IBM Plex Sans, IBM Plex Mono via Google Fonts
- Progresso salvo no navegador; sincronização manual via export/import JSON
- Mouse bloom: `mousemove` → `--mx`/`--my` em todas as páginas
- `.gitignore` usa paths com `/` no início para não excluir subdiretórios (`/styles.css` não pega `assets/styles.css`)
