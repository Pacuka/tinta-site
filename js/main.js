// Theme toggle (the starting theme is set by theme-boot.js).
function initTheme() {
  const root = document.documentElement;
  const btn = document.getElementById("theme-toggle");
  if (!btn) return;
  const bar = document.querySelector('meta[name="theme-color"]');
  // The label stays "Világos téma"; aria-pressed tells whether it's on.
  const sync = () => {
    const light = root.getAttribute("data-theme") === "light";
    btn.setAttribute("aria-pressed", String(light));
    if (bar) bar.setAttribute("content", light ? "#ffffff" : "#111318");
  };
  sync();
  btn.addEventListener("click", () => {
    const next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
    root.setAttribute("data-theme", next);
    try {
      localStorage.setItem("tinta-theme", next);
    } catch (e) {
      // private mode: works for this visit only
    }
    sync();
  });
}

// Phone menu: the hamburger opens the nav panel.
function initMenu() {
  const btn = document.getElementById("menu-toggle");
  const nav = document.getElementById("site-nav");
  if (!btn || !nav) return;
  const set = (open) => {
    nav.classList.toggle("open", open);
    btn.setAttribute("aria-expanded", String(open));
    btn.setAttribute("aria-label", open ? "Menü bezárása" : "Menü");
  };
  btn.addEventListener("click", () => {
    const open = !nav.classList.contains("open");
    set(open);
    // Keyboard users land in the menu (it comes before the button in the page).
    if (open && btn.matches(":focus-visible")) nav.querySelector("a")?.focus();
  });
  nav.addEventListener("focusout", (e) => {
    if (nav.classList.contains("open") && !nav.contains(e.relatedTarget) && e.relatedTarget !== btn)
      set(false);
  });
  nav.addEventListener("click", (e) => {
    if (e.target.closest("a")) set(false);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && nav.classList.contains("open")) {
      set(false);
      btn.focus();
    }
  });
  document.addEventListener("click", (e) => {
    if (!nav.contains(e.target) && !btn.contains(e.target)) set(false);
  });
}

const reducedMotion = () =>
  matchMedia("(prefers-reduced-motion: reduce)").matches;

// Puts the nib's tip on a point of the line.
function placeNib(nib, pt, angle = 0) {
  nib.setAttribute("transform", `translate(${pt.x} ${pt.y}) rotate(${angle})`);
}

// Hero: the pen draws the line under the headline, lifts off, and the
// app icon's blot lands at the end.
function initHeroInk() {
  const svg = document.querySelector(".ink-stroke");
  if (!svg) return;
  const line = svg.querySelector(".ink-line");
  const nib = svg.querySelector(".ink-nib");
  const blot = svg.querySelector(".ink-blot");
  if (reducedMotion()) {
    blot.classList.add("landed");
    return;
  }
  const len = line.getTotalLength();
  line.style.strokeDasharray = `${len}`;
  line.style.strokeDashoffset = `${len}`;
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
  const draw = 1150;
  const lift = 260;
  let start = null;
  const frame = (now) => {
    start ??= now;
    const t = Math.min((now - start) / draw, 1);
    const drawn = len * ease(t);
    line.style.strokeDashoffset = `${len - drawn}`;
    const pt = line.getPointAtLength(drawn);
    if (t < 1) {
      nib.style.opacity = "1";
      placeNib(nib, pt);
      requestAnimationFrame(frame);
      return;
    }
    // Lift off up and to the right, then the blot lands.
    blot.classList.add("landed");
    const liftStart = now;
    const up = (n) => {
      const k = Math.min((n - liftStart) / lift, 1);
      placeNib(nib, { x: pt.x + 14 * k, y: pt.y - 22 * k }, 8 * k);
      nib.style.opacity = String(1 - k);
      if (k < 1) requestAnimationFrame(up);
    };
    requestAnimationFrame(up);
  };
  setTimeout(() => requestAnimationFrame(frame), 350);
}

