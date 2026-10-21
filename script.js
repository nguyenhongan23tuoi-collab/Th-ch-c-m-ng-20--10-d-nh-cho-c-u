"use strict";

const envelope = document.getElementById("envelope");
const envelopeWrap = document.getElementById("envelopeWrap");
const paper = document.querySelector(".paper");
const card = document.getElementById("greetingCard");
const cardTitle = document.getElementById("cardTitle");
const letterCat = document.querySelector(".letter-cat");
const restart = document.getElementById("restart");
const giftTrigger = document.getElementById("giftTrigger");
const giftPanel = document.getElementById("giftPanel");
const giftDialog = document.querySelector(".gift-dialog");
const giftScene = document.getElementById("giftScene");
const giftBox = document.getElementById("giftBox");
const giftLid = document.getElementById("giftLid");
const giftKitten = document.getElementById("giftKitten");
const giftMessage = document.getElementById("giftMessage");
const giftClose = document.getElementById("giftClose");
const pawBurst = document.getElementById("pawBurst");
const roseBurst = document.getElementById("roseBurst");
const status = document.getElementById("status");
const musicToggle = document.getElementById("musicToggle");
const stage = document.querySelector(".stage");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const motion = {
  flap: 620,
  paper: 820,
  expand: 720,
  collapse: 520,
  giftBox: 640,
  giftLid: 380,
  kitten: 760,
  giftMessage: 520,
  giftBoxClose: 360,
  trumpet: 850,
};

let state = "closed";
let pawTimer;
let roseTimer;
let cursorReleaseTimer;
let clickAudioContext;
let musicGain;
let musicTimer;
let musicEnabled = false;
let musicPreferenceSet = false;
let musicNextNoteAt = 0;
let musicNoteIndex = 0;

function waitForMotion(element, eventName, expectedName, duration, update) {
  if (reducedMotion.matches) {
    update();
    return new Promise((resolve) => window.setTimeout(resolve, 30));
  }

  return new Promise((resolve) => {
    const timeout = window.setTimeout(finish, duration + 180);

    function finish() {
      window.clearTimeout(timeout);
      element.removeEventListener(eventName, onMotionEnd);
      resolve();
    }

    function onMotionEnd(event) {
      if (event.target !== element) return;

      if (eventName === "transitionend" && event.propertyName !== expectedName) return;
      if (eventName === "animationend" && event.animationName !== expectedName) return;

      finish();
    }

    element.addEventListener(eventName, onMotionEnd);
    update();
  });
}

function burstPaws() {
  pawBurst.replaceChildren();
  window.clearTimeout(pawTimer);

  const stageRect = document.querySelector(".stage").getBoundingClientRect();
  const envelopeRect = envelope.getBoundingClientRect();
  const centerX = envelopeRect.left - stageRect.left + envelopeRect.width / 2;
  const centerY = envelopeRect.top - stageRect.top + envelopeRect.height * .48;
  const symbols = ["🐾", "♡", "🐾", "♡", "🐾", "♡", "🐾", "♡", "🐾", "♡"];

  symbols.forEach((symbol, index) => {
    const angle = (Math.PI * 2 * index / symbols.length) - Math.PI / 2;
    const distance = 92 + (index % 3) * 22;
    const particle = document.createElement("span");

    particle.className = symbol === "🐾" ? "paw-pop" : "heart-pop";
    particle.textContent = symbol;
    particle.style.setProperty("--x", `${centerX}px`);
    particle.style.setProperty("--y", `${centerY}px`);
    particle.style.setProperty("--dx", `${Math.cos(angle) * distance}px`);
    particle.style.setProperty("--dy", `${Math.sin(angle) * distance}px`);
    particle.style.setProperty("--rotation", `${index % 2 ? 16 : -16}deg`);
    particle.style.setProperty("--delay", `${index % 4 * 35}ms`);
    pawBurst.appendChild(particle);
  });

  pawTimer = window.setTimeout(() => pawBurst.replaceChildren(), reducedMotion.matches ? 60 : 1150);
}

