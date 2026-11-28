(() => {
  'use strict';

  const season = {
    "id": "emerald-thunder",
    "name": "Изумруд и гром",
    "movie": null,
    "art": {
      "hall": "media/season/throne.webp",
      "cathedral": "media/season/cathedral.webp",
      "versus": "media/season/versus.webp"
    },
    "captains": [
      {
        "id": "pavel",
        "name": "Павел, король грязнулек",
        "shortName": "Павел",
        "teamName": "Павла",
        "styleName": "Изумрудная корона",
        "portrait": "media/cards/pavel.png",
        "theme": {"dark":"#071812","middle":"#237750","light":"#b8ffcf","rgb":"62,209,136"},
        "coin": {"side":"tails","label":"Корона","image":"media/season/coin-crown.webp"},
        "effects": {"aura":"media/season/emerald-flame.webp","mist":"media/season/emerald-mist.webp","sound":"media/season/emerald.wav"}
      },
      {
        "id": "mishanya",
        "name": "Мишаня",
        "shortName": "Мишаня",
        "teamName": "Мишани",
        "styleName": "Жёлтая гроза",
        "portrait": "media/cards/mishanya.png",
        "theme": {"dark":"#201b09","middle":"#9d7d16","light":"#fff1a1","rgb":"248,206,66"},
        "coin": {"side":"heads","label":"Молния","image":"media/season/coin-lightning.webp"},
        "effects": {"aura":"media/season/lightning.webp","mist":"media/season/storm-mist.webp","sound":"media/season/thunder.wav"}
      }
    ]
  };

  window.BobrsSeason = season;

  const root = document.documentElement;
  season.captains.forEach(({ theme, effects }, side) => {
    for (const [name, value] of Object.entries(theme)) {
      root.style.setProperty(`--team-${side}-${name}`, value);
    }
    for (const name of ['aura', 'mist']) {
      root.style.setProperty(`--team-${side}-${name}`, `url("${new URL(effects[name], document.baseURI).href}")`);
    }
  });

  for (const [name, path] of Object.entries(season.art)) {
    root.style.setProperty(`--season-${name}`, `url("${new URL(path, document.baseURI).href}")`);
  }
})();
