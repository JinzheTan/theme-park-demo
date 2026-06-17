import { dom } from "./dom.js";

const TABS = [
  { id: "tools", label: "Tools", panelId: "panel-tools" },
  { id: "settings", label: "Settings", panelId: "panel-settings" },
  { id: "ops", label: "Ops", panelId: "panel-ops" },
  { id: "staff", label: "Staff", panelId: "panel-staff" },
  { id: "finance", label: "Money", panelId: "panel-finance" },
  { id: "activity", label: "Activity", panelId: "panel-activity" },
  { id: "goals", label: "Goals", panelId: "panel-goals" },
  { id: "rides", label: "Rides", panelId: "panel-rides" },
  { id: "awards", label: "Awards", panelId: "panel-awards" },
  { id: "notes", label: "Notes", panelId: "panel-notes" },
];

let activeTabId = "tools";

export function initMobileTabs() {
  const host = dom.mobileTabs;
  if (!host) return;
  host.replaceChildren();

  const group = document.createElement("div");
  group.className = "pill-group glass glass--depth-1";
  host.appendChild(group);

  for (const tab of TABS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pill pill--toggle";
    btn.dataset.tab = tab.id;
    btn.dataset.panel = tab.panelId;
    btn.textContent = tab.label;
    group.appendChild(btn);
  }

  group.addEventListener("click", (event) => {
    const target = event.target.closest("[data-tab]");
    if (target) switchTab(target.dataset.tab);
  });

  applyActive();
}

export function switchTab(tabId) {
  activeTabId = tabId;
  applyActive();
}

function applyActive() {
  const host = dom.mobileTabs;
  if (!host) return;
  for (const btn of host.querySelectorAll("[data-tab]")) {
    const isActive = btn.dataset.tab === activeTabId;
    btn.classList.toggle("active", isActive);
    btn.classList.toggle("glass--active", isActive);
  }
  const sidebar = dom.sidebar;
  if (sidebar) sidebar.dataset.activeTab = activeTabId;
}
