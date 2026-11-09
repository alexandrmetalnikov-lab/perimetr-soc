# p-colleague

- Персонаж: коллега со второй линии SOC. Принимает эскалации, иронизирует, поддерживает.
- Статус: утверждён 09.11.2026, базовый портрет (уставшая ироничная полуулыбка)
- Инструмент: ChatGPT, к запросу приложен `art-src/bg/bg-desk-evening.png` как образец стиля
- Доработка: лицо снова вышло как у Иванова, поэтому волосы и брови перекрашены в рыжий:
  `python3 scripts/recolor-hair.py art-src/probes/p-colleague.mask.json`, оригинал — `art-src/probes/p-colleague-brown.png`.
- Формат: 2:3, 1024×1536
- Узнаваемые детали: рыжие волосы, наушники на шее, кружка, клетчатая рубашка

## Промпт

A SOC second-line analyst in his early thirties: headset around the neck, plaid shirt, a mug in hand, tired but ironic half-smile. Bust portrait, vertical 2:3, head and shoulders, plain dark navy background with no objects. Painted like a character portrait in a narrative video game, consistent design suitable for reuse in other emotions.

Style: cinematic digital painting with soft visible brushwork, painterly and slightly stylized, NOT photorealistic, not a photo, not a 3D render. Late-November office mood. Key light: warm amber desk lamp from the left. Fill light: cold teal monitor glow from the right. Deep navy shadows, never pure black. Subtle film grain, muted colors. Plain, slightly worn 2020s Russian corporate office.

No text, no letters, no numbers, no logos, no brand names, no watermarks. All screens and papers are blank.

Для новых эмоций прикладывать перекрашенный `p-colleague.png` и добавлять «copper-red ginger hair».
