# Bobrs Battle Part 2 · Стабильные сборки

[Скачать v2.1 для iPhone (ZIP, 99,49 МБ)](Bobrs-Battle-Part-2-v2.1-Final.zip)

Распакуйте архив целиком и откройте `index.html`. На iPhone откройте его через HTML Web Preview с доступом к соседним папкам `code/` и `media/`.

Сборка `v2.1-new-cards` создана из коммита `72c3f0e9f3e05c5aaaf2c03217546cdce7fa582b` в `main`. [Заключительный аудит](QA-v2.1-new-cards.md) · [Хеши файлов в ZIP](Final-build-v2.1-files.SHA256) · [SHA-256 архива](SHA256SUMS)

## Рабочая сборка для 2K

Ветка `card-clarity-2k` увеличивает карточки выбора на ПК и показывает капитанов в тронном зале из оригинальных PNG. [ZIP для ПК и iPhone](card-clarity-2k/Bobrs-Battle-Part-2-Card-Clarity-2K.zip) · [Аудит и четыре снимка 2560 × 1440](card-clarity-2k/QA-card-clarity-2k.md)

## Игра с онлайн-режимом Deadlock

Первый драфт и финальный ролик запускаются из полного ZIP. После ролика выберите локальный режим или создайте онлайн-комнату с готовыми составами. [Полный ZIP игры](online-deadlock/Bobrs-Battle-Part-2-Deadlock-Online.zip) · [Размещённый модуль](https://bobrikindeadlock.github.io/Bobrs-Battle-Part-2/) · [Проверка офлайн- и онлайн-режимов](online-deadlock/QA-deadlock-online.md)

## Предыдущая стабильная версия

Сборка `v2.0-gothic-final` создана из коммита `d64a9f65091cecd1758d7b04848c06095ce5c6a2`. [Скачать ZIP v2.0](Bobrs-Battle-Part-2-Gothic-Final.zip) · [Аудит v2.0](QA-v2.0-gothic-final.md) · [Хеши файлов в ZIP v2.0](Final-build-files.SHA256)

## Проверка производительности анимаций

Сборка из ветки `gothic-animation-performance` включает оптимизации загрузки и отрисовки. Для локального запуска распакуйте ZIP целиком и откройте `index.html`.

- [Скачать обновлённый ZIP](animation-performance/Bobrs-Battle-Part-2-Gothic-Final.zip)
- [Углублённый аудит и сравнение до и после](animation-performance/QA-animation-performance.md)
- [Данные замеров](animation-performance/performance.json)

## Утверждение набора из 12 карточек

Сборка из ветки `Bobrs-new-cards`. Распакуйте ZIP в приложении «Файлы» и откройте `index.html` через HTML Web Preview. Все игровые ресурсы уже находятся в архиве.

- [Скачать ZIP для iPhone](bobrs-new-cards/Bobrs-Battle-Part-2-New-Cards-iPhone.zip)
- [Аудит порядка появления Грита и Аптеки](bobrs-new-cards/QA-first-draft-duo-order.md)
- [Проверка краёв раскрытых карточек](https://github.com/BobrikIndeadlock/Bobrs-Battle-Part-2/blob/df9df41b6e2c4a6f82cb013bcb1ad3eaeb2b3cd8/bobrs-new-cards/QA-first-draft-card-edges.md)
- [Первоначальный аудит набора карточек](https://github.com/BobrikIndeadlock/Bobrs-Battle-Part-2/blob/c9deb260a65027078d1bc3796e57062704d02ee2/bobrs-new-cards/QA-bobrs-new-cards.md)

## Предварительная сборка и материалы этапов

- `Bobrs-Battle-Part-2-Gothic-Preview.zip` — игра с исходным видеороликом. Распакуйте архив целиком и откройте `index.html`.
- `Throne-Room-Before-After.zip` — восемь кадров до и после, включая драфт и мобильные размеры.
- `before-desktop-idle.png` и `after-desktop-idle.png` — основной ракурс тронного зала.
- `QA-gothic-visual-upgrade.md` и `performance.json` — изменения, проверки, ограничения и замеры.

## Эффекты капитанов

- [Видеодемонстрация, 24,4 секунды](Bobrs-Battle-Part-2-Captains-Demo.mp4)
- [Результаты game-audit](QA-captains.md)
- [Сырые замеры](captains-performance.json)

## Ритуал десяти огней

- [Финальная видеодемонстрация призыва в 60 FPS](Bobrs-Battle-Part-2-Summoning-60fps.mp4)
- [Проверка плавности и замеры](QA-summoning-smoothness.md)
- [Непрерывная запись с исходной моделью огоньков](Bobrs-Battle-Part-2-Summoning-Original-Orbs.mp4)
- [Аудит исправления и замеры](QA-summoning-original-orbs.md)

## Вход в замок

- [Видеодемонстрация исправленного пролёта камеры](Bobrs-Battle-Part-2-Castle-Camera.mp4)
- [Аудит пролёта и замеры](QA-castle-camera.md)
- [Вступление до исправления камеры](Bobrs-Battle-Part-2-Castle-Entrance.mp4)

## Магический гримуар

- [Пробуждение, призыв и затухание · общий и крупный планы](Bobrs-Battle-Part-2-Grimoire.mp4)
- [Аудит гримуара и замеры](QA-grimoire.md)

## Сцены Хроноса

- [Первая сцена · вмешательство, перемотка и печать](Bobrs-Battle-Part-2-Chronos-Rewind.mp4)
- [Вторая сцена · последняя карточка](Bobrs-Battle-Part-2-Chronos-Last-Card.mp4)
- [Аудит обеих сцен и замеры](QA-chronos.md)

## Интерфейсы обоих драфтов

- [Первый драфт · составы на пьедесталах и откат Хроноса](Bobrs-Battle-Part-2-First-Draft.mp4)
- [Deadlock · монета, пик, бан и финальный экран](Bobrs-Battle-Part-2-Deadlock-Draft.mp4)
- [Аудит обоих интерфейсов и замеры](QA-draft-interfaces.md)
