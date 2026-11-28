# Кинематографические материалы сезона «Изумруд и гром»

В игре используются утверждённые оригиналы Павла и Мишани. Для постановочных кадров передайте в Kling вместе с промтом оригиналы `media/cards/pavel.png` и `media/cards/mishanya.png` и соответствующий фон сезона. Если сервис требует референс без рамки и текста, подготовьте точный кроп области персонажа из оригинала, сохраняя исходные пропорции.

## Павел в королевском зале · 7 секунд

Референсы: зелёный оригинал Павла, `media/season/throne.webp`.

> An unbroken seven-second 16:9 photoreal dark-fantasy cinema shot. Match the reference character identity exactly, including face, hair, clothing, crown, shoulder silhouette, handedness and build. Place Pavel in a vast carved obsidian throne room in the reference's dark emerald heraldry. Start at medium distance, slowly dolly forward toward the dais at eye level. The camera travels through two sparse banks of low emerald haze. Natural filamentary green flame in iron braziers bends in the disturbed air. Soft green reflections stretch across polished black stone. His eyes and facial expression remain natural; restrained emerald rim light defines the silhouette. Motion is physically plausible, no dramatic gesture or mouth movement. Black, charcoal, cold silver and saturated emerald only on this side. No warm gold heraldry, no speech, no titles, no visible card graphics, no weapon motion, no digital-looking particles or lens flare.

## Мишаня в грозовом зале · 7 секунд

Референсы: утверждённый оригинал Мишани, правая половина `media/season/versus.webp`.

> An unbroken seven-second 16:9 photoreal dark-fantasy cinema shot. Preserve the reference character's likeness, hat, costume, facial proportions, pose and materials. Begin just behind a graphite column and track at walking pace into a wet stone gothic terrace. Stacked storm clouds give realistic parallax. One slender multi-branched yellow lightning event, then a softer distant discharge, expose the architecture and reflect in the stone puddles. Let the flashes be brief and local, with no sustained whiteout. Warm yellow electrical accents across graphite and charcoal. Wind lightly stirs the coat and hangs in gray drifting rain haze. A stable cinematic camera and natural shutter. No speech or mouth movement, no captions, no character morphs, no strobe, no cartoon zigzags, no red or violet spell accents.

## Столкновение двух капитанов · 10 секунд

Референсы: оба утверждённых персонажа, `media/season/versus.webp`.

> A ten-second photoreal dark-fantasy confrontation in a wet, open gothic cathedral. Lock Pavel to screen left and Mishanya to screen right for the entire shot. Preserve each reference likeness, clothing and body proportions. Maintain clear spatial separation, natural camera height and a steady forward motion. Emerald fire and smoke move from the dark royal side while fine yellow electrical forks emerge from graphite clouds. The two powers briefly meet over the black center aisle and light the walls and invisible moisture. One controlled peak around second seven followed by rapid diffusion. End on a steady, legible wide frame suitable for a poster transition. Both characters remain distinct and readable. No identity swaps, face retouching, costumes changes, duplicated limbs, text, mouth movements, sustained overexposure or repeated full-screen flashes.

## Техническая поставка

- Мастер в 1920 × 1080 или выше, 16:9 и с запасом по краям для вертикального просмотра. Сохранить оригинальный мастер и отдельно подготовить MP4 H.264 с AAC, `yuv420p` и `faststart`.
- Сдавать исходную стабильную частоту кадров 24 или 30 FPS. Версия 60 FPS допустима после покадровой проверки лиц, молний и краёв одежды. Длительность монтажа около 24 секунд.
- Локальные звуки без озвучки. При студийной записи подготовить отдельные дорожки реверберации зала и огня Павла, близкого разряда и дальнего грома Мишани. Мастеры WAV PCM 48 кГц.
- После утверждения добавить один итоговый MP4 через Git LFS и указать его путь в поле `movie` файла `code/js/season.js`. Проверить начало и конец воспроизведения, сворачивание вкладки, обработку ошибок, переход к составам, оба сетевых клиента и запуск на реальном iPhone.
- Для анимационных дополнений подойдут отдельные пластины изумрудного пламени и жёлтой молнии на чёрном, с мягким спадом к краям и исходной частотой 60 FPS. Избегать генерации новых лиц. Текущие игровые слои используют небольшие статические пластины с движением освещения и прозрачного тумана.
