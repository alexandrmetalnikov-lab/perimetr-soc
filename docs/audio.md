# Звук: список и промпты

Игра сама подхватывает файл, как только он появится. Пока файла нет, звучит синтезированная заглушка или тишина,
поэтому звуки можно добавлять по одному.

## Как добавить звук

1. Сгенерировать звук (рекомендую ElevenLabs → Sound Effects: до 30 с, есть режим Loop для фона).
   Подойдёт и другая нейросеть, например Stable Audio.
2. Сохранить как `art-src/audio/<id>.mp3` (или `.wav`) — имя строго из таблицы.
3. Прислать мне или запустить `npm run assets`: скрипт выровняет громкость, обрежет тишину по краям
   и положит `public/assets/audio/<id>.mp3`. Громкость каждого звука в игре — таблица `VOL` в `src/lib/audio.ts`.

Советы:
- Делать 3–4 варианта и выбирать лучший; на коротких звуках ставить длительность явно.
- Prompt influence — повыше (0.5–0.7), чтобы не добавлялась лишняя музыка и голоса.
- Без голосов, речи и музыки, если она не просится по смыслу (заставки).
- Фон `amb-night` — с включённым Loop, иначе на стыке будет щелчок.

## Список

| id | Где звучит | Длит. |
|---|---|---|
| sfx-stamp-1, -2, -3 | удар штампа по документу (три варианта, игра чередует) | 0.5 с |
| sfx-paper-in | новый документ ложится на стол | 0.8 с |
| sfx-paper-out | документ убирают со стола после решения | 0.8 с |
| sfx-binder | открыть справочник | 1 с |
| sfx-keys | кнопки «Изучить»: аналитик что-то проверяет | 0.8 с |
| sfx-click | прочие кнопки интерфейса | 0.15 с |
| sfx-ring | входящий звонок: одна трель, игра повторяет каждые 3 с | 2 с |
| sfx-pickup | снять трубку на входящем | 0.7 с |
| sfx-dial | исходящий звонок для проверки по второму каналу | 2.5 с |
| sfx-alarm | красная лампа: на столе критичный алерт | 1.2 с |
| sfx-warn | предупреждение за ошибку | 0.6 с |
| sfx-sign | вечером подтвердить покупки бюджета | 1 с |
| amb-night | фон смены, по кругу | 30 с, Loop |
| sting-morning | утренний бюллетень | 3–4 с |
| sting-evening | вечерний отчёт | 3–4 с |
| sting-final | финал кампании | 5–6 с |

## Промпты

### sfx-stamp-1, sfx-stamp-2, sfx-stamp-3
```
A single rubber office stamp pressed firmly onto a sheet of paper lying on a wooden desk. One short dull thud with a tiny paper crackle, close-up, dry room, no echo, no other sounds.
```
Сгенерировать три раза или менять конец: «slightly lighter press», «heavier, more decisive press».

### sfx-paper-in
```
A single sheet of paper slid across a wooden desk and coming to rest, soft paper swish, close-up, quiet office, no other sounds.
```

### sfx-paper-out
```
A sheet of paper quickly picked up from a wooden desk and tossed onto a stack of papers, short swish and soft landing, close-up, no other sounds.
```

### sfx-binder
```
A thick office ring binder opened on a desk, cover flipped open with a soft thump, followed by two pages being turned, close-up, no other sounds.
```

### sfx-keys
```
Short burst of fast typing on an office keyboard followed by one click of a computer mouse, close-up, quiet room, no other sounds.
```

### sfx-click
```
A single soft click of an office mouse button, very short and dry, no other sounds.
```

### sfx-ring
```
One ring burst of an old beige office desk telephone from the 2000s, electronic warble ring, heard in a quiet office at night, no voices, ends in silence.
```

### sfx-pickup
```
A desk telephone handset lifted off its plastic cradle, cradle switch click and a short handling rustle, close-up, no voices, no dial tone.
```

### sfx-dial
```
Picking up an office desk phone handset and quickly dialing a number on a push-button keypad, seven short key beeps, then a single ringback tone in the earpiece, no voices.
```

### sfx-alarm
```
A muted two-tone electronic alert from a red warning beacon in a security operations center, three short pulses, heard from across a quiet office, not loud, no voices.
```

### sfx-warn
```
A short low electronic error buzz from a computer, two quick soft pulses, subtle and not harsh, no other sounds.
```

### sfx-sign
```
A pen signing a paper document on a desk with a quick scribble, followed by a soft rubber stamp press, close-up, no other sounds.
```

### amb-night (Loop включить)
```
Quiet room tone of a small office server room at night: low steady hum of computers and air conditioning, faint fan noise, soft wind and snow against a window, very occasional distant city traffic. Calm and even, no voices, no music, no sudden sounds. Seamless loop.
```

### sting-morning
```
Short calm musical sting for the start of a work shift in a game: soft warm electric piano chord with a gentle analog synth pad, slightly hopeful, quiet and minimal, ends with a short fade. No drums, no vocals.
```

### sting-evening
```
Short reflective musical sting for the end of a night shift in a game: low muted synth pad and two soft piano notes, tired but calm mood, quiet and minimal, ends with a short fade. No drums, no vocals.
```

### sting-final
```
Short ending theme for a cyber security game: slow dark ambient synth pad building for a few seconds, a soft pulsing bass note and a single resolving piano chord at the end, tense then relieved. No drums, no vocals.
```
