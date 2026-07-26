/* =============================================================================
   Zeno Premium Background — Canvas particles & slow glowing circles
   ============================================================================= */

window.ZenoBackground = {
  canvas: null,
  ctx: null,
  animationId: null,
  particles: [],
  glowCircles: [],

  init() {
    // Create background canvas container
    const bgContainer = document.createElement('div');
    bgContainer.className = 'zeno-premium-bg';
    bgContainer.style.position = 'fixed';
    bgContainer.style.top = '0';
    bgContainer.style.left = '0';
    bgContainer.style.width = '100vw';
    bgContainer.style.height = '100vh';
    bgContainer.style.zIndex = '0';
    bgContainer.style.pointerEvents = 'none';
    bgContainer.style.overflow = 'hidden';

    const canvas = document.createElement('canvas');
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    bgContainer.appendChild(canvas);
    document.body.prepend(bgContainer);

    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    this.createElements();
    this.animate();
  },

  resizeCanvas() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  },

  createElements() {
    this.particles = [];
    this.glowCircles = [];

    const width = window.innerWidth;
    const height = window.innerHeight;

    // 1. Professional Node Network Particles
    const particleCount = Math.min(70, Math.floor((width * height) / 18000));
    for (let i = 0; i < particleCount; i++) {
      this.particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 1.5 + 1.0,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        alpha: Math.random() * 0.4 + 0.3
      });
    }

    // 2. Very low-count glowing circles (8-10 slow drifting)
    const glowCount = 8;
    const colors = [
      'rgba(99, 102, 241, 0.04)',  // Indigo
      'rgba(6, 182, 212, 0.03)',   // Cyan
      'rgba(139, 92, 246, 0.03)',  // Purple
    ];
    for (let i = 0; i < glowCount; i++) {
      this.glowCircles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 120 + 80,
        vx: (Math.random() - 0.5) * 0.05,
        vy: (Math.random() - 0.5) * 0.05,
        color: colors[i % colors.length]
      });
    }
  },

  animate() {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx;
    const canvas = this.canvas;
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Render soft radial gradient background overlay
    const radialGrad = ctx.createRadialGradient(
      width / 2, height / 2, 10,
      width / 2, height / 2, Math.max(width, height) * 0.8
    );
    radialGrad.addColorStop(0, 'rgba(10, 15, 45, 0.1)');
    radialGrad.addColorStop(1, 'rgba(3, 5, 20, 0.4)');
    ctx.fillStyle = radialGrad;
    ctx.fillRect(0, 0, width, height);

    // Draw & update glowing circles
    for (const gc of this.glowCircles) {
      gc.x += gc.vx;
      gc.y += gc.vy;

      // Bounce/Wrap boundaries gently
      if (gc.x < -gc.radius) gc.x = width + gc.radius;
      if (gc.x > width + gc.radius) gc.x = -gc.radius;
      if (gc.y < -gc.radius) gc.y = height + gc.radius;
      if (gc.y > height + gc.radius) gc.y = -gc.radius;

      // Draw soft gradient ball
      const glowGrad = ctx.createRadialGradient(
        gc.x, gc.y, 0,
        gc.x, gc.y, gc.radius
      );
      glowGrad.addColorStop(0, gc.color);
      glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.beginPath();
      ctx.arc(gc.x, gc.y, gc.radius, 0, Math.PI * 2);
      ctx.fillStyle = glowGrad;
      ctx.fill();
    }

    // Draw & update particles + Network Connections
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0) p.x = width;
      if (p.x > width) p.x = 0;
      if (p.y < 0) p.y = height;
      if (p.y > height) p.y = 0;

      // Draw connections
      for (let j = i + 1; j < this.particles.length; j++) {
        const p2 = this.particles[j];
        const dx = p.x - p2.x;
        const dy = p.y - p2.y;
        const distSq = dx * dx + dy * dy;
        const maxDist = 140; // Max connection distance

        if (distSq < maxDist * maxDist) {
          const dist = Math.sqrt(distSq);
          const opacity = (1 - dist / maxDist) * 0.4;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = `rgba(180, 200, 255, ${opacity})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }

      // Draw particle dot
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(220, 230, 255, ${p.alpha})`;
      ctx.fill();
    }

    this.animationId = requestAnimationFrame(() => this.animate());
  }
};
