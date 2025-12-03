/* ============================
   Galaxy Starfield + Nebula (Option A)
   - Canvas layers: nebula + three star layers
   - Cursor parallax + glow follower
   - Light/Dark theme support (updates nebula & star colors)
   - UI interactions: theme toggle, nav, tilt, counters, progress, carousel, contact
   ============================ */

(() => {
  /* ---------- Config ---------- */
  const config = {
    stars: {
      back: { count: 220, size: [0.3, 1.1], speed: 0.02, alpha: [0.06, 0.25] },
      mid:  { count: 160, size: [0.6, 1.6], speed: 0.06, alpha: [0.12, 0.42] },
      front:{ count: 100, size: [0.9, 2.4], speed: 0.14, alpha: [0.2, 0.95] }
    },
    nebula: { blobs: 3 },
    cursorLag: 0.08,
    maxParallax: 36
  };

  /* ---------- Elements ---------- */
  const nebulaCanvas = document.getElementById('nebula-canvas');
  const starCanvasBack = document.getElementById('star-canvas-back');
  const starCanvasMid  = document.getElementById('star-canvas-mid');
  const starCanvasFront= document.getElementById('star-canvas-front');
  const glowFollow = document.getElementById('glow-follow');

  const layers = [
    { el: starCanvasBack, cfg: config.stars.back, stars: [], ctx: null },
    { el: starCanvasMid,  cfg: config.stars.mid,  stars: [], ctx: null },
    { el: starCanvasFront,cfg: config.stars.front,stars: [], ctx: null }
  ];

  let nebCtx;
  let w=0, h=0;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const mouse = { x:0.5, y:0.5, px:0.5, py:0.5 };
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Helpers ---------- */
  function lerp(a,b,t){ return a + (b-a)*t; }
  function rand(a,b){ return a + Math.random()*(b-a); }

  /* ---------- Resize & init ---------- */
  function resize() {
    w = innerWidth; h = innerHeight;
    [nebulaCanvas, starCanvasBack, starCanvasMid, starCanvasFront].forEach(c => {
      c.width = Math.floor(w * dpr);
      c.height = Math.floor(h * dpr);
      c.style.width = `${w}px`;
      c.style.height = `${h}px`;
      const ctx = c.getContext('2d');
      ctx.setTransform(dpr,0,0,dpr,0,0);
    });
    nebCtx = nebulaCanvas.getContext('2d');
    layers.forEach(l => l.ctx = l.el.getContext('2d'));

    // generate stars
    layers.forEach(layer => {
      layer.stars = [];
      for (let i=0;i<layer.cfg.count;i++){
        layer.stars.push({
          x: Math.random()*w,
          y: Math.random()*h,
          size: lerp(layer.cfg.size[0], layer.cfg.size[1], Math.random()),
          speed: lerp(layer.cfg.speed, layer.cfg.speed*1.6, Math.random()),
          alpha: lerp(layer.cfg.alpha[0], layer.cfg.alpha[1], Math.random()),
          twinkle: Math.random() > 0.92 ? (Math.random()*0.6+0.4) : 0
        });
      }
    });

    drawNebula();
  }

  /* ---------- Nebula drawing (colors depend on theme) ---------- */
  function drawNebula() {
    nebCtx.clearRect(0,0,w,h);
    // choose colors based on theme
    const isDark = document.body.classList.contains('dark');
    const baseColors = isDark
      ? ['rgba(12,28,64,0.14)', 'rgba(30,60,110,0.12)', 'rgba(46,160,255,0.10)']
      : ['rgba(220,235,255,0.22)', 'rgba(190,215,255,0.18)', 'rgba(120,170,230,0.10)'];

    for (let i=0;i<config.nebula.blobs;i++){
      const cx = rand(-0.2*w, 1.2*w);
      const cy = rand(-0.2*h, 1.2*h);
      const rad = Math.max(w,h) * (0.6 + Math.random()*0.6);
      const g = nebCtx.createRadialGradient(cx,cy, rad*0.08, cx,cy, rad);
      g.addColorStop(0, baseColors[i % baseColors.length]);
      g.addColorStop(0.35, isDark ? 'rgba(6,12,30,0.03)' : 'rgba(240,250,255,0.05)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      nebCtx.globalCompositeOperation = 'lighter';
      nebCtx.fillStyle = g;
      nebCtx.fillRect(cx - rad, cy - rad, rad*2, rad*2);
      nebCtx.globalCompositeOperation = 'source-over';
    }

    // try a gentle blur if supported
    try {
      nebCtx.filter = 'blur(26px) saturate(120%)';
      const image = nebCtx.getImageData(0,0,w,dpr?Math.floor(h):h);
      nebCtx.putImageData(image,0,0);
      nebCtx.filter = 'none';
    } catch(e) { /* ignore */ }
  }

  /* ---------- Star render ---------- */
  function updateAndDraw() {
    const parallaxX = (mouse.px - 0.5)*config.maxParallax;
    const parallaxY = (mouse.py - 0.5)*config.maxParallax;

    layers.forEach((layer, idx) => {
      const ctx = layer.ctx;
      ctx.clearRect(0,0,w,h);
      const ox = parallaxX * (0.2 + idx*0.45);
      const oy = parallaxY * (0.2 + idx*0.45);

      // draw each star
      for (let s of layer.stars){
        // drift based on mouse
        s.x += s.speed * (mouse.px - 0.5) * 0.9;
        s.y += s.speed * (mouse.py - 0.5) * 0.9;

        // wrap
        if (s.x < -10) s.x = w + 10;
        if (s.x > w + 10) s.x = -10;
        if (s.y < -10) s.y = h + 10;
        if (s.y > h + 10) s.y = -10;

        const px = s.x + ox, py = s.y + oy;

        // glow
        ctx.beginPath();
        ctx.fillStyle = `rgba(255,255,255,${s.alpha * 0.45})`;
        ctx.arc(px,py, s.size * 0.9, 0, Math.PI*2);
        ctx.fill();

        // core
        ctx.beginPath();
        ctx.fillStyle = `rgba(255,255,255,${s.alpha})`;
        ctx.arc(px,py, s.size * 0.45, 0, Math.PI*2);
        ctx.fill();

        // twinkle
        if (s.twinkle) {
          const t = (Math.sin(Date.now()/420 + s.size*10) + 1)/2;
          ctx.beginPath();
          ctx.fillStyle = `rgba(255,255,255,${s.alpha * (0.25 + 0.7*t)})`;
          ctx.arc(px + Math.sin(Date.now()/320 + s.x)*0.2, py, s.size*0.55, 0, Math.PI*2);
          ctx.fill();
        }
      }
    });
  }

  /* ---------- Loop ---------- */
  let rafId = null;
  function loop() {
    mouse.px += (mouse.x - mouse.px) * (reduceMotion ? 1 : config.cursorLag);
    mouse.py += (mouse.y - mouse.py) * (reduceMotion ? 1 : config.cursorLag);
    updateAndDraw();
    rafId = requestAnimationFrame(loop);
  }

  /* ---------- Pointer handlers ---------- */
  window.addEventListener('pointermove', e => {
    mouse.x = Math.max(0, Math.min(1, e.clientX / window.innerWidth));
    mouse.y = Math.max(0, Math.min(1, e.clientY / window.innerHeight));
    // glow follower
    glowFollow.style.left = `${e.clientX}px`;
    glowFollow.style.top  = `${e.clientY}px`;
    glowFollow.style.opacity = 1;
    glowFollow.style.transform = 'translate(-50%,-50%) scale(1)';
  });

  window.addEventListener('pointerleave', () => {
    glowFollow.style.opacity = 0;
    glowFollow.style.transform = 'translate(-50%,-50%) scale(0.7)';
  });

  /* ---------- Resize ---------- */
  window.addEventListener('resize', () => {
    cancelAnimationFrame(rafId);
    resize();
    if (!reduceMotion) loop();
    else updateAndDraw();
  });

  /* ---------- Init ---------- */
  resize();
  setTimeout(() => {
    if (!reduceMotion) loop();
    else updateAndDraw();
  }, 80);

  /* ==========================
     UI Interactivity (theme, nav, tilt, counters, bars, carousel, contact)
     ========================== */

  // theme toggle with canvas update
  const themeToggle = document.getElementById('themeToggle');
  const rootBody = document.body;
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    rootBody.classList.add('dark');
    themeToggle.textContent = '☀️';
  } else {
    rootBody.classList.remove('dark');
    themeToggle.textContent = '🌙';
  }

  function updateCanvasTheme() {
    // redraw nebula with theme colors
    drawNebula();
    // optionally adjust star alphas for light theme (stars darker)
    const isDark = rootBody.classList.contains('dark');
    layers.forEach(layer => {
      // reduce alpha for light theme so stars look subtle
      const factor = isDark ? 1 : 0.45;
      layer.stars.forEach(s => s.alpha = Math.max(0.05, s.alpha * factor));
    });
    // redraw one frame
    updateAndDraw();
  }

  themeToggle.addEventListener('click', () => {
    const isDark = rootBody.classList.toggle('dark');
    themeToggle.textContent = isDark ? '☀️' : '🌙';
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    updateCanvasTheme();
  });

  // mobile nav toggle
  const navToggle = document.getElementById('navToggle');
  const navList = document.getElementById('navList');
  if (navToggle) {
    navToggle.addEventListener('click', () => {
      const expanded = navToggle.getAttribute('aria-expanded') === 'true';
      navToggle.setAttribute('aria-expanded', String(!expanded));
      navList.style.display = expanded ? 'none' : 'flex';
    });
    if (window.innerWidth < 820) navList.style.display = 'none';
  }

  // tilt on profile card
  const tiltCard = document.getElementById('tiltCard');
  if (tiltCard && !reduceMotion) {
    tiltCard.addEventListener('pointermove', (e) => {
      const r = tiltCard.getBoundingClientRect();
      const cx = r.left + r.width/2;
      const cy = r.top + r.height/2;
      const dx = (e.clientX - cx)/(r.width/2);
      const dy = (e.clientY - cy)/(r.height/2);
      const rx = -dy * 6;
      const ry = dx * 6;
      tiltCard.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg) translateZ(6px)`;
    });
    tiltCard.addEventListener('pointerleave', () => tiltCard.style.transform = 'none');
  }

  // intersection observer for counters & bars
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        // progress bars
        const bars = entry.target.querySelectorAll('.progress');
        bars.forEach(b => {
          const v = b.getAttribute('data-value') || b.dataset.value;
          const inner = b.querySelector('span');
          if (inner) inner.style.width = v + '%';
        });
        // counters
        const nums = entry.target.querySelectorAll('.stat-num');
        nums.forEach(n => animateCounter(n));
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.18 });

  document.querySelectorAll('.panel, .hero, .skills-grid, .carousel, .profile-card').forEach(el => observer.observe(el));

  function animateCounter(el){
    if (el._done) return;
    el._done = true;
    const target = parseFloat(el.dataset.target) || 0;
    const duration = 1100;
    const start = performance.now();
    const from = parseFloat(el.textContent) || 0;
    function tick(ts){
      const t = Math.min((ts - start)/duration, 1);
      const v = from + (target - from) * (1 - Math.pow(1 - t, 3));
      el.textContent = (Math.round(v * 100)/100).toString();
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  // carousel
  (function initCarousel(){
    const carousel = document.querySelector('.carousel');
    if (!carousel) return;
    const track = carousel.querySelector('.carousel-track');
    const prev = carousel.querySelector('.carousel-prev');
    const next = carousel.querySelector('.carousel-next');
    const cards = track.children;
    let idx = 0;
    function update(){
      const cardWidth = cards[0].getBoundingClientRect().width + 16;
      track.style.transform = `translateX(${-idx * cardWidth}px)`;
    }
    if(prev) prev.addEventListener('click', () => { idx = Math.max(0, idx - 1); update(); });
    if(next) next.addEventListener('click', () => { idx = Math.min(cards.length - 1, idx + 1); update(); });
    window.addEventListener('resize', update);
    setTimeout(update, 200);
  })();

  // contact form mailto fallback
  const contactForm = document.getElementById('contactForm');
  const formStatus = document.getElementById('formStatus');
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('cname').value.trim();
      const email = document.getElementById('cemail').value.trim();
      const message = document.getElementById('cmessage').value.trim();
      if (!name || !email || !message) {
        if (formStatus) formStatus.textContent = 'Please fill all fields.';
        return;
      }
      const subject = encodeURIComponent(`Portfolio contact from ${name}`);
      const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`);
      window.location.href = `mailto:nvjkumar77@gmail.com?subject=${subject}&body=${body}`;
      if (formStatus) formStatus.textContent = 'Opening your email client...';
    });
  }

  // footer year
  const fy = document.getElementById('fyear');
  if (fy) fy.textContent = new Date().getFullYear();

})();
