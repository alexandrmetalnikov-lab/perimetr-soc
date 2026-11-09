# p-kozlov

- Персонаж: Дмитрий Козлов, менеджер по продажам
- Где появляется: MFA-бомбинг его УЗ ночью (смена 1), заявка на права администратора 1С (смена 3)
- Статус: утверждён 09.11.2026, базовый портрет (самоуверенная улыбка продавца)
- Инструмент: ChatGPT, к запросу приложен `art-src/bg/bg-desk-evening.png` как образец стиля
- Доработка: ChatGPT нарисовал то же лицо, что у Иванова, с такими же каштановыми волосами.
  Волосы и брови перекрашены в чёрный: `python3 scripts/recolor-hair.py art-src/probes/p-kozlov.mask.json`,
  оригинал — `art-src/probes/p-kozlov-brown.png`.
- Формат: 2:3, 1024×1536

## Как отличать мужчин

- Иванов — каштановые волосы, лёгкая щетина, худи под курткой
- Козлов — тёмные волосы, борода плотнее, пиджак и рубашка без галстука

## Промпт

A sales manager in his mid-thirties: suit without a tie, unbuttoned collar, confident salesman smile, slightly too sure of himself. Bust portrait, vertical 2:3, head and shoulders, plain dark navy background with no objects. Painted like a character portrait in a narrative video game, consistent design suitable for reuse in other emotions.

Style: cinematic digital painting with soft visible brushwork, painterly and slightly stylized, NOT photorealistic, not a photo, not a 3D render. Late-November office mood. Key light: warm amber desk lamp from the left. Fill light: cold teal monitor glow from the right. Deep navy shadows, never pure black. Subtle film grain, muted colors. Plain, slightly worn 2020s Russian corporate office.

No text, no letters, no numbers, no logos, no brand names, no watermarks. All screens and papers are blank.

Для новых эмоций прикладывать перекрашенный `p-kozlov.png` и добавлять «jet-black hair».