function burstRoses(event) {
  roseBurst.replaceChildren();
  window.clearTimeout(roseTimer);

  const envelopeRect = envelope.getBoundingClientRect();
  const centerX = Number.isFinite(event.clientX) ? event.clientX : envelopeRect.left + envelopeRect.width / 2;
  const centerY = Number.isFinite(event.clientY) ? event.clientY : envelopeRect.top + envelopeRect.height / 2;
  const flowers = ["🌹", "🌷", "🌹", "🌸", "🌹", "🌷", "🌹", "🌸"];

  flowers.forEach((flower, index) => {
    const angle = Math.PI * 2 * index / flowers.length - Math.PI / 2;
    const distance = 112 + index % 3 * 18;
    const particle = document.createElement("span");

    particle.className = "rose-pop";
    particle.textContent = flower;
    particle.style.setProperty("--x", `${centerX}px`);
    particle.style.setProperty("--y", `${centerY}px`);
    particle.style.setProperty("--dx", `${Math.cos(angle) * distance}px`);
    particle.style.setProperty("--dy", `${Math.sin(angle) * distance}px`);
    particle.style.setProperty("--rotation", `${index % 2 ? 18 : -18}deg`);
    particle.style.setProperty("--delay", `${index % 4 * 35}ms`);
    roseBurst.appendChild(particle);
  });

  roseTimer = window.setTimeout(() => roseBurst.replaceChildren(), reducedMotion.matches ? 60 : 1350);
}

function playClickSound() {
  const context = getClickAudioContext();
  if (!context) return;

  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const now = context.currentTime;

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(620, now);
  oscillator.frequency.exponentialRampToValueAtTime(430, now + .065);
  gain.gain.setValueAtTime(.045, now);
  gain.gain.exponentialRampToValueAtTime(.001, now + .075);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + .08);
}

function getClickAudioContext() {
  const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextConstructor) return null;

  if (!clickAudioContext) clickAudioContext = new AudioContextConstructor();
  const context = clickAudioContext;
  if (context.state === "suspended") void context.resume();
  return context;
}

function updateMusicToggle() {
  musicToggle.textContent = musicEnabled ? "♫ Tắt nhạc" : "♫ Bật nhạc";
  musicToggle.setAttribute("aria-pressed", String(musicEnabled));
  musicToggle.setAttribute("aria-label", `${musicEnabled ? "Tắt" : "Bật"} nhạc nền`);
}

function scheduleBackgroundMusic() {
  if (!musicEnabled || !clickAudioContext || !musicGain) return;

  const notes = [523.25, 659.25, 783.99, 659.25, 587.33, 698.46, 783.99, 698.46];
  const horizon = clickAudioContext.currentTime + 1;

  while (musicNextNoteAt < horizon) {
    const oscillator = clickAudioContext.createOscillator();
    const noteGain = clickAudioContext.createGain();
    const noteTime = musicNextNoteAt;

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(notes[musicNoteIndex], noteTime);
    noteGain.gain.setValueAtTime(.0001, noteTime);
    noteGain.gain.linearRampToValueAtTime(.14, noteTime + .04);
    noteGain.gain.exponentialRampToValueAtTime(.0001, noteTime + .42);
    oscillator.connect(noteGain);
    noteGain.connect(musicGain);
    oscillator.start(noteTime);
    oscillator.stop(noteTime + .44);

    musicNoteIndex = (musicNoteIndex + 1) % notes.length;
    musicNextNoteAt += .52;
  }
}

function startBackgroundMusic() {
  const context = getClickAudioContext();
  if (!context) {
    musicToggle.disabled = true;
    musicToggle.textContent = "♫ Không hỗ trợ";
    return false;
  }
  if (musicEnabled) return true;

  if (!musicGain) {
    musicGain = context.createGain();
    musicGain.gain.value = .0001;
    musicGain.connect(context.destination);
  }

  musicEnabled = true;
  musicNextNoteAt = context.currentTime + .05;
  musicGain.gain.cancelScheduledValues(context.currentTime);
  musicGain.gain.setValueAtTime(Math.max(musicGain.gain.value, .0001), context.currentTime);
  musicGain.gain.exponentialRampToValueAtTime(.06, context.currentTime + .25);
  scheduleBackgroundMusic();
  musicTimer = window.setInterval(scheduleBackgroundMusic, 220);
  updateMusicToggle();
  return true;
}

