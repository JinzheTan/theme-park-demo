import { dom } from "./dom.js";
import { ACHIEVEMENTS } from "../data/achievements.js";
import { el, renderList, setText, setClass } from "./diff.js";

function items(state) {
  return ACHIEVEMENTS.map((achievement) => ({
    key: achievement.id,
    icon: achievement.icon,
    label: achievement.label,
    detail: achievement.detail,
    unlocked: state.unlockedAchievements.has(achievement.id),
  }));
}

export function renderAchievements(state) {
  const host = dom.achievementsList;
  if (!host) return;

  const unlockedCount = state.unlockedAchievements.size;
  setText(dom.achievementsCount, `${unlockedCount} / ${ACHIEVEMENTS.length}`);

  renderList(
    host,
    items(state),
    (item) => item.key,
    () => {
      const node = el("article", "achievement-card list-card glass glass--depth-2");
      const icon = el("span", "achievement-card__icon");
      const body = el("div", "achievement-card__body");
      const head = el("strong");
      const chip = el("span", "achievement-chip");
      head.appendChild(document.createTextNode(""));
      head.appendChild(chip);
      const detail = el("span");
      body.appendChild(head);
      body.appendChild(detail);
      node.appendChild(icon);
      node.appendChild(body);
      node._refs = { icon, head: head.firstChild, chip, detail };
      return node;
    },
    (item, node) => {
      setText(node._refs.icon, item.icon);
      node._refs.head.nodeValue = item.label;
      setText(node._refs.chip, item.unlocked ? "Unlocked" : "Locked");
      setText(node._refs.detail, item.detail);
      setClass(node, "unlocked", item.unlocked);
      setClass(node, "locked", !item.unlocked);
    },
  );
}
