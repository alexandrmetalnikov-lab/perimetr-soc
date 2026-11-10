# Стайл-гайд: «Ночная смена»

Полная версия с промптами для всех ассетов: [public/prototypes/styleguide.html](../public/prototypes/styleguide.html)
(в опубликованной игре — `prototypes/styleguide.html`).

## Коротко

- **Фактура:** цифровая живопись с видимыми мазками, лёгкое зерно, приглушённые цвета. Не фото, не 3D.
- **Свет:** тёплая лампа слева, холодный бирюзовый свет мониторов справа, тени тёмно-синие.
- **Камера:** стол — от лица сидящего, чуть сверху. Предметы — в три четверти сверху, около 30°.
- **Время:** конец ноября, после 16:00 за окном темно, мокрый снег, панельные дома.
- **Запрещено:** текст, цифры, логотипы и бренды на картинках, лица реальных людей.

## Палитра

| Токен | Цвет | Для чего |
|---|---|---|
| Ночной синий | `#16223a` | тени, фон |
| Лампа | `#e0a046` | тёплый свет, акцент интерфейса |
| Монитор | `#4fb3b0` | холодный свет, экраны |
| Бумага | `#d9cfb8` | документы |
| Тревога | `#c4382c` | только угрозы |

## Якорь стиля (в конец каждого промпта)

```
Style: cinematic digital painting with soft visible brushwork, painterly and slightly stylized, NOT photorealistic, not a photo, not a 3D render. Late-November office mood. Key light: warm amber desk lamp from the left. Fill light: cold teal monitor glow from the right. Deep navy shadows, never pure black. Subtle film grain, muted colors. Plain, slightly worn 2020s Russian corporate office.

No text, no letters, no numbers, no logos, no brand names, no watermarks. All screens and papers are blank.
```

## Утверждённые ассеты

| id | Файл | Статус |
|---|---|---|
| bg-desk-evening | `art-src/bg/bg-desk-evening.png` | эталон |
| bg-desk-evening-portrait | `art-src/bg/bg-desk-evening-portrait.png` | эталон для телефона |
| obj-phone | `art-src/obj/obj-phone.png` | для интерфейса и окна звонка |
| p-kuznetsova | `art-src/portraits/p-kuznetsova.png` | базовый портрет |
| p-zaytseva | `art-src/portraits/p-zaytseva.png` | базовый портрет |
| p-orlova | `art-src/portraits/p-orlova.png` | базовый портрет, волосы перекрашены |
| p-ivanov | `art-src/portraits/p-ivanov.png` | базовый портрет |
| p-kozlov | `art-src/portraits/p-kozlov.png` | базовый портрет, волосы перекрашены |
| p-caller-unknown-m | `art-src/portraits/p-caller-unknown-m.png` | силуэт без лица, мужской |
| p-boss | `art-src/portraits/p-boss.png` | базовый портрет |
| p-caller-unknown-f | `art-src/portraits/p-caller-unknown-f.png` | силуэт без лица, женский |
| p-colleague | `art-src/portraits/p-colleague.png` | базовый портрет, волосы перекрашены в рыжий |
| p-kuznetsova-worried, p-kuznetsova-firm | `art-src/portraits/` | эмоции Кузнецовой |
| p-zaytseva-guilty | `art-src/portraits/` | эмоция Зайцевой |
| obj-stamp-allow | `art-src/obj/obj-stamp-allow.png` | штамп «Пропустить», зелёный |
| obj-stamp-block | `art-src/obj/obj-stamp-block.png` | штамп «Блокировать», красный |
| obj-stamp-escalate | `art-src/obj/obj-stamp-escalate.png` | штамп «Эскалировать», янтарный, фон и цвет доработаны |

## Какие предметы генерировать отдельно

Телефон, папка, кружка и лоток со штампами уже нарисованы в самом столе. Отдельный спрайт нужен
только тому, что двигается само по себе или появляется поверх сцены:

- `obj-stamp-allow`, `obj-stamp-block`, `obj-stamp-escalate` — по одному штампу: для анимации «штамп опускается на документ»
- `obj-lamp` — красная лампа критического алерта, выключенная и включённая (её на столе нет)
- `obj-phone` — уже есть, для интерфейса

`obj-phone-handset`, `obj-binder`, `obj-mug` из первого списка больше не нужны.

## Портреты: как не уйти в фотореализм

К запросу прикладываются **две** картинки, и роли называются прямо: «Image 1 is the character, image 2 is the art style».
Первая — портрет персонажа (внешность), вторая — эталонный стол (стиль).
Каждому персонажу нужен свой силуэт: цвет волос, причёска, одежда, возраст. ChatGPT тяготеет к одному типажу,
поэтому отличительные черты прописываются явно.
Если персонаж всё же вышел похожим, волосы можно перекрасить (в чёрный или в любой цвет): `scripts/recolor-hair.py` с маской-полигоном
(примеры — `art-src/probes/*.mask.json`). Если приложить только портрет,
ChatGPT копирует и его манеру. Рабочий промпт — в `art-src/portraits/p-kuznetsova.md`.