function stopBackgroundMusic() {
  musicEnabled = false;
  window.clearInterval(musicTimer);
  musicTimer = undefined;

  if (musicGain && clickAudioContext) {
    musicGain.gain.cancelScheduledValues(clickAudioContext.currentTime);
    musicGain.gain.setTargetAtTime(.0001, clickAudioContext.currentTime, .035);
  }

  updateMusicToggle();
}

function playTrumpetSound() {
  const context = getClickAudioContext();
  if (!context) return;

  const now = context.currentTime;
  const notes = [
    { frequency: 523.25, start: 0, duration: .16 },
    { frequency: 659.25, start: .17, duration: .16 },
    { frequency: 783.99, start: .34, duration: .34 },
  ];

  notes.forEach(({ frequency, start, duration }) => {
    const noteStart = now + start;
    const fundamental = context.createOscillator();
    const overtone = context.createOscillator();
    const tone = context.createGain();
    const overtoneGain = context.createGain();
    const envelope = context.createGain();
    const filter = context.createBiquadFilter();

    fundamental.type = "sawtooth";
    fundamental.frequency.setValueAtTime(frequency, noteStart);
    overtone.type = "triangle";
    overtone.frequency.setValueAtTime(frequency * 2, noteStart);
    tone.gain.value = .72;
    overtoneGain.gain.value = .28;
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1850, noteStart);
    envelope.gain.setValueAtTime(.0001, noteStart);
    envelope.gain.linearRampToValueAtTime(.055, noteStart + .025);
    envelope.gain.exponentialRampToValueAtTime(.0001, noteStart + duration);

    fundamental.connect(tone);
    overtone.connect(overtoneGain);
    tone.connect(filter);
    overtoneGain.connect(filter);
    filter.connect(envelope);
    envelope.connect(context.destination);
    fundamental.start(noteStart);
    overtone.start(noteStart);
    fundamental.stop(noteStart + duration);
    overtone.stop(noteStart + duration);
  });
}

function playCatMeow() {
  const context = getClickAudioContext();
  if (!context) return;

  const now = context.currentTime;
  const meow = context.createOscillator();
  const harmonic = context.createOscillator();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();

  meow.type = "sawtooth";
  meow.frequency.setValueAtTime(570, now);
  meow.frequency.exponentialRampToValueAtTime(820, now + .09);
  meow.frequency.exponentialRampToValueAtTime(390, now + .48);
  harmonic.type = "triangle";
  harmonic.frequency.setValueAtTime(1140, now);
  harmonic.frequency.exponentialRampToValueAtTime(780, now + .48);
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(1250, now);
  filter.Q.value = 1.2;
  gain.gain.setValueAtTime(.0001, now);
  gain.gain.linearRampToValueAtTime(.045, now + .045);
  gain.gain.exponentialRampToValueAtTime(.0001, now + .5);

  meow.connect(filter);
  harmonic.connect(filter);
  filter.connect(gain);
  gain.connect(context.destination);
  meow.start(now);
  harmonic.start(now);
  meow.stop(now + .51);
  harmonic.stop(now + .51);
}

function pressPawCursor(event) {
  if (Number.isFinite(event.clientX) && Number.isFinite(event.clientY)) {
    document.documentElement.style.setProperty("--paw-x", `${event.clientX}px`);
    document.documentElement.style.setProperty("--paw-y", `${event.clientY}px`);
  }

  window.clearTimeout(cursorReleaseTimer);
  document.body.classList.add("is-paw-pressed");
  cursorReleaseTimer = window.setTimeout(() => {
    document.body.classList.remove("is-paw-pressed");
  }, 280);
}

