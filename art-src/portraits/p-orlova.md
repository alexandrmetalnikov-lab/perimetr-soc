# p-orlova

- Персонаж: Мария Орлова, помощник генерального директора
- Где появляется: заявка на выгрузку базы клиентов (смена 2), MFA-бомбинг или звонок в helpdesk от её имени (смена 3)
- Статус: утверждён 06.11.2026, базовый портрет (уверенная, нетерпеливая, с телефоном)
- Инструмент: ChatGPT, к запросу приложен `art-src/bg/bg-desk-evening.png` как образец стиля
- Доработка: ChatGPT сделал её каштановой и слишком похожей на Зайцеву. Волосы перекрашены в чёрный скриптом
  `scripts/recolor-hair.py` по маске `art-src/probes/p-orlova.mask.json` из оригинала `art-src/probes/p-orlova-brown.png`.
- Формат: 2:3, 1024×1536

## Как отличать героинь

- Кузнецова — светлые волнистые волосы, очки на цепочке, кардиган
- Зайцева — каштановый хвост, серая блузка, бейдж
- Орлова — тёмные волосы в пучке, тёмное платье, смартфон у уха

## Промпт

An executive assistant to the CEO, woman around thirty, sleek hair, dark business dress, phone in hand, confident and impatient expression. Bust portrait, vertical 2:3, head and shoulders, plain dark navy background with no objects. Painted like a character portrait in a narrative video game, consistent design suitable for reuse in other emotions.

Style: cinematic digital painting with soft visible brushwork, painterly and slightly stylized, NOT photorealistic, not a photo, not a 3D render. Late-November office mood. Key light: warm amber desk lamp from the left. Fill light: cold teal monitor glow from the right. Deep navy shadows, never pure black. Subtle film grain, muted colors. Plain, slightly worn 2020s Russian corporate office.

No text, no letters, no numbers, no logos, no brand names, no watermarks. All screens and papers are blank.

Для новых эмоций прикладывать уже перекрашенный `p-orlova.png` и добавлять «jet-black hair».
