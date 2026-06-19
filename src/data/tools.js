export const TOOLS = [
  { id: "path",      group: "Build",     label: "Path",            detail: "Brush winding walkways.",            cost: 6 },
  { id: "remove",    group: "Build",     label: "Remove",          detail: "Refund half of placed items.",        cost: 0 },
  { id: "inspect",   group: "Build",     label: "Inspect",         detail: "Click a guest to follow them.",       cost: 0 },
  { id: "land",      group: "Build",     label: "Buy Land",        detail: "Expand the park's borders.",          cost: 0 },
  { id: "carousel",  group: "Rides",     label: "Carousel",        detail: "Low queue, family draw.",            cost: 260 },
  { id: "wheel",     group: "Rides",     label: "Wheel",           detail: "Scenic views, steady demand.",       cost: 420 },
  { id: "coaster",   group: "Rides",     label: "Coaster",         detail: "Big thrill, high payoff.",           cost: 700 },
  { id: "food",      group: "Facilities", label: "Food Stall",     detail: "Feeds hungry guests, lifts mood.",   cost: 170 },
  { id: "drink",     group: "Facilities", label: "Drink Kiosk",    detail: "Quenches thirst, steady earner.",    cost: 150 },
  { id: "restroom",  group: "Facilities", label: "Restroom",       detail: "Relieves guests so they stay.",      cost: 190 },
  { id: "service",   group: "Facilities", label: "Care Hub",       detail: "Staffed sweep keeps litter down.",   cost: 220 },
  { id: "bench",     group: "Comfort",   label: "Bench",           detail: "Tired guests rest and recover.",     cost: 60 },
  { id: "bin",       group: "Comfort",   label: "Trash Bin",       detail: "Cuts litter dropped nearby.",        cost: 40 },
  { id: "tree",      group: "Scenery",   label: "Tree",            detail: "Softens vistas and boosts charm.",   cost: 45 },
  { id: "flowerbed", group: "Scenery",   label: "Flower Bed",      detail: "Cheap color and guest delight.",     cost: 32 },
  { id: "fountain",  group: "Scenery",   label: "Fountain",        detail: "Premium landmark piece.",            cost: 125 },
  { id: "banner",    group: "Scenery",   label: "Banner",          detail: "Guides flow and brightens plazas.",  cost: 28 },
];

export const TOOL_GROUPS = ["Build", "Rides", "Facilities", "Comfort", "Scenery"];

export const SHORTCUT_TO_TOOL = {
  1: "path",
  2: "carousel",
  3: "wheel",
  4: "coaster",
  5: "food",
  6: "service",
  7: "tree",
  8: "flowerbed",
  9: "fountain",
  0: "remove",
};