async function replayCardCatTrumpet() {
  await waitForMotion(letterCat, "animationend", "cat-trumpet", motion.trumpet, () => {
    letterCat.classList.remove("is-trumpet-playing");
    void letterCat.offsetWidth;
    letterCat.classList.add("is-trumpet-playing");
    playTrumpetSound();
  });
  letterCat.classList.remove("is-trumpet-playing");
}

async function openLetter() {
  if (state !== "closed") return;

  if (!musicPreferenceSet) startBackgroundMusic();
  state = "opening";
  envelope.disabled = true;
  status.textContent = "Phong thư đang mở…";

  await waitForMotion(envelope.querySelector(".envelope-flap"), "transitionend", "transform", motion.flap, () => {
    envelope.classList.add("is-flap-open");
  });

  burstPaws();
  await waitForMotion(paper, "transitionend", "transform", motion.paper, () => {
    paper.classList.add("is-pulled");
  });

  playTrumpetSound();
  envelopeWrap.classList.add("is-card-revealed");
  card.hidden = false;
  void card.offsetWidth;
  await waitForMotion(card, "animationend", "card-expand", motion.expand, () => {
    card.classList.add("is-expanding");
  });
  card.classList.remove("is-expanding");
  state = "open";
  envelope.disabled = false;
  restart.disabled = false;
  giftTrigger.hidden = false;
  giftTrigger.disabled = false;
  giftTrigger.textContent = "🎁 Mở quà";
  status.textContent = "Lá thư đã mở. Chúc bạn một ngày 20/10 thật vui!";
  cardTitle.focus();
}

async function openGift() {
  if (state !== "open") return;

  state = "giftOpening";
  giftTrigger.disabled = true;
  giftTrigger.textContent = "🎁 Đang mở quà…";
  restart.disabled = true;
  giftClose.hidden = true;
  giftPanel.hidden = false;
  giftDialog.appendChild(musicToggle);
  giftPanel.tabIndex = -1;
  giftTrigger.setAttribute("aria-expanded", "true");
  status.textContent = "Món quà đang được mở…";
  void giftPanel.offsetWidth;
  giftPanel.focus();

  await waitForMotion(giftBox, "animationend", "gift-box-pop", motion.giftBox, () => {
    giftBox.classList.add("is-box-appearing");
  });
  giftBox.classList.remove("is-box-appearing");

  await waitForMotion(giftLid, "transitionend", "transform", motion.giftLid, () => {
    giftScene.classList.add("is-lid-open");
  });

  await waitForMotion(giftKitten, "transitionend", "transform", motion.kitten, () => {
    giftScene.classList.add("is-kitten-visible");
  });
  playCatMeow();

  giftScene.classList.add("is-title-visible");
  await waitForMotion(giftMessage, "animationend", "gift-message-rise", motion.giftMessage, () => {
    giftMessage.classList.add("is-visible");
  });

  state = "giftOpened";
  giftTrigger.textContent = "🎁 Đã mở quà";
  giftClose.hidden = false;
  restart.disabled = false;
  status.textContent = "Bó hoa đã được mở quà dành tặng bạn.";
  giftClose.focus();
}

async function closeGift({ returnFocus = true } = {}) {
  if (state !== "giftOpened") return;

  state = "giftClosing";
  giftTrigger.disabled = true;
  restart.disabled = true;
  giftClose.disabled = true;
  giftClose.hidden = true;
  status.textContent = "Món quà đang được gấp lại…";
  giftScene.classList.remove("is-title-visible");

  await waitForMotion(giftKitten, "transitionend", "transform", motion.kitten, () => {
    giftScene.classList.remove("is-kitten-visible");
  });
  giftMessage.classList.remove("is-visible");

  await waitForMotion(giftLid, "transitionend", "transform", motion.giftLid, () => {
    giftScene.classList.remove("is-lid-open");
  });

  await waitForMotion(giftBox, "animationend", "gift-box-shrink", motion.giftBoxClose, () => {
    giftBox.classList.add("is-box-closing");
  });

  giftBox.classList.remove("is-box-closing");
  giftPanel.hidden = true;
  stage.appendChild(musicToggle);
  giftTrigger.setAttribute("aria-expanded", "false");
  giftTrigger.disabled = false;
  giftTrigger.textContent = "🎁 Mở quà";
  giftClose.disabled = false;
  if (!returnFocus) {
    state = "open";
    return;
  }

  state = "giftReturning";
  giftTrigger.disabled = true;
  restart.disabled = true;
  status.textContent = "Chú mèo đang thổi kèn chào bạn…";
  await replayCardCatTrumpet();
  state = "open";
  giftTrigger.disabled = false;
  restart.disabled = false;
  status.textContent = "Món quà đã được gấp gọn. Chú mèo thổi kèn chào bạn!";
  giftTrigger.focus();
}

