# obj-stamp-escalate

- Штамп «Эскалировать», янтарный. Для анимации «штамп опускается на документ».
- Статус: утверждён 09.11.2026
- Инструмент: ChatGPT. Первым сделан зелёный по эталонному столу, красный и янтарный — по зелёному.
- Формат: 2:3, 1024×1536, прозрачный фон
- Доработка: ChatGPT нарисовал «шахматку прозрачности» прямо в картинке, а не прозрачный фон, и цвет вышел ярче остальных.
  Исправлено: `python3 scripts/remove-fake-checker.py art-src/probes/obj-stamp-escalate-checker.png art-src/obj/obj-stamp-escalate.png --sat 0.8 --val 0.86`

## Промпт (приложен obj-stamp-allow.png)

Exactly the same rubber stamp as in the attached image: same shape, size, wooden handle, angle, lighting and painting style. Only change the color of the base to amber. Blank rubber face. Fully transparent background, PNG, no glow, no shadow. Vertical 2:3. No text.
