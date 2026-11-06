# Периметр SOC

Игра в духе Papers, Please для специалистов по информационной безопасности.
Вы дежурный аналитик первой линии SOC: письма, логи VPN и MFA, звонки в helpdesk, заявки на доступ и алерты EDR.
Кейсы основаны на реальных инцидентах, у каждой атаки есть легитимный двойник.

**Играть:** https://alexandrmetalnikov-lab.github.io/perimetr-soc/

## Что где

| Папка | Что лежит |
|---|---|
| `src/` | код игры (Svelte + TypeScript) |
| `content/` | кейсы, регламенты, справочники в YAML — см. [content/README.md](content/README.md) |
| `public/assets/` | сжатая графика и звук, которые идут в игру |
| `art-src/` | исходники из ChatGPT с промптами — см. [art-src/README.md](art-src/README.md) |
| `public/prototypes/` | прототипы, собранные до проекта |
| `docs/` | порядок работы и стайл-гайд |

## Запуск

```bash
npm install
npm run dev            # локальный сервер
npm run assets         # сжать новые картинки из art-src/
npm run content:check  # проверить кейсы
npm run build          # сборка в dist/
```

## Публикация

- изменение в `main` → автоматически на GitHub Pages;
- тег версии (`v0.2`) → архив в Releases и загрузка на itch.io.

Подробно: [docs/workflow.md](docs/workflow.md).
