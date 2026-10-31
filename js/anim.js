// Test build: scroll reveals, stagger, reading progress bar.
(function () {
  const tag = (sel, cls, step) => document.querySelectorAll(sel).forEach((el, i) => {
    el.classList.add("a-in");
    if (cls) el.classList.add(cls);
    if (step) el.style.setProperty("--d", (i % 4) * step + "ms");
  });
  tag(".section h2, .lead, .sec-no", null, 0);
  tag(".feature", "a-zoom", 110);
  tag(".qa", null, 90);
  tag(".plain-list li", "a-left", 90);
  // The shots row scrolls sideways on narrow screens: only animate it when it fits.
  const shots = document.querySelector(".shots");
  if (shots && shots.scrollWidth <= shots.clientWidth + 1) tag(".shots li", "a-right", 120);
  tag(".platform, .col", "a-zoom", 120);
  tag(".split-text > *", null, 120);
  tag("footer p", null, 80);
  const stamp = document.querySelector(".stamp");
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    e.target.classList.add("is-in");
    io.unobserve(e.target);
  }), { threshold: 0.15 });
  document.querySelectorAll(".a-in").forEach((el) => io.observe(el));
  if (stamp) io.observe(stamp);
  const bar = document.createElement("div");
  bar.className = "a-bar";
  bar.setAttribute("aria-hidden", "true");
  document.body.appendChild(bar);
  const onScroll = () => {
    const h = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = "scaleX(" + (h > 0 ? scrollY / h : 0) + ")";
  };
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();
})();
(function () {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  // Hero headline word by word (text nodes only, keeps markup).
  const h1 = document.querySelector("h1");
  if (h1) {
    let i = 0;
    const walk = (n) => [...n.childNodes].forEach((c) => {
      if (c.nodeType === 3 && c.textContent.trim()) {
        const f = document.createDocumentFragment();
        c.textContent.split(/(\s+)/).forEach((w) => {
          if (!w.trim()) return f.append(w);
          const s = document.createElement("span");
          s.className = "a-word"; s.style.setProperty("--i", i++); s.textContent = w; f.append(s);
        });
        c.replaceWith(f);
      } else if (c.nodeType === 1 && !c.matches("svg, svg *")) walk(c);
    });
    walk(h1);
  }
  // Ink ripple on button press.
  document.querySelectorAll(".btn").forEach((b) => b.addEventListener("pointerdown", (e) => {
    const r = b.getBoundingClientRect(), s = Math.max(r.width, r.height), x = document.createElement("span");
    x.className = "a-ripple"; x.style.width = x.style.height = s + "px";
    x.style.left = e.clientX - r.left - s / 2 + "px"; x.style.top = e.clientY - r.top - s / 2 + "px";
    b.appendChild(x); setTimeout(() => x.remove(), 600);
  }));
  // Screenshots tilt toward the mouse.
  document.querySelectorAll(".shots .screen, .split-shot .screen").forEach((el) => {
    el.addEventListener("mousemove", (e) => {
      const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      el.style.transform = "perspective(700px) rotateY(" + x * 14 + "deg) rotateX(" + -y * 14 + "deg) translateY(-6px)";
    });
    el.addEventListener("mouseleave", () => { el.style.transform = ""; });
  });
})();
