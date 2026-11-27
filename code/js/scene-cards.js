(() => {
  // Corners of the existing card faces on the original scene paintings, clockwise from top left.
  const throne = [
    ['portrait0', [[81, 151], [357, 172], [360, 600], [80, 604]]],
    ['portrait1', [[1182, 178], [1457, 153], [1455, 604], [1178, 604]]],
    ['winnerPortrait', [[729, 142], [806, 142], [807, 261], [728, 261]]],
  ];
  const legend = [
    ['hall92Card', [[575, 239], [732, 239], [732, 473], [573, 473]]],
  ];

  function project(corners, width, height) {
    const [[ax, ay], [bx, by], [cx, cy], [dx, dy]] = corners;
    const ux = bx - cx, uy = by - cy;
    const vx = dx - cx, vy = dy - cy;
    const x = ax - bx + cx - dx, y = ay - by + cy - dy;
    const determinant = ux * vy - vx * uy;
    const horizontal = (x * vy - vx * y) / determinant;
    const vertical = (ux * y - x * uy) / determinant;
    return `matrix3d(${[
      (bx - ax + horizontal * bx) / width, (by - ay + horizontal * by) / width, 0, horizontal / width,
      (dx - ax + vertical * dx) / height, (dy - ay + vertical * dy) / height, 0, vertical / height,
      0, 0, 1, 0,
      ax, ay, 0, 1,
    ].join(',')})`;
  }

  const planes = new WeakMap();
  function size(host, width, height) {
    const { plane, artWidth, artHeight } = planes.get(host);
    plane.style.transform = `scale(${width / artWidth},${height / artHeight})`;
  }
  const observer = new ResizeObserver(entries => {
    for (const { target, contentRect } of entries) size(target, contentRect.width, contentRect.height);
  });

  function mount(host, artWidth, artHeight, faces) {
    const overlay = document.createElement('div');
    overlay.className = 'scene-card-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    const plane = document.createElement('div');
    plane.className = 'scene-card-plane';
    overlay.append(plane);
    for (const [sourceId, corners] of faces) {
      const image = new Image();
      image.src = document.getElementById(sourceId).src;
      image.alt = '';
      image.decoding = 'async';
      const width = corners[1][0] - corners[0][0];
      const height = corners[3][1] - corners[0][1];
      image.width = width;
      image.height = height;
      image.style.transform = project(corners, width, height);
      plane.append(image);
    }
    host.append(overlay);
    planes.set(host, { plane, artWidth, artHeight });
    size(host, host.clientWidth, host.clientHeight);
    observer.observe(host);
  }

  mount(document.getElementById('scene'), 1536, 864, throne);
  mount(document.getElementById('hall92World'), 1672, 941, legend);
  const interior = document.getElementById('intro-interior');
  if (interior) {
    mount(interior, 1536, 864, throne);
    document.getElementById('intro-stage').addEventListener('intro:complete', () => {
      observer.unobserve(interior);
    }, { once: true });
  }
})();
