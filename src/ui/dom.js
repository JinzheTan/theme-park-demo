export const dom = {
  canvas: document.getElementById("gameCanvas"),
  minimapCanvas: document.getElementById("minimapCanvas"),
  toolGrid: document.getElementById("toolGrid"),
  guestActivityList: document.getElementById("guestActivityList"),
  goalList: document.getElementById("goalList"),
  rideStatusList: document.getElementById("rideStatusList"),
  insightList: document.getElementById("insightList"),
  eventLog: document.getElementById("eventLog"),
  settingsPanel: document.getElementById("settingsPanel"),
  operationsPanel: document.getElementById("operationsPanel"),
  achievementsList: document.getElementById("achievementsList"),
  achievementsCount: document.getElementById("achievementsCount"),
  toastStack: document.getElementById("toastStack"),
  headlineMetrics: document.getElementById("headlineMetrics"),
  hoverCard: document.getElementById("hoverCard"),
  floatingTools: document.getElementById("floatingTools"),
  speedControls: document.getElementById("speedControls"),
  centerCameraButton: document.getElementById("centerCameraButton"),
  controlsPopover: document.getElementById("controlsPopover"),
  controlsButton: document.getElementById("controlsButton"),
  mobileTabs: document.getElementById("mobileTabs"),
  sidebar: document.querySelector(".sidebar"),
};

export const ctx2d = dom.canvas.getContext("2d");
export const minimapCtx2d = dom.minimapCanvas.getContext("2d");
