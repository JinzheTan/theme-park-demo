export const ASSET_PATHS = {
  grass: "./assets/generated/grass.png",
  path: "./assets/generated/path.png",
  water: "./assets/generated/water.png",
  tree: "./assets/generated/tree.png",
  flowerbed: "./assets/generated/flowerbed.png",
  fountain: "./assets/generated/fountain.png",
  banner: "./assets/generated/banner.png",
  carousel: "./assets/generated/carousel.png",
  wheel: "./assets/generated/ferris-wheel.png",
  coaster: "./assets/generated/coaster.png",
  food: "./assets/generated/food-stall.png",
  service: "./assets/generated/service-hub.png",
  gate: "./assets/generated/gate.png",
};

export const METRIC_ICON_PATHS = {
  money: "./assets/generated/money.png",
  guests: "./assets/generated/guests.png",
  happiness: "./assets/generated/happiness.png",
  cleanliness: "./assets/generated/cleanliness.png",
};

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

export async function loadAssets(state) {
  const gameAssets = Object.entries(ASSET_PATHS).map(async ([key, src]) => [key, await loadImage(src)]);
  const metricAssets = Object.entries(METRIC_ICON_PATHS).map(async ([key, src]) => [`metric-${key}`, await loadImage(src)]);
  const loaded = await Promise.all([...gameAssets, ...metricAssets]);
  state.assets = Object.fromEntries(loaded);
}
