# Bobbers Battle Part 3

Стабильная версия `v2.1-new-cards` включает 12 утверждённых карточек и обновлённое расписание первого драфта. [История изменений](CHANGELOG.md)

## Павел и Мишаня

Павел, король грязнулек, ведёт сторону нежити. Мишаня ведёт грозовую. Первый драфт, сцены Кроноса и 18 ходов Deadlock по-прежнему проходят в одной игре.

- Локально распакуйте сборку и откройте `index.html` в браузере. На iPhone распакуйте папку целиком и откройте `index.html` через приложение с HTML Web Preview, которое даёт документу доступ к соседним папкам `code` и `media`.
- Для сетевой игры соберите сайт командой `python3 online-deadlock/build.py _site` и разместите содержимое на общем HTTPS-адресе. Для проверки на одном компьютере достаточно `python3 -m http.server 8792 --directory _site`. Создайте комнату на экране тронного зала и отправьте ссылку Мишане. Ведущий остаётся в комнате во время переподключения.
- До готовности нового ролика конец первого этапа показывает сезонный постер, за ним идут составы и Deadlock. [Визуальный аудит и промты](docs/part-3-visual-audit.md).

## Локальный запуск v2.1

1. Скачайте архив предыдущего сезона. [Скачать Bobrs-Battle-Part-2-v2.1-Final.zip](https://github.com/BobrikIndeadlock/Bobrs-Battle-Part-2/raw/gothic-visual-upgrade-downloads/Bobrs-Battle-Part-2-v2.1-Final.zip)
2. Распакуйте архив целиком. Оставьте каталоги `code/` и `media/` рядом с `index.html`.
3. На компьютере откройте `index.html` в браузере. На iPhone распакуйте ZIP в приложении «Файлы», затем откройте `index.html` из полученной папки через HTML Web Preview. Если приложение запросит доступ к локальным файлам, выберите всю распакованную папку.

Распакованная игра запускается по `file://` без интернета, сервера и сборки. Видео и остальные ресурсы уже входят в ZIP.

### Запуск из Git

Для рабочей копии укажите тег релиза и загрузите финальный ролик через Git LFS.
Инструкции по установке доступны на [Git LFS](https://git-lfs.com/).

```sh
git lfs install
git clone --branch v2.1-new-cards https://github.com/BobrikIndeadlock/Bobrs-Battle-Part-2.git
cd Bobrs-Battle-Part-2
git lfs pull
```

После загрузки откройте `index.html` в браузере.

- `code/js/` и `code/css/` содержат код и стили игры, включая анимации.
- `media/images/` и `media/video/` содержат изображения и ролик из исходной версии.
- `media/deadlock/portraits.js` содержит исходные миниатюры из [Deadlock Wiki](https://deadlock.wiki/Heroes)
  в формате data URL для локальных анимаций героев и экспорта составов в PNG.

## Предыдущая стабильная версия

Ветка `backup/pre-emerald-thunder` сохраняет версию до начала сезона на коммите `587baeecb04a505b7bc374797fe976f05e20dd6e`.

Тег `v2.0-gothic-final` и резервная ветка `backup/v2.0-gothic-final` указывают на коммит `d64a9f65091cecd1758d7b04848c06095ce5c6a2`. [Скачать архив v2.0](https://github.com/BobrikIndeadlock/Bobrs-Battle-Part-2/raw/gothic-visual-upgrade-downloads/Bobrs-Battle-Part-2-Gothic-Final.zip)
