import { MAX_MISSION_STARS, getMissionStarSummary } from "./progression.mjs";

const STAR_REVEAL_DELAY_MS = 360;
const STAR_REVEAL_START_MS = 220;
const STAR_BURST_CLEAR_MS = 1080;

function getCelebrationHeading(earnedStars) {
  if (earnedStars === 3) {
    return "Совршена мисија!";
  }

  if (earnedStars === 2) {
    return "Одлично прочитано!";
  }

  if (earnedStars === 1) {
    return "Мисијата е освоена!";
  }

  return "Ѕвезден финиш";
}

function getRatingTargets(dom) {
  return [
    {
      container: dom.starRating,
      stars: dom.starRatingStars || [],
      textElement: dom.starRatingText,
    },
    {
      container: dom.celebrationStars,
      stars: dom.celebrationStarsList || [],
      textElement: dom.celebrationSummary,
    },
  ].filter((target) => target.container || target.textElement);
}

export function pulseElement(element) {
  element.classList.remove("celebration-pop");
  void element.offsetWidth;
  element.classList.add("celebration-pop");
}

function clearRatingAnimationTimers(state) {
  state.ratingAnimationTimerIds.forEach((timerId) => {
    window.clearTimeout(timerId);
  });

  state.ratingAnimationTimerIds = [];
}

function scheduleRatingAnimation(state, callback, delay) {
  const timerId = window.setTimeout(() => {
    state.ratingAnimationTimerIds = state.ratingAnimationTimerIds.filter((value) => value !== timerId);
    callback();
  }, delay);

  state.ratingAnimationTimerIds.push(timerId);
  return timerId;
}

function clearCelebrationOverlayTimer(state) {
  if (state.celebrationOverlayTimerId) {
    window.clearTimeout(state.celebrationOverlayTimerId);
    state.celebrationOverlayTimerId = null;
  }
}

function scheduleCelebrationOverlayReset(state, callback, delay) {
  clearCelebrationOverlayTimer(state);

  state.celebrationOverlayTimerId = window.setTimeout(() => {
    state.celebrationOverlayTimerId = null;
    callback();
  }, delay);
}

function hideCelebrationPanel(dom) {
  dom.celebrationPanel.classList.remove("celebration-panel-active");
  dom.celebrationPanel.hidden = true;
  dom.celebrationStars.classList.remove("celebration-stars-celebrating");
}

export function resetCelebrationOverlay(dom, state) {
  clearCelebrationOverlayTimer(state);
  dom.confettiBurst.classList.remove("confetti-burst-active", "confetti-burst-mega", "confetti-burst-modal");
}

function syncMissionRating(dom, state, earnedStars) {
  state.roundStarRating = earnedStars;
  const summary = getMissionStarSummary(state, earnedStars);
  const label = `Оценка: ${earnedStars} од ${MAX_MISSION_STARS} ѕвезди`;
  dom.celebrationHeading.textContent = getCelebrationHeading(earnedStars);

  getRatingTargets(dom).forEach((target) => {
    if (target.container) {
      target.container.dataset.earned = String(earnedStars);
      target.container.setAttribute("aria-label", label);
    }

    if (target.textElement) {
      target.textElement.textContent = summary;
    }

    target.stars.forEach((star, index) => {
      const shouldHighlight = index < earnedStars;
      star.classList.toggle("is-earned", shouldHighlight);

      if (!shouldHighlight) {
        star.classList.remove("is-bursting");
      }
    });
  });
}

export function resetMissionRating(dom, state, options = {}) {
  const shouldForceHide = Boolean(options.force);

  if (state.celebrationPinned && !shouldForceHide) {
    return;
  }

  clearRatingAnimationTimers(state);
  if (dom.starRating) {
    dom.starRating.classList.remove("star-rating-celebrating");
  }
  state.celebrationPinned = false;
  hideCelebrationPanel(dom);
  dom.celebrationHeading.textContent = getCelebrationHeading(0);

  getRatingTargets(dom).forEach((target) => {
    target.stars.forEach((star) => {
      star.classList.remove("is-earned", "is-bursting", "celebration-pop");
    });
  });

  syncMissionRating(dom, state, 0);
}