## Если ChatGPT нарисовал шахматку вместо прозрачного фона

Бывает, что «прозрачность» нарисована прямо в картинке серо-белыми клетками. Проверить просто: открыть PNG
в любом редакторе на тёмном фоне. Исправить — `scripts/remove-fake-checker.py` (нужен Python с numpy, pillow, scipy).

## Эмоции персонажей

Эмоция делается правкой уже утверждённого портрета. К запросу прикладываются две картинки: **первой** — портрет
персонажа из `art-src/portraits/`, **второй** — эталонный стол. Лицо, одежда, кадр и свет должны остаться прежними,
меняется только выражение лица, иначе в игре портрет будет «прыгать» при смене эмоции.
Файл называется `<id персонажа>-<эмоция>.png`, например `p-kuznetsova-worried.png`.

Общий хвост для всех эмоций (уже вставлен в промпты ниже):

```
Keep exactly the same person, face, hair, clothes, framing, lighting and plain dark navy background as in image 1. Change only the facial expression and, if needed, the hands. Vertical 2:3. Painted, NOT photorealistic.
```

### p-kuznetsova-worried

Кузнецова встревожена: звонок после взлома почты «Логистик Плюс».

```
Image 1 is the character, image 2 is the art style. The same woman as in image 1 (chief accountant, shoulder-length wavy light-brown hair, glasses on a chain, beige cardigan over a white blouse), now worried and tense: eyebrows drawn together, eyes wide and alert, lips pressed tight, holding a phone to her ear. Keep exactly the same person, face, hair, clothes, framing, lighting and plain dark navy background as in image 1. Change only the facial expression and, if needed, the hands. Vertical 2:3. Painted, NOT photorealistic.

Style: cinematic digital painting with soft visible brushwork, painterly and slightly stylized, NOT photorealistic, not a photo, not a 3D render. Late-November office mood. Key light: warm amber desk lamp from the left. Fill light: cold teal monitor glow from the right. Deep navy shadows, never pure black. Subtle film grain, muted colors. Plain, slightly worn 2020s Russian corporate office.

No text, no letters, no numbers, no logos, no brand names, no watermarks. All screens and papers are blank.
```

### p-kuznetsova-firm

Кузнецова твёрдо и вежливо отказывает: «Архивы с паролем мы не присылаем».

```
Image 1 is the character, image 2 is the art style. The same woman as in image 1 (chief accountant, shoulder-length wavy light-brown hair, glasses on a chain, beige cardigan over a white blouse), now firm and businesslike, politely refusing: straight steady gaze at the viewer, a slight frown, chin slightly raised, no smile, sitting upright, hand away from her face. Keep exactly the same person, face, hair, clothes, framing, lighting and plain dark navy background as in image 1. Change only the facial expression and, if needed, the hands. Vertical 2:3. Painted, NOT photorealistic.

Style: cinematic digital painting with soft visible brushwork, painterly and slightly stylized, NOT photorealistic, not a photo, not a 3D render. Late-November office mood. Key light: warm amber desk lamp from the left. Fill light: cold teal monitor glow from the right. Deep navy shadows, never pure black. Subtle film grain, muted colors. Plain, slightly worn 2020s Russian corporate office.

No text, no letters, no numbers, no logos, no brand names, no watermarks. All screens and papers are blank.
```

### p-zaytseva-guilty

Зайцева растеряна и виновата: «открывала исправленный акт… подумала, что файл битый».

```
Image 1 is the character, image 2 is the art style. The same young accountant as in image 1 (brown hair in a low ponytail, simple grey blouse, a lanyard with a blank badge), now embarrassed and guilty: eyes looking down and away, eyebrows raised in the middle, biting her lower lip, one hand rubbing the back of her neck. Keep exactly the same person, face, hair, clothes, framing, lighting and plain dark navy background as in image 1. Change only the facial expression and, if needed, the hands. Vertical 2:3. Painted, NOT photorealistic.

Style: cinematic digital painting with soft visible brushwork, painterly and slightly stylized, NOT photorealistic, not a photo, not a 3D render. Late-November office mood. Key light: warm amber desk lamp from the left. Fill light: cold teal monitor glow from the right. Deep navy shadows, never pure black. Subtle film grain, muted colors. Plain, slightly worn 2020s Russian corporate office.

No text, no letters, no numbers, no logos, no brand names, no watermarks. All screens and papers are blank.
```

Если ChatGPT всё же поменял лицо или кадр, допиши правкой: «Do not change her face or the framing, only the expression».
