// A short confetti burst on a temporary full-screen canvas. The canvas removes
// itself once every piece has fallen out of view or faded.

const COLORS = ['#c29547', '#30594b', '#e3d892', '#e07a5f', '#81b29a', '#f2cc8f', '#6c9bd2', '#fffdf5'];

export function confetti({ x = innerWidth / 2, y = innerHeight / 3, count = 140, power = 1 } = {}) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const canvas = document.createElement('canvas');
  canvas.className = 'confetti';
  canvas.setAttribute('aria-hidden', 'true');
  const ratio = Math.min(devicePixelRatio || 1, 2);
  canvas.width = innerWidth * ratio;
  canvas.height = innerHeight * ratio;
  document.body.append(canvas);
  const ctx = canvas.getContext('2d');
  ctx.scale(ratio, ratio);

  const pieces = Array.from({ length: count }, () => {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.9;
    const speed = (6 + Math.random() * 9) * power;
    return {
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 5 + Math.random() * 6,
      spin: Math.random() * Math.PI,
      spinSpeed: (Math.random() - 0.5) * 0.35,
      wobble: Math.random() * 10,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      round: Math.random() < 0.3,
      life: 0
    };
  });

  let last = performance.now();
  function frame(now) {
    const dt = Math.min((now - last) / 16.7, 3);
    last = now;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    let alive = 0;
    for (const p of pieces) {
      p.life += dt;
      p.vx *= 0.985 ** dt;
      p.vy = p.vy * 0.985 ** dt + 0.32 * dt;
      p.x += (p.vx + Math.sin(p.life / 8 + p.wobble)) * dt;
      p.y += p.vy * dt;
      p.spin += p.spinSpeed * dt;
      const fade = Math.max(0, 1 - p.life / 170);
      if (p.y > innerHeight + 20 || fade === 0) continue;
      alive++;
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.spin);
      ctx.fillStyle = p.color;
      if (p.round) {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2.4, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Squashing the width fakes a ribbon turning in 3D.
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size * Math.cos(p.life / 6 + p.wobble), p.size / 2);
      }
      ctx.restore();
    }
    if (alive) requestAnimationFrame(frame);
    else canvas.remove();
  }
  requestAnimationFrame(frame);
}

// Launch from the center of an element, such as the board or a badge.
export function confettiFrom(element, options = {}) {
  const box = element.getBoundingClientRect();
  confetti({ x: box.left + box.width / 2, y: box.top + box.height / 2, ...options });
}
