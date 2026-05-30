# planning-repo

Gabinete de planejamento pessoal — projetos, prazos e fluxos de trabalho em acompanhamento.

**🔗 Site online:** https://mancano-tales.github.io/planning-repo/

---

## Arquitetura

Site estático que carrega projetos a partir de arquivos JSON. O dashboard (index) lista todos os projetos com relógio, foco do dia e agenda; cada projeto tem sua página individual de tracking com Gantt e cascata de prazo. Há também uma página de música de trabalho.

```
planning-repo/
├── index.html              # dashboard — relógio, foco, agenda, projetos, controles
├── project.html            # tracker individual (?id=xxx) — fases, tarefas, Gantt
├── music.html              # música de trabalho (YouTube embed, paleta verde)
├── projects/
│   ├── manifest.json       # índice dos projetos com metadata
│   ├── dissertacao.json    # M.A. Thesis
│   ├── antitrust.json      # Paper com André Nahoum
│   └── schedelik.json      # Resenha com Eric Rinaldi
├── assets/
│   ├── styles.css          # estilos compartilhados (~2900 linhas, paletas)
│   └── shared.js           # pomodoro, mini-player, wallpaper/wave, paletas, quicklist
├── CLAUDE.md               # documentação técnica detalhada do projeto
└── README.md
```

## Funcionalidades

- **Dashboard** — relógio em tempo real, saudação editável, foco do dia, agenda com tarefas por prazo, cards de projetos com progresso
- **Tracker de projeto** — fases com tarefas (checkbox + prazo opcional), gráfico Gantt com linha "hoje", cascata de prazo restante, badge de trajetória
- **Pomodoro + Quicklist** — widget flutuante arrastável com timer, lista rápida de tarefas, sincroniza entre abas
- **12 paletas de cores** — selecionáveis no painel do canto superior direito, incluindo tema escuro ("Noite")
- **Slider de intensidade** — controla opacidade do fundo animado
- **Animação de ondas** — fundo com blobs animados via requestAnimationFrame (respeita `prefers-reduced-motion`)
- **Drag-and-drop** — reordena projetos no dashboard e tarefas dentro de fases
- **Edição inline** — nome, subtítulo, prazo de projetos; texto e prazo de tarefas; nome do usuário
- **Mini-player de música** — integrado via iframe de `music.html`, minimizável
- **Import/Export** — exporta/importa JSONs de projetos e manifest para sincronização manual

## Como usar no dia a dia

1. Abra https://mancano-tales.github.io/planning-repo/
2. Clique no projeto que vai trabalhar
3. Marque tarefas, edite, adicione — tudo salva automaticamente no `localStorage` do navegador
4. Periodicamente (semanal), clique em **Exportar progress.json** e substitua o arquivo correspondente em `projects/` no repo. Commit + push.

Esse snapshot semanal é o que permite: (a) sincronizar entre dispositivos via botão **Sincronizar do repo**, e (b) que o Claude leia o estado atual via `web_fetch` quando você quiser conversar sobre o progresso.

## Como adicionar um projeto novo

1. Crie `projects/<id>.json` seguindo a estrutura abaixo
2. Adicione uma entrada em `projects/manifest.json`
3. Commit + push — pronto, aparece na landing

### Estrutura de um projeto

```json
{
  "id": "meu-projeto",
  "name": "Nome do Projeto",
  "subtitle": "Descrição curta (opcional)",
  "deadline": "2026-12-31",
  "lastUpdated": "2026-05-10T12:00:00.000Z",
  "phases": [
    {
      "id": "fase-1",
      "name": "Nome da fase",
      "start": "2026-05-10",
      "end": "2026-06-20",
      "tasks": [
        { "text": "Descrição da tarefa", "done": false, "deadline": "2026-06-15" }
      ]
    }
  ]
}
```

O campo `deadline` em tarefas é opcional (formato `YYYY-MM-DD`). Tarefas com prazo aparecem na **Agenda** do dashboard.

### Entrada no manifest

```json
{
  "id": "meu-projeto",
  "name": "Nome do Projeto",
  "subtitle": "Descrição curta",
  "deadline": "2026-12-31"
}
```

## Workflow com Claude

Quando quiser revisar progresso ou planejar próximos passos comigo:

- **"Olha meu progresso na dissertação"** → eu busco `projects/dissertacao.json` direto do site
- **"Atualiza minhas tarefas do Cap. 3"** → te entrego um `dissertacao.json` editado, você commita
- **"Adiciona um projeto novo de fichamentos"** → te entrego o JSON + entrada no manifest

Trabalhamos sempre em cima do JSON canônico do repo, não do `localStorage`.

## Persistência: como o estado é gerenciado

| Onde | Quando | Para quê |
|---|---|---|
| `localStorage` do navegador | A cada clique/edição | Uso diário, sem atrito |
| `projects/<id>.json` no repo | Manualmente (semanal) | Backup canônico, sync entre devices, leitura pelo Claude |

A página sempre prefere `localStorage` se ele existir (mais recente que o repo). Use **Sincronizar do repo** quando trocar de dispositivo, ou **Restaurar do repo** quando quiser descartar mudanças locais.

## Stack

- HTML/CSS/JS vanilla, sem build step nem framework
- Fontes: Fraunces (serif) + IBM Plex Sans + IBM Plex Mono (Google Fonts)
- Hospedagem: GitHub Pages
- Persistência: `localStorage` (cliente) + arquivos JSON (servidor)

## Documentação técnica

Para detalhes sobre paletas, localStorage keys, convenções de código e comportamento de cada componente, consulte [`CLAUDE.md`](CLAUDE.md).
