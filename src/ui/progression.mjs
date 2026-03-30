const POINTS_PER_LEVEL = 60;

export const STREAK_MILESTONES = [3, 5, 8, 12];
export const STREAK_MILESTONE_SET = new Set(STREAK_MILESTONES);
export const MAX_MISSION_STARS = 3;

export function calculateLevel(score) {
  return Math.floor(score / POINTS_PER_LEVEL) + 1;
}

function isPracticeMode(state) {
  return state.playMode === "practice";
}

function getMissionRatio(state) {
  if (state.syllableCount === 0) {
    return 0;
  }

  return Math.min(state.completedSyllables / state.syllableCount, 1);
}

function getMascotMood(state, missionRatio) {
  if (state.syllableCount === 0) {
    return "idle";
  }

  if (state.missionCompleted) {
    return "celebrate";
  }

  if (state.streak >= 5 || missionRatio >= 0.72) {
    return "happy";
  }

  if (state.streak >= 2 || missionRatio >= 0.22) {
    return "progress";
  }

  return "idle";
}

function updateStickerShelf(dom, state) {
  if (!Array.isArray(dom.stickers)) {
    return 0;
  }

  if (isPracticeMode(state)) {
    dom.stickers.forEach((sticker) => {
      sticker.dataset.earned = "false";
    });
    return 0;
  }

  const stickerStates = {
    starter: state.completedSyllables >= 1,
    spark: state.bestStreak >= 3,
    comet: state.bestStreak >= 5,
    perfect: state.missionCompleted && state.mistakeCount === 0 && state.syllableCount > 0,
  };

  dom.stickers.forEach((sticker) => {
    const isEarned = Boolean(stickerStates[sticker.dataset.sticker]);
    sticker.dataset.earned = isEarned ? "true" : "false";
  });

  return Object.values(stickerStates).filter(Boolean).length;
}

function getComboLabel(streak) {
  if (streak >= 12) {
    return "Ѕвезден лет";
  }

  if (streak >= 8) {
    return "Ракета";
  }

  if (streak >= 5) {
    return "Оган";
  }

  if (streak >= 3) {
    return "Искра";
  }

  return "Старт";
}

function getPrizeCount(score) {
  return Math.floor(score / 30);
}

function getNextCelebrationTarget(streak) {
  const nextMilestone = STREAK_MILESTONES.find((value) => value > streak);

  if (nextMilestone) {
    const remaining = Math.max(nextMilestone - streak, 1);
    return remaining === 1 ? "уште 1" : `уште ${remaining}`;
  }

  return "уште 4";
}
function getMissionToneLabel(state) {
  if (isPracticeMode(state)) {
    return "🎧 Вежбање";
  }

  if (state.missionCompleted) {
    return state.mistakeCount === 0 ? "🎉 Без грешка" : "🎉 Готово";
  }

  if (state.streak >= 8) {
    return "🚀 Лет";
  }

  if (state.streak >= 5) {
    return "🔥 Жешка низа";
  }

  if (state.streak >= 3) {
    return "✨ Искра";
  }

  if (state.completedSyllables > 0) {
    return "🌱 Во тек";
  }

  return "▶️ Старт";
}

export function calculateMissionStarRating(state) {
  if (isPracticeMode(state)) {
    return 0;
  }

  if (!state.missionCompleted || state.syllableCount === 0) {
    return 0;
  }

  if (state.mistakeCount === 0) {
    return 3;
  }

  if (state.mistakeCount <= Math.max(1, Math.floor(state.syllableCount / 4))) {
    return 2;
  }

  return 1;
}

export function getMissionStarSummary(state, earnedStars) {
  if (isPracticeMode(state)) {
    return "Во авто-глас режим мисијата е за вежбање и не се оценува. Исклучи го за следен круг со ѕвезди.";
  }

  if (earnedStars === 3) {
    return `Совршен круг! ${state.completedSyllables} од ${state.syllableCount} чекори беа точни без грешка.`;
  }

  if (earnedStars === 2) {
    return `Одлично! Освоени се 2 од 3 ѕвезди со ${state.mistakeCount} поправк${state.mistakeCount === 1 ? "а" : "и"}.`;
  }

  if (earnedStars === 1) {
    return `Браво за финишот! Освоена е 1 од 3 ѕвезди со ${state.mistakeCount} поправк${state.mistakeCount === 1 ? "а" : "и"}.`;
  }

  return "Заврши ја мисијата за да отклучиш 1-3 ѕвезди.";
}

