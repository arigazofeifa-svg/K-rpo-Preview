/* ================================================================
   KÓRPO — PROPUESTA DE SCROLL VERTICAL · script.js
   ---------------------------------------------------------------
   1) Utilidades que funcionan SIEMPRE (con o sin animaciones):
      fotos de respaldo, menú, navegación, acordeón, carruseles
      táctiles, barra de progreso.
   2) Animaciones de scroll con GSAP + ScrollTrigger, distintas para
      desktop (≥1024), tablet (640–1023) y celular (<640).
      Solo se activan si GSAP cargó y el usuario NO pidió reducir el
      movimiento (prefers-reduced-motion).
   ================================================================ */

(() => {
  "use strict";

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const root = document.documentElement;
  const body = document.body;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasGsap = typeof window.gsap !== "undefined" && typeof window.ScrollTrigger !== "undefined";
  const motion = hasGsap && !reduceMotion;
  const isDesktop = () => window.matchMedia("(min-width:1024px)").matches;
  const finePointer = window.matchMedia("(hover:hover) and (pointer:fine)").matches;

  if (motion) root.classList.add("motion");
  else root.classList.add("no-motion");

  /* ------------------------------------------------------------
     FOTOS: si una imagen temporal no carga, se muestra un
     placeholder de marca con su nombre (data-foto).
     ------------------------------------------------------------ */
  $$(".media img").forEach((img) => {
    const box = img.closest(".media");
    box.dataset.label = img.dataset.foto || "pendiente";
    const fail = () => box.classList.add("is-missing");
    if (img.complete && img.naturalWidth === 0 && img.getAttribute("src")) fail();
    img.addEventListener("error", fail);
    img.addEventListener("load", () => box.classList.remove("is-missing"));
  });

  /* Tarjetas de contacto con enlace pendiente (href="#") */
  $$(".contact-card").forEach((card) => {
    card.addEventListener("click", (e) => {
      if (card.getAttribute("href") === "#") e.preventDefault();
    });
  });

  const year = $("#year");
  if (year) year.textContent = new Date().getFullYear();

  /* ------------------------------------------------------------
     SCROLL SUAVE (Lenis) — solo desktop con mouse/trackpad.
     En touch se deja el scroll nativo, que es el más fluido.
     ------------------------------------------------------------ */
  let lenis = null;
  if (motion && finePointer && typeof window.Lenis !== "undefined") {
    lenis = new window.Lenis({ lerp: 0.1, wheelMultiplier: 1, smoothWheel: true });
    lenis.on("scroll", window.ScrollTrigger.update);
    window.gsap.ticker.add((t) => lenis.raf(t * 1000));
    window.gsap.ticker.lagSmoothing(0);
  }

  function scrollToTarget(target) {
    if (!target) return;
    if (lenis) {
      lenis.scrollTo(target, { duration: 1.8 });
    } else {
      const top = target.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top, behavior: reduceMotion ? "auto" : "smooth" });
    }
  }

  /* ------------------------------------------------------------
     MENÚ (tablet / celular)
     ------------------------------------------------------------ */
  const menu = $("#menu");
  const menuToggle = $("#menuToggle");

  function setMenu(open) {
    body.classList.toggle("menu-open", open);
    menuToggle.setAttribute("aria-expanded", String(open));
    menuToggle.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
    if (open) menu.removeAttribute("inert");
    else menu.setAttribute("inert", "");
    if (lenis) open ? lenis.stop() : lenis.start();
  }
  menuToggle.addEventListener("click", () => setMenu(!body.classList.contains("menu-open")));
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && body.classList.contains("menu-open")) setMenu(false);
  });
  window.matchMedia("(min-width:1024px)").addEventListener("change", (e) => {
    if (e.matches) setMenu(false);
  });

  /* Enlaces internos: cierran el menú y desplazan con suavidad */
  $$('a[href^="#"]').forEach((a) => {
    const id = a.getAttribute("href");
    if (id.length < 2) return;
    a.addEventListener("click", (e) => {
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      const wasOpen = body.classList.contains("menu-open");
      setMenu(false);
      // Deja que el menú empiece a cerrarse antes de desplazar
      setTimeout(() => scrollToTarget(target), wasOpen ? 120 : 0);
    });
  });

  /* ------------------------------------------------------------
     NAVEGACIÓN: fondo al hacer scroll, ocultar al bajar / mostrar
     al subir, color según la sección (navy o crema), enlace activo
     y barra de progreso.
     ------------------------------------------------------------ */
  const nav = $("#nav");
  const progressBar = $("#progressBar");
  const themed = $$("[data-theme]");
  const navLinks = $$(".nav__links a");
  let lastY = window.scrollY;
  let ticking = false;

  function onScrollFrame() {
    ticking = false;
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progressBar.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;

    nav.classList.toggle("is-scrolled", y > 30);
    if (!body.classList.contains("menu-open")) {
      const goingDown = y > lastY + 4;
      const goingUp = y < lastY - 4;
      if (goingDown && y > window.innerHeight * 0.6) nav.classList.add("is-hidden");
      else if (goingUp || y < 80) nav.classList.remove("is-hidden");
    }
    lastY = y;

    // Sección bajo la barra de navegación
    const probe = 40;
    let current = themed[0];
    for (const s of themed) {
      const r = s.getBoundingClientRect();
      if (r.top <= probe && r.bottom > probe) current = s;
    }
    if (current) {
      nav.dataset.navTheme = current.dataset.theme;
      navLinks.forEach((l) => l.classList.toggle("is-current", l.getAttribute("href") === "#" + current.id));
    }
  }
  function requestFrame() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(onScrollFrame);
    }
  }
  window.addEventListener("scroll", requestFrame, { passive: true });
  window.addEventListener("resize", requestFrame);
  onScrollFrame();

  /* ------------------------------------------------------------
     SERVICIOS — acordeón (uno abierto a la vez)
     ------------------------------------------------------------ */
  const services = $$(".service");
  services.forEach((item) => {
    const btn = $(".service__toggle", item);
    btn.addEventListener("click", () => {
      const open = !item.classList.contains("is-open");
      services.forEach((o) => {
        o.classList.remove("is-open");
        $(".service__toggle", o).setAttribute("aria-expanded", "false");
        $(".service__toggle span", o).textContent = "Ver información";
      });
      if (open) {
        item.classList.add("is-open");
        btn.setAttribute("aria-expanded", "true");
        $("span", btn).textContent = "Cerrar";
      }
      if (motion) setTimeout(() => window.ScrollTrigger.refresh(), 600);
    });
  });

  /* ------------------------------------------------------------
     CARRUSELES TÁCTILES (experiencias en tablet/celular y equipo en
     celular): indicadores sincronizados + flechas.
     ------------------------------------------------------------ */
  function bindCarousel(scroller, dots, prev, next) {
    if (!scroller) return;
    const items = Array.from(scroller.children);
    let raf = 0;
    const update = () => {
      raf = 0;
      const left = scroller.getBoundingClientRect().left;
      let best = 0, bestDist = Infinity;
      items.forEach((it, i) => {
        const d = Math.abs(it.getBoundingClientRect().left - left - parseFloat(getComputedStyle(scroller).scrollPaddingLeft || 0));
        if (d < bestDist) { bestDist = d; best = i; }
      });
      if (dots) dots.forEach((d, i) => d.classList.toggle("is-active", i === best));
    };
    scroller.addEventListener("scroll", () => { if (!raf) raf = requestAnimationFrame(update); }, { passive: true });
    const step = (dir) => {
      const w = items[0].getBoundingClientRect().width + parseFloat(getComputedStyle(scroller).columnGap || 16);
      scroller.scrollBy({ left: dir * w, behavior: reduceMotion ? "auto" : "smooth" });
    };
    if (prev) prev.addEventListener("click", () => step(-1));
    if (next) next.addEventListener("click", () => step(1));
    update();
  }
  bindCarousel($("#expTrack"), $$("#expDots i"), $("#expPrev"), $("#expNext"));
  bindCarousel($(".team__grid"), $$("#teamDots i"));

  /* ------------------------------------------------------------
     SIN ANIMACIONES: retirar la intro y terminar aquí.
     ------------------------------------------------------------ */
  const loader = $("#loader");
  if (!motion) {
    loader.classList.add("is-done");
    return;
  }

  /* ================================================================
     ANIMACIONES (GSAP + ScrollTrigger)
     ================================================================ */
  const { gsap, ScrollTrigger } = window;
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });
  const touchScrub = finePointer ? true : 0.6; // en touch, un pequeño suavizado

  /* ---------- División de texto en palabras / letras ---------- */
  function splitWords(el, mask) {
    const words = [];
    const walk = (node) => {
      Array.from(node.childNodes).forEach((child) => {
        if (child.nodeType === 3) {
          const parts = child.textContent.split(/(\s+)/);
          const frag = document.createDocumentFragment();
          parts.forEach((p) => {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(" ")); return; }
            const w = document.createElement("span");
            w.className = "w";
            w.textContent = p;
            words.push(w);
            if (mask) {
              const m = document.createElement("span");
              m.className = "w-mask";
              m.appendChild(w);
              frag.appendChild(m);
            } else frag.appendChild(w);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === 1) {
          walk(child);
        }
      });
    };
    walk(el);
    return words;
  }
  function splitChars(el) {
    const text = el.textContent.trim();
    el.setAttribute("aria-label", text);
    el.textContent = "";
    return Array.from(text).map((c) => {
      const m = document.createElement("span");
      m.className = "w-mask";
      m.setAttribute("aria-hidden", "true");
      const s = document.createElement("span");
      s.className = "ch";
      s.textContent = c;
      m.appendChild(s);
      el.appendChild(m);
      return s;
    });
  }

  /* ---------- Entradas laterales conectadas al scroll ----------
     El elemento entra desde fuera de la pantalla (izquierda o derecha)
     combinando translateX + opacidad (+ scale / rotate opcionales).
     Va "scrubbed": avanza y retrocede exactamente con el scroll. */
  const slideScrub = 0.5;

  // Distancia en X para que el elemento quede justo fuera de la ventana
  function offscreenX(el, dir) {
    const r = el.getBoundingClientRect();
    const left = r.left - (Number(gsap.getProperty(el, "x")) || 0);
    return dir < 0 ? -(left + r.width) - 80 : window.innerWidth - left + 80;
  }
  // Lado natural de un elemento: el de su mitad de pantalla. Los que ocupan
  // casi todo el ancho alternan según su índice.
  function sideOf(el, i = 0) {
    const r = el.getBoundingClientRect();
    if (r.width > window.innerWidth * 0.7) return i % 2 ? 1 : -1;
    return r.left + r.width / 2 < window.innerWidth / 2 ? -1 : 1;
  }
  function slideIn(el, o = {}) {
    const dir = o.dir || (el.dataset.slide === "right" ? 1 : -1);
    const dist = o.dist ?? 0.32; // fracción del ancho de la ventana
    const fromX = () => (o.edge ? offscreenX(el, dir) : dir * window.innerWidth * dist);
    return gsap.timeline({
      scrollTrigger: {
        trigger: o.trigger || el,
        start: o.start || "top 98%",
        end: o.end || "top 62%",
        scrub: slideScrub,
        invalidateOnRefresh: true,
      },
    })
      .fromTo(el,
        { x: fromX, scale: o.scale ?? 1, rotate: (o.rotate || 0) * dir },
        { x: 0, scale: 1, rotate: 0, duration: 1, ease: "power3.out", immediateRender: true }, 0)
      .fromTo(el, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.55, ease: "power1.out", immediateRender: true }, 0);
  }

  /* ---------- Estados iniciales (para que no "parpadeen") ---------- */
  const hero = $("#inicio");
  const heroMedia = $("#heroMedia");
  const heroImg = $("#heroMedia img");
  const heroShade = $("#heroShade");
  const heroStatement = $("#heroStatement");
  const heroLines = $$(".hero__title .line__in");
  const heroFades = $$("[data-hero-fade]");
  const statementWords = splitWords($(".statement", heroStatement), false);

  gsap.set(heroLines, { yPercent: 110 });
  gsap.set(heroFades, { autoAlpha: 0, y: 16 });
  gsap.set(heroMedia, { autoAlpha: 0 });
  gsap.set(heroStatement, { autoAlpha: 0 });
  gsap.set(statementWords, { opacity: 0.16 });

  /* ---------- 0 · Intro con el logo ---------- */
  const intro = gsap.timeline({
    defaults: { ease: "expo.out" },
    onComplete: () => loader.classList.add("is-done"),
  });
  intro
    .from(".ld-dot", { y: -70, autoAlpha: 0, duration: 0.9, ease: "bounce.out" }, 0.1)
    .from(".ld-pill", { x: -50, autoAlpha: 0, duration: 0.8 }, 0.3)
    .from(".ld-dome", { y: 40, autoAlpha: 0, duration: 0.8 }, 0.45)
    .to(".loader__word", { clipPath: "inset(0 0% 0 0)", duration: 0.9, ease: "power3.inOut" }, 0.75)
    .to(loader, { yPercent: -100, borderRadius: "0 0 50% 50% / 0 0 18% 18%", duration: 1.05, ease: "expo.inOut" }, 1.75)
    .to(heroLines, { yPercent: 0, duration: 1.2, stagger: 0.1 }, 2.15)
    .to(heroMedia, { autoAlpha: 1, duration: 1 }, 2.25)
    .from(heroImg, { scale: 1.35, duration: 1.8, ease: "expo.out", clearProps: "scale" }, 2.25)
    .to(heroFades, { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.08 }, 2.45);

  // Si el usuario regresa a mitad de página, no hace falta esperar la intro completa
  if (window.scrollY > 40) intro.progress(1);

  /* ---------- Revelado de títulos y bloques (todas las pantallas) ---------- */
  $$("[data-split]").forEach((el) => {
    const words = splitWords(el, true);
    gsap.from(words, {
      yPercent: 115,
      duration: 1.1,
      ease: "expo.out",
      stagger: 0.06,
      scrollTrigger: { trigger: el, start: "top 88%", once: true },
    });
  });

  if ($$("[data-reveal]").length) {
    gsap.set("[data-reveal]", { autoAlpha: 0, y: 34 });
    ScrollTrigger.batch("[data-reveal]", {
      start: "top 90%",
      once: true,
      onEnter: (els) => gsap.to(els, { autoAlpha: 1, y: 0, duration: 1, ease: "expo.out", stagger: 0.08, overwrite: true }),
    });
  }

  const contactChars = splitChars($("[data-chars]"));
  gsap.from(contactChars, {
    yPercent: 110,
    rotate: 6,
    duration: 1.2,
    ease: "expo.out",
    stagger: 0.04,
    scrollTrigger: { trigger: "#contactoTitle", start: "top 85%", once: true },
  });

  /* ---------- Marquesina: velocidad y dirección según el scroll ---------- */
  const marquee = $("#marquee");
  marquee.style.animation = "none";
  const marqueeTween = gsap.to(marquee, { xPercent: -50, duration: 38, ease: "none", repeat: -1 });
  ScrollTrigger.create({
    trigger: ".marquee",
    start: "top bottom",
    end: "bottom top",
    onUpdate: (self) => {
      const v = self.getVelocity() / 300;
      gsap.to(marqueeTween, { timeScale: (self.direction || 1) * Math.min(6, 1 + Math.abs(v)), duration: 0.25, overwrite: true });
      gsap.to(marqueeTween, { timeScale: self.direction || 1, duration: 1.2, delay: 0.25 });
    },
  });

  /* ================================================================
     ANIMACIONES POR FORMATO (se rehacen al cruzar un breakpoint)
     ================================================================ */
  const mm = gsap.matchMedia();

  mm.add(
    {
      desktop: "(min-width:1024px)",
      tablet: "(min-width:640px) and (max-width:1023px)",
      mobile: "(max-width:639px)",
    },
    (ctx) => {
      const { desktop, tablet, mobile } = ctx.conditions;

      /* ---------- 1 · HERO: tarjeta → pantalla completa → texto ---------- */
      const clipFrom = () => getComputedStyle(hero).getPropertyValue("--clip-from").trim();
      const heroTl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: hero,
          start: "top top",
          end: () => "+=" + Math.max(1, hero.offsetHeight - window.innerHeight * 2),
          scrub: touchScrub,
          invalidateOnRefresh: true,
        },
      });
      heroTl
        .fromTo(heroMedia, { clipPath: clipFrom }, { clipPath: "inset(0% 0% 0% 0% round 0px)", duration: 1, ease: "power2.inOut" }, 0)
        .fromTo(heroImg, { scale: 1.18 }, { scale: 1, duration: 1.1, ease: "power1.out" }, 0)
        .to(".hero__intro", { yPercent: desktop ? -40 : -25, autoAlpha: 0, duration: 0.7, ease: "power1.in" }, 0.05)
        .to(".scroll-cue", { autoAlpha: 0, duration: 0.2 }, 0)
        .to(heroShade, { opacity: 1, duration: 0.5 }, 0.85)
        .to(heroStatement, { autoAlpha: 1, duration: 0.3 }, 1.05)
        .to(statementWords, { opacity: 1, duration: 0.25, stagger: mobile ? 0.07 : 0.08 }, 1.15)
        .to({}, { duration: 0.35 });

      // La hoja crema sube sobre el hero: la foto se aleja un poco
      gsap.to([heroMedia, heroStatement], {
        scale: desktop ? 0.9 : 0.94,
        yPercent: -4,
        ease: "none",
        scrollTrigger: { trigger: "#conoce", start: "top bottom", end: "top top", scrub: true },
      });

      /* ---------- Textos con data-slide: entran por izquierda / derecha ---------- */
      const textDist = desktop ? 0.3 : tablet ? 0.4 : 0.5;
      // Dentro de columnas sticky se mide desde la columna (no desde el elemento
      // fijado) y se escalona el inicio para que entren uno tras otro.
      $$("[data-slide]").forEach((el) => {
        const sticky = el.closest(".plans__sticky, .services__sticky");
        if (!sticky) return slideIn(el, { dist: textDist });
        const k = $$("[data-slide]", sticky).indexOf(el);
        slideIn(el, { dist: textDist, trigger: sticky.parentElement, start: `top ${98 - k * 5}%`, end: `top ${62 - k * 5}%` });
      });

      /* ---------- 2 · CONOCE: filas de palabras en direcciones opuestas ---------- */
      // Cada palabra, foto y forma entra desde fuera de la pantalla por su lado;
      // las palabras alternan izquierda / derecha fila a fila.
      $$(".kinetic__row").forEach((row, i) => {
        Array.from(row.children).forEach((child) => {
          const isWord = child.classList.contains("kinetic__word");
          const isPic = child.classList.contains("kinetic__pic");
          slideIn(child, {
            dir: isWord ? (i % 2 ? 1 : -1) : sideOf(child),
            edge: true,
            scale: isWord ? 0.92 : isPic ? 0.6 : 0.4,
            rotate: isWord ? 0 : isPic ? 6 : 120,
            trigger: row,
            start: "top bottom",
            end: mobile ? "top 55%" : "center 58%",
          });
        });
      });

      const drift = desktop ? 9 : tablet ? 7 : 5;
      $$(".kinetic__row").forEach((row) => {
        const dir = Number(row.dataset.drift) || 1;
        gsap.fromTo(row, { xPercent: dir * drift }, {
          xPercent: -dir * drift,
          ease: "none",
          scrollTrigger: { trigger: row, start: "top bottom", end: "bottom top", scrub: touchScrub },
        });
      });

      /* ---------- Formas flotantes (parallax sutil) ---------- */
      if (!mobile) {
        $$("[data-float]").forEach((el) => {
          gsap.fromTo(el, { y: 0 }, {
            y: Number(el.dataset.float) * 3,
            rotate: 25,
            ease: "none",
            scrollTrigger: { trigger: el.parentElement, start: "top bottom", end: "bottom top", scrub: true },
          });
          gsap.from(el, {
            x: () => sideOf(el) * window.innerWidth * 0.45,
            ease: "power2.out",
            scrollTrigger: { trigger: el.parentElement, start: "top bottom", end: "top 30%", scrub: slideScrub, invalidateOnRefresh: true },
          });
        });
      }

      /* ---------- 3 · SERVICIOS ---------- */
      if (desktop) {
        const frames = $$(".services__frame");
        const now = $("#serviceNow");
        let active = 0;
        const setActive = (i) => {
          if (i === active) return;
          frames.forEach((f) => f.classList.remove("was-active"));
          frames[active].classList.remove("is-active");
          frames[active].classList.add("was-active");
          frames[i].classList.add("is-active");
          services.forEach((s, k) => s.classList.toggle("is-active", k === i));
          now.textContent = String(i + 1).padStart(2, "0");
          active = i;
        };
        services[0].classList.add("is-active");
        slideIn($(".services__viewer"), { dir: -1, edge: true, scale: 0.85, trigger: ".services", start: "top 85%", end: "top 15%" });
        services.forEach((item) => {
          slideIn($(".service__body", item), { dir: 1, dist: 0.35, trigger: item, start: "top 98%", end: "top 60%" });
        });
        services.forEach((item, i) => {
          ScrollTrigger.create({
            trigger: item,
            start: "top 55%",
            end: "bottom 55%",
            onToggle: (self) => self.isActive && setActive(i),
          });
        });
        return () => services.forEach((s) => s.classList.remove("is-active"));
      }
    }
  );

  /* Segunda pasada de matchMedia: secciones con lógica muy distinta por formato */
  mm.add(
    {
      desktop: "(min-width:1024px)",
      tablet: "(min-width:640px) and (max-width:1023px)",
      mobile: "(max-width:639px)",
    },
    (ctx) => {
      const { desktop, tablet, mobile } = ctx.conditions;

      /* ---------- Servicios en tablet/celular: tarjetas que aparecen ---------- */
      if (!desktop) {
        services.forEach((item, i) => {
          slideIn(item, { dir: sideOf(item, i), dist: mobile ? 0.6 : 0.5, scale: 0.94, rotate: 2, end: "top 65%" });
        });
        $$(".service__pic img").forEach((img) => {
          gsap.fromTo(img, { scale: 1.2 }, {
            scale: 1,
            ease: "none",
            scrollTrigger: { trigger: img.parentElement, start: "top bottom", end: "bottom 40%", scrub: touchScrub },
          });
        });
      }

      /* ---------- 4 · EXPERIENCIAS (galería horizontal fija en todas las pantallas) ---------- */
      {
        const pin = $("#expPin");
        const rail = $("#expRail");
        const distance = () => Math.max(0, rail.scrollWidth - window.innerWidth);
        const bar = $("#expBar");
        const now = $("#expNow");
        const cards = $$(".exp__card");

        const railTween = gsap.to(rail, {
          x: () => -distance(),
          ease: "none",
          scrollTrigger: {
            trigger: pin,
            start: "top top",
            end: () => "+=" + distance(),
            pin: true,
            scrub: desktop ? true : touchScrub,
            anticipatePin: 1,
            refreshPriority: 1,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              bar.style.transform = `scaleX(${self.progress})`;
              // Número de la foto más cercana al centro de la pantalla
              const mid = window.innerWidth / 2;
              let best = 0, bestDist = Infinity;
              cards.forEach((c, k) => {
                const r = c.getBoundingClientRect();
                const d = Math.abs(r.left + r.width / 2 - mid);
                if (d < bestDist) { bestDist = d; best = k; }
              });
              now.textContent = String(best + 1).padStart(2, "0");
            },
          },
        });

        // Parallax interno de cada foto + entrada de cada tarjeta
        cards.forEach((card) => {
          const img = $(".exp__img img", card);
          gsap.fromTo(img, { xPercent: -7 }, {
            xPercent: 7,
            ease: "none",
            scrollTrigger: { trigger: card, containerAnimation: railTween, start: "left right", end: "right left", scrub: true },
          });
          gsap.fromTo($(".exp__img", card), { clipPath: "inset(12% 10% 12% 10% round 24px)" }, {
            clipPath: "inset(0% 0% 0% 0% round 24px)",
            ease: "none",
            scrollTrigger: { trigger: card, containerAnimation: railTween, start: "left right", end: "left 55%", scrub: true },
          });
          gsap.from($("figcaption", card), {
            autoAlpha: 0, y: 20, ease: "none",
            scrollTrigger: { trigger: card, containerAnimation: railTween, start: "left 75%", end: "left 50%", scrub: true },
          });
        });
      }

      /* ---------- 5 · PLANES ---------- */
      const plans = $$(".plan");
      if (desktop) {
        // Pila: cada tarjeta se reduce ligeramente cuando la siguiente la cubre
        plans.forEach((plan, i) => {
          const nextPlan = plans[i + 1];
          if (!nextPlan) return;
          gsap.to(plan, {
            scale: 0.92 + i * 0.015,
            ease: "none",
            scrollTrigger: { trigger: nextPlan, start: "top bottom", end: "top 25%", scrub: true },
          });
        });
      }
      // Cada plan entra desde fuera de la pantalla, alternando lado, con un leve giro.
      // (Sin scale: en desktop la pila ya usa scale.) En celular la pila "sticky"
      // sigue siendo CSS nativo; aquí solo se suma la entrada lateral.
      plans.forEach((plan, i) => {
        slideIn(plan, {
          dir: desktop ? (i % 2 ? -1 : 1) : sideOf(plan, i),
          edge: desktop,
          dist: 0.6,
          rotate: desktop ? 5 : 3,
          start: "top bottom",
          end: desktop ? "top 45%" : "top 65%",
        });
      });

      /* ---------- 6 · EQUIPO ---------- */
      const coaches = $$(".coach");
      if (mobile) {
        gsap.from(coaches, {
          x: 60, autoAlpha: 0, duration: 1, ease: "expo.out", stagger: 0.1,
          scrollTrigger: { trigger: ".team__grid", start: "top 88%", once: true },
        });
      } else {
        coaches.forEach((c, i) => {
          slideIn(c, { dir: sideOf(c, i), edge: desktop, dist: 0.4, scale: 0.9, start: "top bottom", end: "top 55%" });
          const photo = $(".coach__photo", c);
          const img = $("img", photo);
          const tl = gsap.timeline({ scrollTrigger: { trigger: c, start: "top 85%", once: true }, delay: desktop ? i * 0.12 : 0 });
          tl.fromTo(photo, { clipPath: "inset(100% 0% 0% 0% round 28px)" }, { clipPath: "inset(0% 0% 0% 0% round 28px)", duration: 1.3, ease: "expo.inOut" })
            .from(img, { scale: 1.35, duration: 1.6, ease: "expo.out" }, "-=0.9")
            .from($(".coach__info", c), { y: 24, autoAlpha: 0, duration: 0.9, ease: "expo.out" }, "-=1.1");
        });
        if (desktop) {
          $$('.coach[data-parallax="1"]').forEach((c) => {
            gsap.fromTo(c, { y: 60 }, {
              y: -60,
              ease: "none",
              scrollTrigger: { trigger: ".team__grid", start: "top bottom", end: "bottom top", scrub: true },
            });
          });
        }
      }

      /* ---------- 7 · CONTACTO + FOOTER ---------- */
      $$(".contact-card").forEach((card, i) => {
        slideIn(card, { dir: mobile ? (i % 2 ? 1 : -1) : sideOf(card, i), dist: mobile ? 0.6 : 0.35, scale: 0.92, end: "top 70%" });
      });
      gsap.fromTo(".contact__bg img", { yPercent: -8, scale: 1.1 }, {
        yPercent: 8,
        ease: "none",
        scrollTrigger: { trigger: "#contacto", start: "top bottom", end: "bottom bottom", scrub: true },
      });
      gsap.from(".footer__word svg", {
        yPercent: 70,
        ease: "none",
        scrollTrigger: { trigger: ".footer", start: "top bottom", end: "bottom bottom", scrub: touchScrub },
      });
    }
  );

  /* Recalcular cuando cargan las tipografías (cambian alturas) */
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => ScrollTrigger.refresh());
  }
  window.addEventListener("load", () => ScrollTrigger.refresh());
})();
