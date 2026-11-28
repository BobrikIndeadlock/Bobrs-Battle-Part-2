(() => {
  const { captains, art, name } = window.BobrsSeason;
  for (const [side, captain] of captains.entries()) {
    for (const id of ['portrait', 'introCaptain', 'vsCaptain', 'movieCaptain']) {
      const image = document.getElementById(id + side);
      image.src = captain.portrait;
      image.alt = 'Капитан · ' + captain.name;
    }
    document.getElementById('vsName' + side).textContent = captain.name;
    document.getElementById('vsStyle' + side).textContent = captain.styleName;
  }
  document.getElementById('intro-inside').src = art.hall;
  document.getElementById('movieSeasonName').textContent = name;
})();
