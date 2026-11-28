(() => {
  'use strict';

  const season = {
    "id": "emerald-thunder",
    "name": "Bobbers Battle Part 3",
    "movie": null,
    "art": {
      "hall": "media/season/throne.webp",
      "cathedral": "media/season/cathedral.webp",
      "versus": "media/season/versus.webp",
      "wordmark": "media/season/part-3-wordmark.webp"
    },
    "captains": [
      {
        "id": "pavel",
        "name": "Павел, король грязнулек",
        "shortName": "Павел",
        "teamName": "Павла",
        "styleName": "Повелитель нежити",
        "portrait": "media/cards/pavel.png",
        "theme": {"dark":"#141914","middle":"#616b52","light":"#d1dac5","rgb":"164,181,147"},
        "coin": {"side":"tails","label":"Корона","image":"media/season/coin-ossuary.webp"},
        "effects": {"sound":"media/season/emerald.wav"}
      },
      {
        "id": "mishanya",
        "name": "Мишаня",
        "shortName": "Мишаня",
        "teamName": "Мишани",
        "styleName": "Повелитель молний",
        "portrait": "media/cards/mishanya.png",
        "theme": {"dark":"#201b09","middle":"#9d7d16","light":"#fff1a1","rgb":"248,206,66"},
        "coin": {"side":"heads","label":"Молния","image":"media/season/coin-lightning.webp"},
        "effects": {"sound":"media/season/thunder.wav"}
      }
    ]
  };

  window.BobrsSeason = season;

  const root = document.documentElement;
  season.captains.forEach(({ theme }, side) => {
    for (const [name, value] of Object.entries(theme)) {
      root.style.setProperty(`--team-${side}-${name}`, value);
    }
  });

  for (const name of ['hall', 'cathedral', 'versus']) {
    const path = season.art[name];
    root.style.setProperty(`--season-${name}`, `url("${new URL(path, document.baseURI).href}")`);
  }
})();