export function updateDashboard(dom, state) {
  const practiceMode = isPracticeMode(state);
  const missionRatio = getMissionRatio(state);
  const remainingSyllables = Math.max(state.syllableCount - state.completedSyllables, 0);
  const earnedBadgeCount = updateStickerShelf(dom, state);
  const mascotMood = getMascotMood(state, missionRatio);

  if (dom.heroStatusFace) {
    dom.heroStatusFace.dataset.mood = mascotMood;
  }

  if (dom.scoreCount) {
    dom.scoreCount.textContent = String(state.score);
  }
  if (dom.streakCount) {
    dom.streakCount.textContent = String(state.streak);
  }
  if (dom.levelCount) {
    dom.levelCount.textContent = String(state.level);
  }
  if (dom.syllableCount) {
    dom.syllableCount.textContent = state.syllableCount > 0
      ? `${state.completedSyllables} / ${state.syllableCount}`
      : "0";
  }
  if (dom.positionCount) {
    dom.positionCount.textContent = state.currentSyllableIndex >= 0 && state.syllableCount > 0
      ? `${state.currentSyllableIndex + 1} / ${state.syllableCount}`
      : state.syllableCount > 0
        ? `0 / ${state.syllableCount}`
        : "0 / 0";
  }
  if (dom.dictionaryCount) {
    dom.dictionaryCount.textContent = String(state.dictionaryEntries.size);
  }
  dom.comboPower.textContent = practiceMode ? "Вежба" : getComboLabel(state.streak);
  dom.prizeCount.textContent = practiceMode ? "—" : String(getPrizeCount(state.score));
  dom.progressFill.style.width = `${Math.round(missionRatio * 100)}%`;
  dom.progressLabel.textContent = state.syllableCount > 0
    ? `${state.completedSyllables}/${state.syllableCount}`
    : "0/0";
  dom.nextGoalLabel.textContent = state.syllableCount > 0
    ? state.missionCompleted
      ? "До крај: 0"
      : `До крај: ${remainingSyllables}`
    : "До крај: 0";

  if (state.syllableCount === 0) {
    dom.missionText.textContent = "Внеси текст за круг.";
    dom.cheerText.textContent = "✨ Почеток";
    dom.achievementBadge.textContent = `🏅 ${earnedBadgeCount}/4`;
    if (dom.starRatingText) {
      dom.starRatingText.textContent = getMissionStarSummary(state, 0);
    }
    return;
  }

  if (practiceMode) {
    dom.achievementBadge.textContent = `🏅 ${earnedBadgeCount}/4`;
    if (dom.starRatingText) {
      dom.starRatingText.textContent = getMissionStarSummary(state, 0);
    }

    if (state.missionCompleted) {
      dom.missionText.textContent = "Вежбата е готова.";
      dom.cheerText.textContent = getMissionToneLabel(state);
      return;
    }

    dom.missionText.textContent = `Вежба: уште ${remainingSyllables}`;
    dom.cheerText.textContent = getMissionToneLabel(state);
    return;
  }

  if (state.missionCompleted) {
    dom.missionText.textContent = "Кругот е готов.";
    dom.cheerText.textContent = getMissionToneLabel(state);
    dom.achievementBadge.textContent = `🏅 ${earnedBadgeCount}/4`;
    if (dom.starRatingText) {
      dom.starRatingText.textContent = getMissionStarSummary(state, state.roundStarRating || calculateMissionStarRating(state));
    }
    return;
  }

  dom.cheerText.textContent = getMissionToneLabel(state);
  dom.missionText.textContent = `До крај: ${remainingSyllables}`;
  dom.achievementBadge.textContent = `🏅 ${earnedBadgeCount}/4`;
  if (dom.starRatingText) {
    dom.starRatingText.textContent = getMissionStarSummary(state, 0);
  }
}
