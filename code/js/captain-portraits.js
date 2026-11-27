(() => {
  const portraits = [
    { file: 'media/cards/makarych.png', corners: [[81, 151], [357, 172], [360, 600], [80, 604]] },
    { file: 'media/cards/artemon.png', corners: [[1182, 178], [1457, 153], [1455, 604], [1178, 604]] },
  ];
  portraits.forEach(({ file }, index) => {
    document.getElementById('portrait' + index).src = file;
  });

  // Use the approved corners on the 1536×864 painting, projected at actual layout size.
  function project(image, corners, scaleX, scaleY) {
    const [[ax, ay], [bx, by], [cx, cy], [dx, dy]] = corners.map(([x, y]) => [x * scaleX, y * scaleY]);
    const width = bx - ax;
    const height = dy - ay;
    const ux = bx - cx, uy = by - cy;
    const vx = dx - cx, vy = dy - cy;
    const x = ax - bx + cx - dx, y = ay - by + cy - dy;
    const determinant = ux * vy - vx * uy;
    const horizontal = (x * vy - vx * y) / determinant;
    const vertical = (ux * y - x * uy) / determinant;

    image.style.width = `${width}px`;
    image.style.height = `${height}px`;
    image.style.transform = `matrix3d(${[
      (bx - ax + horizontal * bx) / width, (by - ay + horizontal * by) / width, 0, horizontal / width,
      (dx - ax + vertical * dx) / height, (dy - ay + vertical * dy) / height, 0, vertical / height,
      0, 0, 1, 0,
      ax, ay, 0, 1,
    ].join(',')})`;
  }

  const desktop = matchMedia('(min-width: 1024px) and (min-height: 700px)');
  const scene = document.getElementById('scene');
  const overlay = document.createElement('div');
  overlay.className = 'throne-captain-art';
  overlay.setAttribute('aria-hidden', 'true');

  const observer = new ResizeObserver(([{ contentRect }]) => {
    if (!contentRect.width || !contentRect.height) return;
    portraits.forEach(({ corners }, index) => {
      project(overlay.children[index], corners, contentRect.width / 1536, contentRect.height / 864);
    });
  });

  function update() {
    if (!desktop.matches) {
      observer.disconnect();
      overlay.remove();
      return;
    }
    if (!overlay.childElementCount) {
      for (const { file } of portraits) {
        const image = new Image();
        image.alt = '';
        image.decoding = 'async';
        image.src = file;
        overlay.append(image);
      }
    }
    scene.prepend(overlay);
    observer.observe(scene);
  }

  desktop.addEventListener('change', update);
  update();
})();