// Margin line: follows the reader down the page, ends in a blot next to
// the download section.
function initMarginInk() {
  const box = document.querySelector(".margin-ink");
  const main = document.querySelector("main");
  const target = document.getElementById("letoltes");
  if (!box || !main || !target) return;
  const svg = box.querySelector("svg");
  const line = svg.querySelector(".mi-line");
  const nib = svg.querySelector(".mi-nib");
  const blot = svg.querySelector(".mi-blot");
  const blotShape = blot.querySelector("path");
  let len = 0;
  let endY = 0;

  const layout = () => {
    if (getComputedStyle(box).display === "none") return false;
    // Land next to the download heading.
    const h2 = target.querySelector("h2") ?? target;
    const r = h2.getBoundingClientRect();
    endY = r.top + r.height / 2 - main.getBoundingClientRect().top;
    box.style.height = `${endY + 40}px`;
    // A hand-drawn, slightly wavering vertical line.
    let d = "M20 0";
    for (let y = 140, i = 1; y <= endY; y += 140, i++) {
      const x = 20 + Math.sin(i * 1.7) * 3.5;
      d += ` Q ${20 + Math.sin(i * 1.7 - 0.8) * 5} ${y - 70} ${x} ${Math.min(y, endY)}`;
    }
    line.setAttribute("d", d);
    len = line.getTotalLength();
    const end = line.getPointAtLength(len);
    blotShape.setAttribute(
      "transform",
      `translate(${end.x} ${end.y}) scale(.42) translate(-54 -56)`,
    );
    line.style.strokeDasharray = `${len}`;
    return true;
  };

  // Ink stays: the line only ever grows, scrolling back up keeps it.
  // The nib eases towards the reader's position instead of jumping.
  let shown = 0; // drawn part, 0..1
  let goal = 0; // furthest point the reader has reached
  let landed = false;
  let running = false;

  const readGoal = () => {
    if (reducedMotion()) return 1;
    const reach = innerHeight * 0.6 - main.getBoundingClientRect().top;
    return Math.max(goal, Math.max(0, Math.min(reach / endY, 1)));
  };

  const render = () => {
    if (!len) return; // margin line hidden (narrow screen or no target)
    const drawn = len * shown;
    line.style.strokeDashoffset = `${len - drawn}`;
    if (shown >= 0.999) {
      if (!landed) {
        landed = true;
        blot.classList.add("landed");
      }
      nib.style.opacity = "0";
      return;
    }
    const moving = goal - shown > 0.0005;
    nib.style.opacity = shown > 0 ? "1" : "0";
    nib.style.transition = moving ? "none" : "opacity .6s";
    placeNib(nib, line.getPointAtLength(drawn), 18);
  };

  const tick = () => {
    const diff = goal - shown;
    // Ease in: a tenth of the way per frame, but never slower than a crawl.
    shown = diff < 0.0008 ? goal : shown + Math.max(diff * 0.1, 0.0008);
    render();
    if (shown < goal) requestAnimationFrame(tick);
    else running = false;
  };

  const update = () => {
    goal = readGoal();
    if (reducedMotion()) {
      shown = goal;
      render();
      return;
    }
    if (!running && shown < goal) {
      running = true;
      requestAnimationFrame(tick);
    }
  };

  const onScroll = () => update();
  const setup = () => {
    if (!layout()) return;
    render();
    update();
  };
  setup();
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", setup);
  addEventListener("load", setup); // images change the page height
}

// The screenshot row scrolls sideways only on narrow screens; only then
// does it need to be reachable with the keyboard.
function initShotsScroll() {
  const row = document.querySelector(".shots");
  if (!row) return;
  const sync = () => {
    if (row.scrollWidth > row.clientWidth + 1) row.setAttribute("tabindex", "0");
    else row.removeAttribute("tabindex");
  };
  sync();
  addEventListener("resize", sync);
  addEventListener("load", sync);
}

function initShotsCarousel() {
  const row = document.querySelector(".shots");
  if (!row) return;

  const slides = [...row.children];
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const narrow = matchMedia("(max-width: 899px)");
  let manuallyControlled = false;
  let timer;
  let pointerStart;

  const canAutoAdvance = () =>
    narrow.matches && !reduceMotion.matches && row.scrollWidth > row.clientWidth + 1;

  const stop = () => {
    manuallyControlled = true;
    clearInterval(timer);
  };

  const sync = () => {
    clearInterval(timer);
    if (!canAutoAdvance() || manuallyControlled) return;
    timer = setInterval(() => {
      if (document.hidden || row.getBoundingClientRect().bottom < 0 ||
          row.getBoundingClientRect().top > innerHeight) return;

      const bounds = row.getBoundingClientRect();
      const tabletLayout = narrow.matches && innerWidth >= 600;
      const reference = tabletLayout
        ? bounds.left + row.clientLeft
        : bounds.left + row.clientWidth / 2;
      const current = slides.reduce((best, slide, index) => {
        const slideBounds = slide.getBoundingClientRect();
        const position = tabletLayout
          ? slideBounds.left
          : slideBounds.left + slideBounds.width / 2;
        const distance = Math.abs(position - reference);
        return distance < best.distance ? { index, distance } : best;
      }, { index: 0, distance: Infinity }).index;
      if (current === slides.length - 1) {
        row.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        const next = slides[current + 1];
        const nextBounds = next.getBoundingClientRect();
        const left = tabletLayout
          ? nextBounds.left - bounds.left - row.clientLeft
          : nextBounds.left + nextBounds.width / 2 - reference;
        row.scrollBy({ left, behavior: "smooth" });
      }
    }, 5000);
  };

  row.addEventListener("pointerdown", (event) => {
    pointerStart = { x: event.clientX, y: event.clientY };
  }, { passive: true });
  row.addEventListener("pointermove", (event) => {
    if (!pointerStart) return;
    const dx = Math.abs(event.clientX - pointerStart.x);
    const dy = Math.abs(event.clientY - pointerStart.y);
    if (dx > 8 && dx > dy) {
      pointerStart = undefined;
      stop();
    }
  }, { passive: true });
  row.addEventListener("pointerup", (event) => {
    if (!pointerStart) return;
    const dx = Math.abs(event.clientX - pointerStart.x);
    const dy = Math.abs(event.clientY - pointerStart.y);
    if (dx > 8 && dx > dy) stop();
    pointerStart = undefined;
  }, { passive: true });
  row.addEventListener("pointercancel", () => {
    pointerStart = undefined;
  }, { passive: true });
  row.addEventListener("wheel", (event) => {
    if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) stop();
  }, { passive: true });
  reduceMotion.addEventListener("change", sync);
  narrow.addEventListener("change", sync);
  addEventListener("resize", sync);
  if ("ResizeObserver" in window) {
    new ResizeObserver(sync).observe(row);
  } else {
    addEventListener("load", sync);
  }
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) sync();
  });
  sync();
}

initTheme();
initMenu();
initShotsScroll();
initShotsCarousel();
initHeroInk();
initMarginInk();
