// Account-level progress that outlives any single park: which achievements the
// player has ever unlocked. Stored under its own key so "New Park" / "Clear"
// never wipes a hard-earned badge.

const STORAGE_KEY = "wonderloop-progress-v1";

export function loadUnlockedAchievements() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const data = JSON.parse(raw);
    return new Set(Array.isArray(data.achievements) ? data.achievements : []);
  } catch {
    return new Set();
  }
}

export function saveUnlockedAchievements(unlocked) {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ achievements: [...unlocked] }),
    );
  } catch {
    // Non-fatal: achievements still track for the current session.
  }
}
