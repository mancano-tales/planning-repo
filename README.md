# planning-repo

Gabinete de planejamento pessoal — projetos, prazos e fluxos de trabalho em acompanhamento.

**🔗 Site online:** https://mancano-tales.github.io/planning-repo/

---

## Arquitetura

Site estático que carrega projetos a partir de arquivos JSON. Cada projeto é um JSON em `projects/`. A landing lista todos; cada projeto tem sua página individual de tracking.

```
planning-repo/
├── index.html              # landing — lista todos os projetos
├── project.html            # tracker individual (?id=xxx)
├── projects/
│   ├── manifest.json       # lista de projetos com metadata
│   └── <id>.json           # estado de cada projeto
├── assets/
│   └── styles.css          # estilos compartilhados
└── README.md
```

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
        { "text": "Descrição da tarefa", "done": false }
      ]
    }
  ]
}
```

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

- HTML/CSS/JS vanilla, sem build step
- Fontes: Fraunces + IBM Plex Sans/Mono (Google Fonts)
- Hospedagem: GitHub Pages
- Persistência: `localStorage` (cliente) + arquivos JSON (servidor)