async function closeLetter() {
  if (state === "giftOpened") await closeGift({ returnFocus: false });
  if (state !== "open") return;

  state = "closing";
  restart.disabled = true;
  giftTrigger.hidden = true;
  status.textContent = "Lá thư đang được gấp lại…";

  await waitForMotion(card, "animationend", "card-collapse", motion.collapse, () => {
    card.classList.add("is-collapsing");
  });
  card.classList.remove("is-collapsing");
  card.hidden = true;
  envelopeWrap.classList.remove("is-card-revealed");

  await waitForMotion(paper, "transitionend", "transform", motion.paper, () => {
    paper.classList.remove("is-pulled");
  });

  await waitForMotion(envelope.querySelector(".envelope-flap"), "transitionend", "transform", motion.flap, () => {
    envelope.classList.remove("is-flap-open");
  });

  state = "closed";
  envelope.disabled = false;
  envelope.setAttribute("aria-expanded", "false");
  giftTrigger.setAttribute("aria-expanded", "false");
  status.textContent = "Phong thư đang chờ bạn mở.";
  envelope.focus();
}

envelope.addEventListener("click", () => {
  if (state !== "closed") return;
  envelope.setAttribute("aria-expanded", "true");
  void openLetter();
});

restart.addEventListener("click", () => {
  if (state !== "open" && state !== "giftOpened") return;
  void closeLetter();
});

giftTrigger.addEventListener("click", () => {
  if (state !== "open") return;
  void openGift();
});

giftClose.addEventListener("click", () => {
  if (state !== "giftOpened") return;
  void closeGift();
});

musicToggle.addEventListener("click", () => {
  musicPreferenceSet = true;
  if (musicEnabled) stopBackgroundMusic();
  else startBackgroundMusic();
});

giftPanel.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && state === "giftOpened") {
    event.preventDefault();
    void closeGift();
    return;
  }

  if (event.key !== "Tab") return;

  if (state === "giftOpening") {
    event.preventDefault();
    musicToggle.focus();
    return;
  }

  if (state === "giftOpened") {
    event.preventDefault();
    if (event.shiftKey) {
      if (document.activeElement === musicToggle) giftClose.focus();
      else musicToggle.focus();
    } else if (document.activeElement === giftClose) {
      musicToggle.focus();
    } else {
      giftClose.focus();
    }
  }
});

window.addEventListener("pointerdown", (event) => {
  if (event.button !== 0) return;
  if (event.target !== musicToggle && !musicPreferenceSet && !musicEnabled) startBackgroundMusic();
  pressPawCursor(event);
  playClickSound();
  burstRoses(event);
}, true);
window.addEventListener("pointerup", (event) => {
  if (document.body.classList.contains("is-paw-pressed")) pressPawCursor(event);
}, true);
window.addEventListener("pointercancel", () => {
  window.clearTimeout(cursorReleaseTimer);
  document.body.classList.remove("is-paw-pressed");
}, true);
window.addEventListener("blur", () => {
  window.clearTimeout(cursorReleaseTimer);
  document.body.classList.remove("is-paw-pressed");
});

document.addEventListener("click", (event) => {
  if (!document.body.classList.contains("is-paw-pressed")) {
    pressPawCursor(event.detail === 0 ? {} : event);
  }
}, true);
