# Визуальный аудит Bobbers Battle Part 3

## Утверждённый эталон

Эталон с Макарычем и Артемоном закреплён в `backup/pre-emerald-thunder` на коммите `587baeecb04a505b7bc374797fe976f05e20dd6e`. Призыв загружается из побайтово восстановленных `summoning-ritual.js` и `summoning-ritual.css`. Код подъёма, переворота и сравнения карт, стили и палитра выбора также взяты из этого коммита. Положение заголовка и инструкции поправлено отдельно, чтобы они читались рядом с карточками. Координаты целей анимации от этого не меняются.

Отдельную картинку после подтверждения рисовал `flyToCaptain`: он клонировал лицевую сторону карты в `.season-transfer` и перемещал её поверх сцены. Удалены этот слой, добавленные спрайты `.card-spirits`, сезонные подложки выбора и дрейфующие текстуры огня и молний. Прежние карты, порядок ходов, параметры персонажей, исходные файлы рубашек, сетевой протокол, вход по ссылке и сохранение составов сохранены.

## Сцены и освещение

- Тронный зал построен по композиции эталона. Портреты спроецированы на каменные поверхности. Каменная резьба перекрывает края, а затенение и свет привязаны к плоскостям. Этот же кадр используется за открывающимися воротами. Сохранены гримуар и портрет Грита.
- На стороне Павла — разрушенный оссуарий, кости в каменной резьбе, выцветшие руны, призрачные формы в глубине и мертвенно-серый туман. На стороне Мишани — графитовый камень, жёлтые разряды в окнах и отблески на полу.
- WebGL рассчитывает движение тумана и освещение по зарегистрированной карте отражения и глубины. Яркость меняется при ходе и попадании карты в состав. Прожилки молнии входят в изображение сцены и получают световой импульс. При недоступном WebGL и сокращённом движении остаётся полная статичная сцена.
- Логотип `Bobbers Battle Part 3` нанесён на главный экран, постер, лобби, драфт, экран итогов и PNG-экспорт. Исторические изображения в Зале легенд сохранены.

## Проверено в браузере

- Полные офлайн-прохождения под Chromium на 2560 × 1440 и на 390 × 844 с касаниями. Проверены ворота, Зал легенд, гримуар, десять огоньков 2 × 5, материализация, выбор и перемешивание, оба порядка Грита и Аптеки, обе сцены Кроноса, временная печать, составы 5 / 5, сезонный постер, VS, монета, 18 ходов Deadlock и экспорт PNG 1600 × 900.
- Полный веб-сценарий в двух отдельных процессах Chromium с публичным PeerJS. Проверены переход обоих составов между этапами, очередность, дубли подтверждений, переподключение и одинаковый итог. Четыре теста правил прошли.
- Снимки и видео получены из работающей игры. Две демонстрации записаны в Chromium в 1280 × 720 при 25 FPS на неизменённом игровом времени. Запись включает появление и финальную вспышку всех десяти огоньков, раскрытие пары, подтверждение выбора и возврат к колоде.

Измерения ниже описывают среднюю частоту вызовов `requestAnimationFrame` и 95-й перцентиль интервала между ними. Тестовая машина — Linux, AMD EPYC 9V74, квота двух CPU, Chromium с программным SwiftShader. Мобильный профиль — DPR 3. Программный драйвер выводил диагностику задержек `ReadPixels`. Физический iPhone и аппаратный GPU недоступны.

| Сцена | 2K FPS | 2K p95, мс | Мобильный FPS | Мобильный p95, мс |
| --- | ---: | ---: | ---: | ---: |
| Ворота | 14.5 | 116.7 | 57.5 | 16.8 |
| Открытие и пролёт | 9.2 | 183.3 | 58.6 | 16.8 |
| Тронный зал | 37.5 | 33.4 | 60.0 | 16.8 |
| Призыв гримуара | 16.2 | 116.7 | 55.6 | 33.3 |
| Раскрытие пары | 7.2 | 283.3 | 56.6 | 16.8 |
| Выбор и перемешивание | 8.0 | 450.0 | 56.0 | 16.8 |
| Бросок монеты | 21.0 | 116.6 | 60.0 | 16.7 |
| Драфт Deadlock | 57.6 | 16.8 | 59.2 | 16.7 |
| Анимация бана | 31.3 | 66.6 | 60.0 | 16.7 |

## Материалы для постановочной анимации

Текущие сцены используют иллюстрации и расчётный туман. Для отдельной анимации фигур духов и полностью меняющейся формы разряда ниже описаны два дополнительных ресурса. Исходные кадры для генерации — `media/season/throne.webp` и `media/season/cathedral.webp` после утверждения оформления.

### Пробуждение духов Павла

> 10-second photoreal gothic fantasy VFX shot on a locked 16:9 camera. Use the supplied throne-room frame as a strict pixel-registration reference. Keep every column, skull carving, plaque, player card, book, and candle exactly in place. In the left aisle only, between x=25–41% and y=28–76% of frame, layered dead sage and charcoal incense follows the floor between the ossuary pillars. Two nearly human volumes briefly form deep in the vapor, fragment into thin rising turbulent strands, pass behind the foreground stone and disperse. Soft cold reflection on the existing left plinth and wet paving, with realistic occlusion. Begin and end at quiet density so the segment joins the idle hall. No floating skull imagery, cutout figures, emerald light, camera movement, audio or text.

### Разряд и отражение Мишани

> 5-second photoreal storm VFX plate with a locked camera registered pixel-for-pixel to the supplied cathedral or throne-room frame. Animate a faint stepped leader behind the right lancet window, x=66–77% in the throne room, then a single slender yellow-white branching return stroke at the far end of the hall. Make each new branch develop along its actual path. Light the existing right graphite pillar edges, the engraved channels in the plinth and the broken reflection in wet flagstones. Keep the center, left crypt, player cards and book exposure steady. Fade the reflection naturally with the same event. End on the unlit original plate. No full-screen white flash, repeated strobe, shaking, jumping exposure, overlays, audio or text.

Для каждого ресурса подготовить мастер 1920 × 1080 или выше, 16:9, 24 или 30 FPS. Дополнительно нужны неподвижный исходный кадр, отдельный проход света и маска заслонения колонн. Если фон компонуется в реальном времени, хранить альфа-мастер в ProRes 4444 и подготовить автономную версию под выбранные браузеры. Чистая версия H.264 должна содержать целиком сведённый план. Проверить совпадение первого и последнего кадров и сохранность исходных портретов. Дополнительные движущиеся пластины подключать после визуального утверждения.
