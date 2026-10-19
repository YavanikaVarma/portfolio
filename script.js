/* =========================================================
   YAVANIKA VARMA — interaction layer
   ========================================================= */
(() => {
  "use strict";

  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* ---------- 1. text splitting ---------- */
  function splitText(el) {
    const walk = (node) => {
      [...node.childNodes].forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          const frag = document.createDocumentFragment();
          [...child.textContent].forEach((ch) => {
            if (ch === " ") {
              frag.appendChild(document.createTextNode(" "));
              return;
            }
            const span = document.createElement("span");
            span.className = "char";
            span.textContent = ch;
            frag.appendChild(span);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          walk(child);
        }
      });
    };
    walk(el);
    $$(".char", el).forEach((c, i) => {
      c.style.transitionDelay = `${0.25 + i * 0.022}s`;
    });
  }
  $$(".split").forEach(splitText);

  /* paint one continuous gradient across split italic words */
  function paintGradients() {
    $$(".hero__title em").forEach((em) => {
      const chars = $$(".char", em);
      if (!chars.length) return;
      const width = em.getBoundingClientRect().width;
      const left = em.getBoundingClientRect().left;
      chars.forEach((ch) => {
        const offset = ch.getBoundingClientRect().left - left;
        ch.style.backgroundSize = `${width}px 100%`;
        ch.style.backgroundPosition = `${-offset}px 0`;
      });
    });
  }
  paintGradients();
  window.addEventListener("load", paintGradients);
  if (document.fonts?.ready) document.fonts.ready.then(paintGradients);
  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(paintGradients, 150);
  });

  /* ---------- 2. preloader ---------- */
  const loader = $("#loader");
  const bar = $("#loaderBar");
  const count = $("#loaderCount");
  let pct = 0;

  const tick = setInterval(() => {
    pct = Math.min(100, pct + Math.random() * 13 + 5);
    bar.style.width = pct + "%";
    count.textContent = String(Math.floor(pct)).padStart(2, "0");
    if (pct >= 100) {
      clearInterval(tick);
      setTimeout(() => {
        loader.classList.add("is-done");
        document.body.classList.add("is-loaded");
        setTimeout(() => loader.remove(), 800);
      }, 320);
    }
  }, 110);

  if (reduced) {
    clearInterval(tick);
    loader.remove();
    document.body.classList.add("is-loaded");
  }

  /* ---------- 3. unified scroll controller (60/120fps rAF pump) ---------- */
  const progress = $("#progress");
  const nav = $("#nav");
  const burger = $("#burger");
  const navLinks = $("#navLinks");
  const timeline = $(".timeline");
  const timelineLine = timeline ? $(".timeline__line i", timeline) : null;
  const parallaxEls = $$("[data-parallax]");

  const parallaxItems = (!reduced && parallaxEls.length)
    ? parallaxEls.map((el) => ({
        el,
        speed: (parseFloat(el.dataset.parallax) || 0.05) * -0.55,
      }))
    : [];

  let isTimelineVisible = false;
  if (timeline && "IntersectionObserver" in window) {
    const tlObserver = new IntersectionObserver(
      (entries) => {
        isTimelineVisible = entries[0].isIntersecting;
        if (isTimelineVisible) requestScroll();
      },
      { rootMargin: "150px 0px" }
    );
    tlObserver.observe(timeline);
  } else if (timeline) {
    isTimelineVisible = true;
  }

  let docHeight = document.documentElement.scrollHeight;
  let winHeight = window.innerHeight;
  let maxScroll = Math.max(docHeight - winHeight, 1);

  const updateDimensions = () => {
    docHeight = document.documentElement.scrollHeight;
    winHeight = window.innerHeight;
    maxScroll = Math.max(docHeight - winHeight, 1);
  };

  let scrollRaf = null;
  const renderScroll = () => {
    const y = window.scrollY;

    // 1. Progress bar
    if (progress) {
      progress.style.width = `${Math.min(Math.max((y / maxScroll) * 100, 0), 100)}%`;
    }

    // 2. Scrolled nav state
    if (nav) {
      nav.classList.toggle("is-scrolled", y > 40);
    }

    // 3. Parallax elements
    for (let i = 0; i < parallaxItems.length; i++) {
      const item = parallaxItems[i];
      item.el.style.transform = `translate3d(0, ${y * item.speed}px, 0)`;
    }

    // 4. Timeline line fill (only calculated when visible)
    if (timeline && timelineLine && isTimelineVisible) {
      const r = timeline.getBoundingClientRect();
      const total = r.height;
      const passed = Math.min(Math.max(winHeight * 0.72 - r.top, 0), total);
      const ratio = total > 0 ? Math.min(Math.max(passed / total, 0), 1) : 0;
      timelineLine.style.transform = `scaleY(${ratio})`;
    }

    scrollRaf = null;
  };

  const requestScroll = () => {
    if (!scrollRaf) {
      scrollRaf = requestAnimationFrame(renderScroll);
    }
  };

  window.addEventListener("scroll", requestScroll, { passive: true });
  window.addEventListener("resize", () => {
    updateDimensions();
    requestScroll();
  }, { passive: true });

  updateDimensions();
  requestScroll();

  /* ---------- 4. nav menu & active section ---------- */
  burger.addEventListener("click", () => {
    const open = navLinks.classList.toggle("is-open");
    burger.classList.toggle("is-open", open);
    burger.setAttribute("aria-expanded", String(open));
    document.body.classList.toggle("is-locked", open);
  });

  $$(".nav__link").forEach((link) => {
    link.addEventListener("click", () => {
      navLinks.classList.remove("is-open");
      burger.classList.remove("is-open");
      burger.setAttribute("aria-expanded", "false");
      document.body.classList.remove("is-locked");
    });
  });

  /* active section link */
  const sections = $$("main section[id]");
  const linkMap = new Map($$(".nav__link").map((l) => [l.getAttribute("href").slice(1), l]));
  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          linkMap.forEach((l) => l.classList.remove("is-active"));
          linkMap.get(e.target.id)?.classList.add("is-active");
        }
      });
    },
    { rootMargin: "-45% 0px -50% 0px" }
  );
  sections.forEach((s) => sectionObserver.observe(s));

  /* ---------- 5. reveal on scroll ---------- */
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry, i) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        setTimeout(() => el.classList.add("is-in"), i * 70);
        revealObserver.unobserve(el);
        if (el.matches(".hero__stats")) runCounters(el);
        if (el.querySelector?.("[data-bar]")) runBars(el);
      });
    },
    { threshold: 0.14, rootMargin: "0px 0px -60px 0px" }
  );
  $$(".reveal").forEach((el) => revealObserver.observe(el));

  /* ---------- 6. counters ---------- */
  function runCounters(scope) {
    $$("[data-count]", scope).forEach((el) => {
      const target = parseFloat(el.dataset.count);
      const decimals = parseInt(el.dataset.decimals || "0", 10);
      const duration = 1600;
      const start = performance.now();
      const step = (now) => {
        const p = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = (target * eased).toFixed(decimals);
        if (p < 1) requestAnimationFrame(step);
        else el.textContent = target.toFixed(decimals);
      };
      requestAnimationFrame(step);
    });
  }

  /* ---------- 7. skill bars ---------- */
  function runBars(scope) {
    $$("[data-bar]", scope).forEach((i) => {
      const target = i.dataset.bar + "%";
      if (i.dataset.done) return;
      i.dataset.done = "1";
      setTimeout(() => (i.style.width = target), 120);
    });
  }
  const barsObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          runBars(e.target);
          $$("[data-bar-num]", e.target).forEach((n, idx) => {
            const bar = $$("[data-bar]", e.target)[idx];
            if (bar) n.textContent = bar.dataset.bar + "%";
          });
          barsObserver.unobserve(e.target);
        }
      });
    },
    { threshold: 0.2 }
  );
  $$(".proficiency").forEach((el) => barsObserver.observe(el));

  /* ---------- 8. magnetic buttons ---------- */
  if (finePointer && !reduced) {
    $$(".magnetic").forEach((el) => {
      let rafId = null;
      let rect = null;

      el.addEventListener("mouseenter", () => {
        rect = el.getBoundingClientRect();
      });

      el.addEventListener("mousemove", (e) => {
        if (!rect) rect = el.getBoundingClientRect();
        if (rafId) return;
        const clientX = e.clientX;
        const clientY = e.clientY;
        rafId = requestAnimationFrame(() => {
          const x = (clientX - rect.left - rect.width / 2) * 0.18;
          const y = (clientY - rect.top - rect.height / 2) * 0.28;
          el.style.transform = `translate(${x}px, ${y}px)`;
          rafId = null;
        });
      });

      el.addEventListener("mouseleave", () => {
        if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
        rect = null;
        el.style.transform = "translate(0, 0)";
      });
    });
  }

  /* ---------- 10. tilt + spotlight ---------- */
  if (finePointer && !reduced) {
    $$("[data-tilt]").forEach((el) => {
      const strength = el.classList.contains("project") ? 3 : 5;
      let rafId = null;
      let rect = null;

      el.addEventListener("mouseenter", () => {
        rect = el.getBoundingClientRect();
      });

      el.addEventListener("mousemove", (e) => {
        if (!rect) rect = el.getBoundingClientRect();
        if (rafId) return;
        const clientX = e.clientX;
        const clientY = e.clientY;
        rafId = requestAnimationFrame(() => {
          const px = (clientX - rect.left) / rect.width;
          const py = (clientY - rect.top) / rect.height;
          el.style.setProperty("--mx", px * 100 + "%");
          el.style.setProperty("--my", py * 100 + "%");
          el.style.transform = `perspective(900px) rotateX(${(0.5 - py) * strength}deg) rotateY(${(px - 0.5) * strength}deg) translateY(-3px)`;
          rafId = null;
        });
      });

      el.addEventListener("mouseleave", () => {
        if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
        rect = null;
        el.style.transform = "";
      });
    });
  }

  /* ---------- 11. parallax & 12. timeline (managed by unified scroll controller) ---------- */

  /* ---------- 13. email copy ---------- */
  const mail = $(".contact__mail");
  if (mail) {
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = "Email copied to clipboard ✓";
    document.body.appendChild(toast);

    mail.addEventListener("click", async (e) => {
      const email = "varmayavanika09@gmail.com";
      try {
        await navigator.clipboard.writeText(email);
        e.preventDefault();
        toast.classList.add("is-on");
        setTimeout(() => toast.classList.remove("is-on"), 2200);
      } catch {
        /* fall back to default mailto behaviour */
      }
    });
  }

  /* ---------- 14. pause off-screen animations ---------- */
  if ("IntersectionObserver" in window) {
    const aurora = $(".aurora");
    const heroObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (aurora) aurora.classList.toggle("is-paused", !entry.isIntersecting);
        });
      },
      { rootMargin: "200px 0px" }
    );
    const hero = $(".hero");
    if (hero) heroObserver.observe(hero);

    const animObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          entry.target.classList.toggle("is-paused", !entry.isIntersecting);
        });
      },
      { rootMargin: "150px 0px" }
    );
    $$(".marquee, .project__visual, .pv-cloud, .orb-wrap").forEach((el) => animObserver.observe(el));
  }

  /* ---------- 15. year ---------- */
  const year = $("#year");
  if (year) year.textContent = new Date().getFullYear();
})();
