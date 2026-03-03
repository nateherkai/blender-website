(() => {
  "use strict";

  /* ═══════════════════════════════════════════════
     OBSIDIAN VORTEX — Premium Scroll-Driven Engine
     Split layout: blender right 2/3, text left 1/3
     Pure black background (#000)
     ═══════════════════════════════════════════════ */

  /* ── Config ── */
  const FRAME_COUNT = 121;
  const FRAME_PATH = "frames/frame_";
  const FRAME_EXT = ".webp";
  const FIRST_BATCH = 10;
  const IMAGE_SCALE = 0.90;
  const CAMERA_CENTER_X = 0.70;
  const FRAME_SPEED = 2.0;
  const FEATHER_SIZE = 100;

  /* ── DOM ── */
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");
  const canvasWrap = document.getElementById("canvas-wrap");
  const loader = document.getElementById("loader");
  const loaderBar = document.getElementById("loader-bar");
  const loaderPercent = document.getElementById("loader-percent");
  const heroStandalone = document.getElementById("hero-standalone");
  const scrollContainer = document.getElementById("scroll-container");
  const scrollIndicator = document.getElementById("scroll-indicator");
  const siteHeader = document.getElementById("site-header");
  const darkOverlay = document.getElementById("dark-overlay");
  const marqueeWrap1 = document.getElementById("marquee-wrap-1");
  const marqueeText1 = document.getElementById("marquee-text-1");
  const marqueeWrap2 = document.getElementById("marquee-wrap-2");
  const marqueeText2 = document.getElementById("marquee-text-2");

  /* ── State ── */
  const frames = new Array(FRAME_COUNT);
  let loaded = 0;
  let currentFrame = 0;
  const bgColor = "#000000";

  /* ── Helpers ── */
  function frameSrc(i) {
    return FRAME_PATH + String(i + 1).padStart(4, "0") + FRAME_EXT;
  }

  /* ══════════════════════════════════════
     CANVAS ENGINE (offset right drawing)
     Pure black bg, no sampling needed
     ══════════════════════════════════════ */

  function sizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawFrame(currentFrame);
  }

  function drawFrame(index) {
    const img = frames[index];
    if (!img) return;

    const cw = window.innerWidth;
    const ch = window.innerHeight;
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;

    // Scale to fill viewport height with breathing room
    const scale = (ch / ih) * IMAGE_SCALE;
    const dw = iw * scale;
    const dh = ih * scale;

    // Position frame centered at CAMERA_CENTER_X (70% of viewport — right 2/3)
    const dx = (cw * CAMERA_CENTER_X) - (dw / 2);
    const dy = (ch - dh) / 2;

    // Fill entire canvas with pure black
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, cw, ch);

    // Draw the video frame offset to the right
    ctx.drawImage(img, dx, dy, dw, dh);

    // Left-edge feathering: blend frame into black bg (where text lives)
    const featherX = Math.max(0, dx - 10);
    const featherW = FEATHER_SIZE;
    const leftGrad = ctx.createLinearGradient(featherX, 0, featherX + featherW, 0);
    leftGrad.addColorStop(0, bgColor);
    leftGrad.addColorStop(1, "transparent");
    ctx.fillStyle = leftGrad;
    ctx.fillRect(featherX, 0, featherW, ch);

    // Top-edge feathering
    const featherTop = Math.max(0, dy - 10);
    const topGrad = ctx.createLinearGradient(0, featherTop, 0, featherTop + FEATHER_SIZE);
    topGrad.addColorStop(0, bgColor);
    topGrad.addColorStop(1, "transparent");
    ctx.fillStyle = topGrad;
    ctx.fillRect(0, featherTop, cw, FEATHER_SIZE);

    // Bottom-edge feathering
    const featherBot = dy + dh - FEATHER_SIZE + 10;
    const botGrad = ctx.createLinearGradient(0, featherBot, 0, featherBot + FEATHER_SIZE);
    botGrad.addColorStop(0, "transparent");
    botGrad.addColorStop(1, bgColor);
    ctx.fillStyle = botGrad;
    ctx.fillRect(0, featherBot, cw, FEATHER_SIZE);

    // Right-edge feathering
    const featherRight = dx + dw - FEATHER_SIZE + 10;
    const rightGrad = ctx.createLinearGradient(featherRight, 0, featherRight + FEATHER_SIZE, 0);
    rightGrad.addColorStop(0, "transparent");
    rightGrad.addColorStop(1, bgColor);
    ctx.fillStyle = rightGrad;
    ctx.fillRect(featherRight, 0, FEATHER_SIZE, ch);
  }

  /* ══════════════════════════════════════
     FRAME PRELOADER (two-phase)
     ══════════════════════════════════════ */

  function loadFrame(index) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        frames[index] = img;
        loaded++;
        const pct = Math.round((loaded / FRAME_COUNT) * 100);
        loaderBar.style.width = pct + "%";
        loaderPercent.textContent = pct;
        resolve(img);
      };
      img.onerror = () => { loaded++; resolve(null); };
      img.src = frameSrc(index);
    });
  }

  async function preloadFrames() {
    // Phase 1: first batch for fast content
    const batch = [];
    for (let i = 0; i < Math.min(FIRST_BATCH, FRAME_COUNT); i++) {
      batch.push(loadFrame(i));
    }
    await Promise.all(batch);

    // Draw first frame immediately
    if (frames[0]) {
      drawFrame(0);
    }

    // Phase 2: rest in parallel
    const rest = [];
    for (let i = FIRST_BATCH; i < FRAME_COUNT; i++) {
      rest.push(loadFrame(i));
    }
    await Promise.all(rest);
  }

  /* ══════════════════════════════════════
     POSITION SECTIONS
     ══════════════════════════════════════ */

  function positionSections() {
    const containerH = scrollContainer.offsetHeight;
    document.querySelectorAll(".scroll-section").forEach((sec) => {
      const enter = parseFloat(sec.dataset.enter) / 100;
      const leave = parseFloat(sec.dataset.leave) / 100;
      const mid = (enter + leave) / 2;
      sec.style.top = (mid * containerH) + "px";
      sec.style.transform = "translateY(-50%)";
    });
  }

  /* ══════════════════════════════════════
     LENIS SMOOTH SCROLL
     ══════════════════════════════════════ */

  function initLenis() {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true
    });

    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  /* ══════════════════════════════════════
     HERO ANIMATION (word-split on load)
     ══════════════════════════════════════ */

  function initHeroAnimation() {
    const heroWords = Array.from(heroStandalone.querySelectorAll(".word"));
    const heroLabel = heroStandalone.querySelector(".section-label");
    const heroTagline = heroStandalone.querySelector(".hero-tagline");

    gsap.set(heroWords, { y: 80, opacity: 0 });
    gsap.set(heroLabel, { y: 20, opacity: 0 });
    gsap.set(heroTagline, { y: 20, opacity: 0 });

    const tl = gsap.timeline({ delay: 0.4 });
    tl.to(heroLabel, { y: 0, opacity: 1, duration: 0.6, ease: "power3.out" })
      .to(heroWords[0], { y: 0, opacity: 1, duration: 1.0, ease: "power3.out" }, "-=0.2")
      .to(heroWords[1], { y: 0, opacity: 1, duration: 1.0, ease: "power3.out" }, "-=0.6")
      .to(heroTagline, { y: 0, opacity: 1, duration: 0.6, ease: "power3.out" }, "-=0.5");
  }

  /* ══════════════════════════════════════
     HERO-TO-CANVAS TRANSITION
     Circle wipe from blender zone (right side)
     ══════════════════════════════════════ */

  function initHeroTransition() {
    canvasWrap.style.opacity = "1";
    canvasWrap.style.clipPath = "circle(0% at 70% 50%)";

    ScrollTrigger.create({
      trigger: heroStandalone,
      start: "top top",
      end: "bottom top",
      onUpdate: (self) => {
        const radius = self.progress * 85;
        canvasWrap.style.clipPath = `circle(${radius}% at 70% 50%)`;
        if (self.progress > 0.1) {
          scrollIndicator.classList.remove("visible");
        }
      },
      onLeave: () => {
        canvasWrap.style.clipPath = "none";
      },
      onEnterBack: () => {
        canvasWrap.style.clipPath = "circle(85% at 70% 50%)";
      }
    });
  }

  /* ══════════════════════════════════════
     SECTION ANIMATION SYSTEM
     7 animation types
     ══════════════════════════════════════ */

  function getAnimatableChildren(section) {
    if (section.classList.contains("section-stats")) {
      return Array.from(section.querySelectorAll(".stat"));
    }
    if (section.querySelector(".section-inner")) {
      return Array.from(section.querySelector(".section-inner").children);
    }
    return Array.from(section.children);
  }

  function setupSectionAnimation(section) {
    const enter = parseFloat(section.dataset.enter) / 100;
    const leave = parseFloat(section.dataset.leave) / 100;
    const animation = section.dataset.animation;
    const persist = section.dataset.persist === "true";

    if (animation === "pin") return;

    const children = getAnimatableChildren(section);
    if (children.length === 0) return;

    // Set initial hidden states
    switch (animation) {
      case "fade-up":
        gsap.set(children, { y: 50, opacity: 0 });
        break;
      case "slide-left":
        gsap.set(children, { x: -80, opacity: 0 });
        break;
      case "slide-right":
        gsap.set(children, { x: 80, opacity: 0 });
        break;
      case "scale-up":
        gsap.set(children, { scale: 0.85, opacity: 0 });
        break;
      case "rotate-in":
        gsap.set(children, { y: 40, opacity: 0, rotation: 3 });
        break;
      case "stagger-up":
        gsap.set(children, { y: 60, opacity: 0 });
        break;
      case "clip-reveal":
        gsap.set(children, { clipPath: "inset(100% 0 0 0)", opacity: 0 });
        break;
    }

    // Build enter timeline
    const tl = gsap.timeline({ paused: true });

    switch (animation) {
      case "fade-up":
        tl.to(children, { y: 0, opacity: 1, stagger: 0.12, duration: 0.9, ease: "power3.out" });
        break;
      case "slide-left":
        tl.to(children, { x: 0, opacity: 1, stagger: 0.14, duration: 0.9, ease: "power3.out" });
        break;
      case "slide-right":
        tl.to(children, { x: 0, opacity: 1, stagger: 0.14, duration: 0.9, ease: "power3.out" });
        break;
      case "scale-up":
        tl.to(children, { scale: 1, opacity: 1, stagger: 0.12, duration: 1.0, ease: "power2.out" });
        break;
      case "rotate-in":
        tl.to(children, { y: 0, opacity: 1, rotation: 0, stagger: 0.1, duration: 0.9, ease: "power3.out" });
        break;
      case "stagger-up":
        tl.to(children, { y: 0, opacity: 1, stagger: 0.15, duration: 0.8, ease: "power3.out" });
        break;
      case "clip-reveal":
        tl.to(children, { clipPath: "inset(0% 0 0 0)", opacity: 1, stagger: 0.15, duration: 0.9, ease: "power3.out" });
        break;
    }

    let isActive = false;

    ScrollTrigger.create({
      trigger: scrollContainer,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => {
        const p = self.progress;
        if (p >= enter && p <= leave) {
          if (!isActive) {
            isActive = true;
            tl.play();
            section.style.pointerEvents = "auto";
          }
        } else if (p < enter) {
          if (isActive) {
            isActive = false;
            tl.reverse();
            section.style.pointerEvents = "none";
          }
        } else if (p > leave && !persist) {
          if (isActive) {
            isActive = false;
            tl.reverse();
            section.style.pointerEvents = "none";
          }
        }
      }
    });
  }

  /* ══════════════════════════════════════
     COUNTER ANIMATIONS
     ══════════════════════════════════════ */

  function initCounters() {
    document.querySelectorAll(".stat-number").forEach((el) => {
      const target = parseFloat(el.dataset.value);
      const decimals = parseInt(el.dataset.decimals) || 0;
      let hasPlayed = false;

      const parentSection = el.closest(".scroll-section");
      const enter = parseFloat(parentSection.dataset.enter) / 100;
      const leave = parseFloat(parentSection.dataset.leave) / 100;

      ScrollTrigger.create({
        trigger: scrollContainer,
        start: "top top",
        end: "bottom bottom",
        onUpdate: (self) => {
          const p = self.progress;
          if (p >= enter && p <= leave && !hasPlayed) {
            hasPlayed = true;
            const obj = { val: 0 };
            gsap.to(obj, {
              val: target,
              duration: 2,
              ease: "power1.out",
              onUpdate: () => {
                if (decimals > 0) {
                  el.textContent = obj.val.toFixed(decimals);
                } else {
                  const val = Math.round(obj.val);
                  el.textContent = val >= 1000 ? val.toLocaleString() : val;
                }
              }
            });
          } else if (p < enter && hasPlayed) {
            hasPlayed = false;
            el.textContent = "0";
          }
        }
      });
    });
  }

  /* ══════════════════════════════════════
     DUAL MARQUEE SYSTEM
     ══════════════════════════════════════ */

  function initMarquees() {
    const marquees = [
      { wrap: marqueeWrap1, text: marqueeText1, enter: 0.14, leave: 0.26, speed: -25 },
      { wrap: marqueeWrap2, text: marqueeText2, enter: 0.44, leave: 0.58, speed: -30 }
    ];

    marquees.forEach(({ wrap, text, enter, leave, speed }) => {
      if (!wrap || !text) return;

      ScrollTrigger.create({
        trigger: scrollContainer,
        start: "top top",
        end: "bottom bottom",
        onUpdate: (self) => {
          const p = self.progress;
          if (p >= enter && p <= leave) {
            const fadeIn = Math.min(1, (p - enter) / 0.04);
            const fadeOut = Math.min(1, (leave - p) / 0.04);
            wrap.style.opacity = Math.min(fadeIn, fadeOut);
          } else {
            wrap.style.opacity = 0;
          }
        }
      });

      gsap.to(text, {
        xPercent: speed,
        ease: "none",
        scrollTrigger: {
          trigger: scrollContainer,
          start: "top top",
          end: "bottom bottom",
          scrub: true
        }
      });
    });
  }

  /* ══════════════════════════════════════
     DARK OVERLAY (for stats section)
     ══════════════════════════════════════ */

  function initDarkOverlay() {
    const statsSection = document.querySelector(".section-stats");
    if (!statsSection) return;

    const statsEnter = parseFloat(statsSection.dataset.enter) / 100;
    const statsLeave = parseFloat(statsSection.dataset.leave) / 100;
    const fadeRange = 0.03;

    ScrollTrigger.create({
      trigger: scrollContainer,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => {
        const p = self.progress;
        let overlayOpacity = 0;

        if (p >= statsEnter - fadeRange && p < statsEnter) {
          overlayOpacity = ((p - (statsEnter - fadeRange)) / fadeRange) * 0.92;
        } else if (p >= statsEnter && p <= statsLeave) {
          overlayOpacity = 0.92;
        } else if (p > statsLeave && p <= statsLeave + fadeRange) {
          overlayOpacity = (1 - (p - statsLeave) / fadeRange) * 0.92;
        }

        darkOverlay.style.opacity = overlayOpacity;
      }
    });
  }

  /* ══════════════════════════════════════
     HEADER SCROLL EFFECT
     ══════════════════════════════════════ */

  function initHeaderScroll() {
    ScrollTrigger.create({
      trigger: scrollContainer,
      start: "top top",
      end: "100 top",
      onUpdate: (self) => {
        if (self.progress > 0) {
          siteHeader.classList.add("scrolled");
        } else {
          siteHeader.classList.remove("scrolled");
        }
      }
    });
  }

  /* ══════════════════════════════════════
     FRAME-TO-SCROLL BINDING
     ══════════════════════════════════════ */

  function initFrameScroll() {
    ScrollTrigger.create({
      trigger: scrollContainer,
      start: "top top",
      end: "bottom bottom",
      scrub: true,
      onUpdate: (self) => {
        const acceleratedProgress = Math.min(self.progress * FRAME_SPEED, 1.0);
        const index = Math.min(
          Math.floor(acceleratedProgress * FRAME_COUNT),
          FRAME_COUNT - 1
        );
        if (index !== currentFrame) {
          currentFrame = index;
          requestAnimationFrame(() => drawFrame(currentFrame));
        }
      }
    });
  }

  /* ══════════════════════════════════════
     INIT
     ══════════════════════════════════════ */

  async function init() {
    sizeCanvas();
    window.addEventListener("resize", () => {
      sizeCanvas();
      positionSections();
    });

    await preloadFrames();

    // Hide loader, show UI
    loader.classList.add("hidden");
    siteHeader.classList.add("visible");
    setTimeout(() => scrollIndicator.classList.add("visible"), 600);

    // Position sections
    positionSections();

    // Initialize Lenis smooth scroll
    initLenis();

    // Register GSAP
    gsap.registerPlugin(ScrollTrigger);

    // Hero animation (plays on load)
    initHeroAnimation();

    // Hero-to-canvas circle wipe
    initHeroTransition();

    // Core scroll systems
    initFrameScroll();
    initMarquees();
    initDarkOverlay();
    initHeaderScroll();
    initCounters();

    // Section animations
    document.querySelectorAll(".scroll-section").forEach(setupSectionAnimation);
  }

  init();
})();
