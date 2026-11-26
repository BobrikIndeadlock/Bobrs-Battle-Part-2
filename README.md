# Bobrs Battle Part 2 · Gothic Final

Финальная версия `v2.0-gothic-final`.

## Локальный запуск

1. Войдите в GitHub под аккаунтом с доступом к репозиторию и скачайте [финальный ZIP](https://github.com/BobrikIndeadlock/Bobrs-Battle-Part-2/raw/gothic-visual-upgrade-downloads/Bobrs-Battle-Part-2-Gothic-Final.zip).
2. Распакуйте архив целиком. Оставьте каталоги `code/` и `media/` рядом с `index.html`.
3. На компьютере откройте `index.html` в браузере. На iPhone распакуйте ZIP в приложении «Файлы», затем откройте `index.html` из полученной папки через HTML Web Preview. Если приложение запросит доступ к локальным файлам, выберите всю распакованную папку.

Распакованная игра запускается по `file://` без интернета, сервера и сборки. Видео и остальные ресурсы уже входят в ZIP.

### Запуск из Git

Для рабочей копии укажите тег релиза и загрузите финальный ролик через Git LFS.
Инструкции по установке доступны на [Git LFS](https://git-lfs.com/).

```sh
git lfs install
git clone --branch v2.0-gothic-final https://github.com/BobrikIndeadlock/Bobrs-Battle-Part-2.git
cd Bobrs-Battle-Part-2
git lfs pull
```

После загрузки откройте `index.html` в браузере.

- `code/js/` и `code/css/` содержат код и стили игры, включая анимации.
- `media/images/` и `media/video/` содержат изображения и ролик из исходной версии.
- `media/deadlock/portraits.js` содержит исходные миниатюры из [Deadlock Wiki](https://deadlock.wiki/Heroes)
  в формате data URL для локальных анимаций героев и экспорта составов в PNG.