export function animateMissionRating(dom, state, earnedStars, options = {}) {
  clearRatingAnimationTimers(state);
  state.celebrationPinned = true;
  if (dom.starRating) {
    dom.starRating.classList.remove("star-rating-celebrating");
  }
  dom.celebrationPanel.classList.remove("celebration-panel-active");
  dom.celebrationPanel.hidden = false;
  dom.celebrationStars.classList.remove("celebration-stars-celebrating");
  dom.celebrationHeading.textContent = getCelebrationHeading(earnedStars);

  getRatingTargets(dom).forEach((target) => {
    target.stars.forEach((star) => {
      star.classList.remove("is-earned", "is-bursting", "celebration-pop");
    });
  });

  getRatingTargets(dom).forEach((target) => {
    if (target.container) {
      target.container.dataset.earned = "0";
      target.container.setAttribute("aria-label", `Оценка: 0 од ${MAX_MISSION_STARS} ѕвезди`);
    }

    if (target.textElement) {
      target.textElement.textContent = "Се пресметува мисијата...";
    }
  });

  void dom.celebrationPanel.offsetWidth;
  dom.celebrationPanel.classList.add("celebration-panel-active");
  if (dom.starRating) {
    dom.starRating.classList.add("star-rating-celebrating");
  }
  dom.celebrationStars.classList.add("celebration-stars-celebrating");
  dom.celebrationPanel.scrollIntoView({ block: "nearest" });

  const animationStars = (dom.celebrationStarsList && dom.celebrationStarsList.length > 0)
    ? dom.celebrationStarsList
    : dom.starRatingStars || [];

  animationStars.forEach((_, index) => {
    scheduleRatingAnimation(state, () => {
      if (index < earnedStars) {
        getRatingTargets(dom).forEach((target) => {
          const star = target.stars[index];
          if (!star) {
            return;
          }

          star.classList.add("is-earned", "is-bursting");
        });

        if (dom.celebrationStarsList[index]) {
          pulseElement(dom.celebrationStarsList[index]);
        }

        if (typeof options.onRevealStar === "function") {
          options.onRevealStar(index + 1);
        }
      }

      if (index === animationStars.length - 1) {
        if (dom.starRating) {
          dom.starRating.classList.remove("star-rating-celebrating");
        }
        dom.celebrationStars.classList.remove("celebration-stars-celebrating");
        syncMissionRating(dom, state, earnedStars);
        pulseElement(dom.celebrationPanel);
        if (dom.starRating) {
          pulseElement(dom.starRating);
        }
        if (typeof options.onComplete === "function") {
          options.onComplete(earnedStars);
        }
        if (dom.celebrationContinueButton) {
          dom.celebrationContinueButton.focus();
        }
      }
    }, STAR_REVEAL_START_MS + index * STAR_REVEAL_DELAY_MS);

    scheduleRatingAnimation(state, () => {
      getRatingTargets(dom).forEach((target) => {
        const star = target.stars[index];
        if (star) {
          star.classList.remove("is-bursting");
        }
      });
    }, STAR_BURST_CLEAR_MS + index * STAR_REVEAL_DELAY_MS);
  });
}

function seedConfettiPiece(piece, intensity = "normal") {
  const isMega = intensity === "mega";
  const randomX = Math.round(-260 + Math.random() * (isMega ? 1040 : 560));
  const randomY = Math.round((isMega ? 180 : 110) + Math.random() * (isMega ? 420 : 200));
  const randomRotation = Math.round(-120 + Math.random() * 240);
  const randomDelay = Math.round(Math.random() * (isMega ? 240 : 110));
  const randomLeft = Math.round(2 + Math.random() * 96);
  const randomTop = Math.round(isMega ? Math.random() * 44 : 10 + Math.random() * 18);
  const randomScale = (0.7 + Math.random() * (isMega ? 1.2 : 0.6)).toFixed(2);

  piece.style.setProperty("--x", `${randomX}px`);
  piece.style.setProperty("--y", `${randomY}px`);
  piece.style.setProperty("--r", `${randomRotation}deg`);
  piece.style.setProperty("--delay", `${randomDelay}ms`);
  piece.style.setProperty("--scale", randomScale);
  piece.style.left = `${randomLeft}%`;
  piece.style.top = `${randomTop}%`;
}

function seedCelebrationStar(star, intensity = "mega") {
  const isMega = intensity === "mega";
  const randomX = Math.round(-160 + Math.random() * (isMega ? 640 : 260));
  const randomY = Math.round(120 + Math.random() * (isMega ? 320 : 120));
  const randomRotation = Math.round(-60 + Math.random() * 120);
  const randomDelay = Math.round(Math.random() * (isMega ? 320 : 100));
  const randomLeft = Math.round(6 + Math.random() * 88);
  const randomTop = Math.round(10 + Math.random() * 36);
  const randomScale = (0.8 + Math.random() * (isMega ? 1.1 : 0.35)).toFixed(2);

  star.style.setProperty("--x", `${randomX}px`);
  star.style.setProperty("--y", `${randomY}px`);
  star.style.setProperty("--r", `${randomRotation}deg`);
  star.style.setProperty("--delay", `${randomDelay}ms`);
  star.style.setProperty("--scale", randomScale);
  star.style.left = `${randomLeft}%`;
  star.style.top = `${randomTop}%`;
}

export function triggerConfetti(dom, state, intensity = "normal", options = {}) {
  const pieces = Array.from(dom.confettiLayer.children);
  const stars = Array.from(dom.starBurst.children);
  const shouldPersist = Boolean(options.persist);

  pieces.forEach((piece) => {
    seedConfettiPiece(piece, intensity);
  });

  stars.forEach((star) => {
    seedCelebrationStar(star, intensity);
  });

  resetCelebrationOverlay(dom, state);
  dom.confettiBurst.classList.remove("confetti-burst-active", "confetti-burst-mega");
  void dom.confettiBurst.offsetWidth;
  dom.confettiBurst.classList.add("confetti-burst-active");

  if (intensity === "mega") {
    dom.confettiBurst.classList.add("confetti-burst-mega");
  }

  if (shouldPersist) {
    dom.confettiBurst.classList.add("confetti-burst-modal");
    return;
  }

  scheduleCelebrationOverlayReset(state, () => {
    resetCelebrationOverlay(dom, state);
  }, intensity === "mega" ? 1800 : 1200);
}

export function buildConfetti(dom) {
  if (dom.confettiLayer.childElementCount > 0 && dom.starBurst.childElementCount > 0) {
    return;
  }

  const confettiFragment = document.createDocumentFragment();
  const starFragment = document.createDocumentFragment();

  for (let index = 0; index < 64; index += 1) {
    const piece = document.createElement("span");
    piece.className = "confetti-burst-piece";
    seedConfettiPiece(piece);
    confettiFragment.appendChild(piece);
  }

  for (let index = 0; index < 12; index += 1) {
    const star = document.createElement("span");
    star.className = "star-burst-piece";
    star.textContent = "★";
    seedCelebrationStar(star);
    starFragment.appendChild(star);
  }

  dom.confettiLayer.appendChild(confettiFragment);
  dom.starBurst.appendChild(starFragment);
}
