# Порядок работы

## Кто что делает

- **Александр** — кейсы и сюжет, генерация картинок и звука по стайл-гайду, плейтесты, решения по pull request.
- **Claude** — код, перенос контента, интеграция ассетов, анимации, сборка, черновики кейсов и промптов.

## Ветки

- `main` — то, что опубликовано на GitHub Pages. Напрямую не коммитим.
- Работа идёт в ветках `feature/…`, `content/…`, `art/…`, `fix/…` и попадает в `main` через pull request.
- Каждый pull request автоматически проверяется: контент, типы, сборка.

## Картинки

1. Генерация в ChatGPT по промпту из [стайл-гайда](styleguide.md), с эталонным столом в приложении.
2. Картинку присылаем в чат или загружаем на GitHub в `art-src/inbox/`.
3. Исходник переезжает в `art-src/<группа>/<id>.png`, рядом `<id>.md` с промптом.
4. `npm run assets` делает WebP в `public/assets/`.
5. Ассет подключается в игру, pull request.

## Версии и itch.io

Когда набирается заметное обновление, ставится тег `vX.Y`. Workflow «Релиз» собирает архив,
прикладывает его к GitHub Release и, если настроены `BUTLER_API_KEY` и `ITCH_TARGET`, загружает на itch.io.

Ключи и пароли никогда не коммитятся и не пересылаются в чат: только секреты GitHub.

## Разовая настройка репозитория

- [ ] Settings → Pages → Source: **GitHub Actions**
- [ ] Settings → Secrets and variables → Actions → Secrets: `BUTLER_API_KEY` (ключ из itch.io → Settings → API keys)
- [ ] Settings → Secrets and variables → Actions → Variables: `ITCH_TARGET`, например `username/perimetr-soc:html5`
