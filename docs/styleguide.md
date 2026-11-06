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

## Какие предметы генерировать отдельно

Телефон, папка, кружка и лоток со штампами уже нарисованы в самом столе. Отдельный спрайт нужен
только тому, что двигается само по себе или появляется поверх сцены:

- `obj-stamp-allow`, `obj-stamp-block`, `obj-stamp-escalate` — по одному штампу: для анимации «штамп опускается на документ»
- `obj-lamp` — красная лампа критического алерта, выключенная и включённая (её на столе нет)
- `obj-phone` — уже есть, для интерфейса

`obj-phone-handset`, `obj-binder`, `obj-mug` из первого списка больше не нужны.
