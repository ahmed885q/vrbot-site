/**
 * Viking Rise Task Sequences — maps task names → ADB command sequences
 *
 * Coordinate system: 1280x720 (landscape mode)
 * Coordinates sourced from proven server-side Python task files
 * Each step: { cmd: "tap:x,y" | "swipe:..." | "key:...", delay: ms_to_wait_after }
 */

export type TaskStep = {
  cmd: string;
  delay: number; // ms to wait AFTER this command
  desc?: string; // human-readable description
};

export type TaskSequence = {
  name: string;
  steps: TaskStep[];
  totalTime: number; // estimated total ms
};

// ── Viking Rise UI coordinates (1280x720 landscape) ──────────────
// PROVEN coordinates from server Python tasks
const UI = {
  // Navigation
  WORLD_MAP:      "tap:47,643",     // Bottom-left world map button
  MAGNIFY_ICON:   "tap:155,525",    // Search/magnify on world map
  MAIL_ICON:      "tap:1245,580",   // Mail icon (right side)
  QUESTS_ICON:    "tap:1140,580",   // Quests icon
  ALLIANCE_BTN:   "tap:1100,685",   // Alliance button (bottom-right)

  // Common actions
  BACK:           "key:BACK",
  HOME:           "key:HOME",
  CENTER:         "tap:640,360",

  // Gather-specific (from task_gather.py)
  GATHER_BTN:     "tap:1075,485",   // Gather button on resource
  CREATE_BTN:     "tap:940,170",    // Create march button
  MARCH_BTN:      "tap:960,615",    // Send march button

  // Niflung-specific (from task_niflung.py)
  NIFLUNG_CAT:    "tap:380,655",    // Niflung category in search
  NIFLUNG_SEARCH: "tap:380,490",    // Niflung search button
  ATTACK_BTN:     "tap:950,462",    // Attack button
  NIFLUNG_MARCH:  "tap:985,640",    // March button for niflung

  // Resource categories in search panel (from task_gather.py)
  CAT_FARM:       "tap:555,655",
  CAT_SAWMILL:    "tap:725,655",
  CAT_QUARRY:     "tap:890,655",
  CAT_GOLDMINE:   "tap:1060,655",
  SEARCH_FARM:    "tap:555,490",
  SEARCH_SAWMILL: "tap:725,490",
  SEARCH_QUARRY:  "tap:890,490",
  SEARCH_GOLDMINE:"tap:1060,490",

  // Mail (from task_mail_rewards.py)
  READ_CLAIM_ALL: "tap:390,645",    // Read & Claim All in mail

  // Tribe Tech (from task_tribe_tech.py)
  TECH_BTN:       "tap:1100,640",   // Technology (Resources) button

  // Hall of Valor (from task_hall_of_valor.py)
  TAB_HERO:       "tap:175,148",
  TAB_SKILL:      "tap:175,245",
  FREE_SUMMON_BTN:"tap:645,615",
  BACK_ARROW:     "tap:30,25",

  // Prosperity (from task_prosperity.py)
  OK_BTN:         "tap:640,610",    // OK on prosperity popup
};

// ── Task Definitions ──────────────────────────────────────────────
// Sequences match the server-side Python task logic

const TASK_MAP: Record<string, TaskSequence> = {

  // ── Gather Resources: 5 marches (farm, sawmill, quarry, goldmine, goldmine) ──
  "Gather Resources": {
    name: "Gather Resources",
    totalTime: 90000,
    steps: [
      // Go to world map
      { cmd: UI.WORLD_MAP, delay: 3000, desc: "Open world map" },
      // March 1: Farm
      { cmd: UI.MAGNIFY_ICON, delay: 2500, desc: "Open search panel" },
      { cmd: UI.CAT_FARM, delay: 2000, desc: "Select farm category" },
      { cmd: UI.SEARCH_FARM, delay: 5000, desc: "Search for farm" },
      { cmd: UI.GATHER_BTN, delay: 3000, desc: "Tap gather" },
      { cmd: UI.CREATE_BTN, delay: 3000, desc: "Create march" },
      { cmd: UI.MARCH_BTN, delay: 3000, desc: "Send march" },
      // March 2: Sawmill
      { cmd: UI.MAGNIFY_ICON, delay: 2500, desc: "Open search panel" },
      { cmd: UI.CAT_SAWMILL, delay: 2000, desc: "Select sawmill category" },
      { cmd: UI.SEARCH_SAWMILL, delay: 5000, desc: "Search for sawmill" },
      { cmd: UI.GATHER_BTN, delay: 3000, desc: "Tap gather" },
      { cmd: UI.CREATE_BTN, delay: 3000, desc: "Create march" },
      { cmd: UI.MARCH_BTN, delay: 3000, desc: "Send march" },
      // March 3: Quarry
      { cmd: UI.MAGNIFY_ICON, delay: 2500, desc: "Open search panel" },
      { cmd: UI.CAT_QUARRY, delay: 2000, desc: "Select quarry category" },
      { cmd: UI.SEARCH_QUARRY, delay: 5000, desc: "Search for quarry" },
      { cmd: UI.GATHER_BTN, delay: 3000, desc: "Tap gather" },
      { cmd: UI.CREATE_BTN, delay: 3000, desc: "Create march" },
      { cmd: UI.MARCH_BTN, delay: 3000, desc: "Send march" },
      // March 4: Goldmine
      { cmd: UI.MAGNIFY_ICON, delay: 2500, desc: "Open search panel" },
      { cmd: UI.CAT_GOLDMINE, delay: 2000, desc: "Select goldmine category" },
      { cmd: UI.SEARCH_GOLDMINE, delay: 5000, desc: "Search for goldmine" },
      { cmd: UI.GATHER_BTN, delay: 3000, desc: "Tap gather" },
      { cmd: UI.CREATE_BTN, delay: 3000, desc: "Create march" },
      { cmd: UI.MARCH_BTN, delay: 3000, desc: "Send march" },
      // March 5: Goldmine again
      { cmd: UI.MAGNIFY_ICON, delay: 2500, desc: "Open search panel" },
      { cmd: UI.CAT_GOLDMINE, delay: 2000, desc: "Select goldmine category" },
      { cmd: UI.SEARCH_GOLDMINE, delay: 5000, desc: "Search for goldmine" },
      { cmd: UI.GATHER_BTN, delay: 3000, desc: "Tap gather" },
      { cmd: UI.CREATE_BTN, delay: 3000, desc: "Create march" },
      { cmd: UI.MARCH_BTN, delay: 3000, desc: "Send march" },
    ],
  },

  // ── Mail Rewards (from task_mail_rewards.py) ──
  "Mail Rewards": {
    name: "Mail Rewards",
    totalTime: 15000,
    steps: [
      { cmd: UI.MAIL_ICON, delay: 3000, desc: "Open mail" },
      { cmd: UI.READ_CLAIM_ALL, delay: 3000, desc: "Read & Claim All" },
      { cmd: UI.CENTER, delay: 2000, desc: "Dismiss popup" },
      { cmd: UI.BACK, delay: 2000, desc: "Back from mail" },
    ],
  },

  // ── Quest Rewards (from task_mail_rewards.py _collect_quests) ──
  "Quest Rewards": {
    name: "Quest Rewards",
    totalTime: 15000,
    steps: [
      { cmd: UI.QUESTS_ICON, delay: 3000, desc: "Open quests" },
      // Tap claim area multiple times (server uses AI, we tap common positions)
      { cmd: "tap:1100,400", delay: 2000, desc: "Claim reward 1" },
      { cmd: UI.CENTER, delay: 1000, desc: "Dismiss" },
      { cmd: "tap:1100,400", delay: 2000, desc: "Claim reward 2" },
      { cmd: UI.CENTER, delay: 1000, desc: "Dismiss" },
      { cmd: "tap:1100,400", delay: 2000, desc: "Claim reward 3" },
      { cmd: UI.CENTER, delay: 1000, desc: "Dismiss" },
      { cmd: UI.BACK, delay: 2000, desc: "Back from quests" },
    ],
  },

  // ── Hunt Niflung (from task_niflung.py) ──
  "Hunt Niflung": {
    name: "Hunt Niflung",
    totalTime: 25000,
    steps: [
      { cmd: UI.WORLD_MAP, delay: 3000, desc: "Open world map" },
      // Open search → Niflung category → Search
      { cmd: UI.MAGNIFY_ICON, delay: 2500, desc: "Open search panel" },
      { cmd: UI.NIFLUNG_CAT, delay: 2000, desc: "Select Niflung category" },
      { cmd: UI.NIFLUNG_SEARCH, delay: 5000, desc: "Search for Niflung" },
      // Attack → Create → March
      { cmd: UI.ATTACK_BTN, delay: 2500, desc: "Attack" },
      { cmd: UI.CREATE_BTN, delay: 2500, desc: "Create march" },
      { cmd: UI.NIFLUNG_MARCH, delay: 3500, desc: "Send march" },
    ],
  },

  // ── Kill Monster (same flow as Niflung but different category) ──
  "Kill Monster": {
    name: "Kill Monster",
    totalTime: 25000,
    steps: [
      { cmd: UI.WORLD_MAP, delay: 3000, desc: "Open world map" },
      { cmd: UI.MAGNIFY_ICON, delay: 2500, desc: "Open search panel" },
      // Monster category is next to Niflung — slightly to the left
      { cmd: "tap:220,655", delay: 2000, desc: "Select monster category" },
      { cmd: "tap:220,490", delay: 5000, desc: "Search for monster" },
      { cmd: UI.ATTACK_BTN, delay: 2500, desc: "Attack" },
      { cmd: UI.CREATE_BTN, delay: 2500, desc: "Create march" },
      { cmd: UI.NIFLUNG_MARCH, delay: 3500, desc: "Send march" },
    ],
  },

  // ── Tribe Tech (from task_tribe_tech.py) ──
  "Tribe Tech": {
    name: "Tribe Tech",
    totalTime: 30000,
    steps: [
      { cmd: UI.ALLIANCE_BTN, delay: 3000, desc: "Open alliance" },
      // Swipe left to reveal Technology tab
      { cmd: "swipe:900,675,400,675", delay: 2000, desc: "Swipe to find tech tab" },
      { cmd: UI.TECH_BTN, delay: 2000, desc: "Tap Technology (Resources)" },
      // Donate multiple times (server does 20, we do 5 to stay within timeout)
      { cmd: "tap:640,500", delay: 2000, desc: "Donate 1" },
      { cmd: "tap:640,500", delay: 2000, desc: "Donate 2" },
      { cmd: "tap:640,500", delay: 2000, desc: "Donate 3" },
      { cmd: "tap:640,500", delay: 2000, desc: "Donate 4" },
      { cmd: "tap:640,500", delay: 2000, desc: "Donate 5" },
      { cmd: UI.BACK, delay: 1000, desc: "Back" },
    ],
  },

  // ── Hall of Valor (from task_hall_of_valor.py) ──
  "Hall of Valor": {
    name: "Hall of Valor",
    totalTime: 30000,
    steps: [
      // Tap known building spots where Hall of Valor typically is
      { cmd: "tap:950,300", delay: 2000, desc: "Tap building spot 1" },
      { cmd: "tap:800,400", delay: 2000, desc: "Enter building" },
      // Hero summon tab → free summon
      { cmd: UI.TAB_HERO, delay: 2000, desc: "Hero Summon tab" },
      { cmd: UI.FREE_SUMMON_BTN, delay: 4000, desc: "Free Summon (Hero)" },
      { cmd: UI.CENTER, delay: 2000, desc: "Dismiss result" },
      // Skill summon tab → free summon
      { cmd: UI.TAB_SKILL, delay: 2000, desc: "Skill Summon tab" },
      { cmd: UI.FREE_SUMMON_BTN, delay: 4000, desc: "Free Summon (Skill)" },
      { cmd: UI.CENTER, delay: 2000, desc: "Dismiss result" },
      { cmd: UI.BACK_ARROW, delay: 2000, desc: "Exit Hall of Valor" },
    ],
  },

  // ── Prosperity (from task_prosperity.py) ──
  "Prosperity": {
    name: "Prosperity",
    totalTime: 10000,
    steps: [
      // Prosperity button is dynamic — try common positions
      { cmd: "tap:640,300", delay: 3000, desc: "Tap prosperity area" },
      { cmd: UI.OK_BTN, delay: 2000, desc: "OK / Collect" },
      { cmd: UI.BACK, delay: 1000, desc: "Back" },
    ],
  },

  // ── Rally Niflung ──
  "Rally Niflung": {
    name: "Rally Niflung",
    totalTime: 25000,
    steps: [
      { cmd: UI.WORLD_MAP, delay: 3000, desc: "Open world map" },
      { cmd: UI.MAGNIFY_ICON, delay: 2500, desc: "Open search panel" },
      { cmd: UI.NIFLUNG_CAT, delay: 2000, desc: "Select Niflung category" },
      { cmd: UI.NIFLUNG_SEARCH, delay: 5000, desc: "Search for Niflung" },
      { cmd: "tap:800,500", delay: 2500, desc: "Rally button" },
      { cmd: UI.CREATE_BTN, delay: 2500, desc: "Create rally" },
      { cmd: UI.NIFLUNG_MARCH, delay: 3500, desc: "Start rally" },
    ],
  },

  // ── Tribe Gifts ──
  "Tribe Gifts": {
    name: "Tribe Gifts",
    totalTime: 12000,
    steps: [
      { cmd: UI.ALLIANCE_BTN, delay: 3000, desc: "Open alliance" },
      { cmd: "swipe:900,675,400,675", delay: 2000, desc: "Swipe to find gifts" },
      { cmd: "tap:640,640", delay: 2000, desc: "Gifts tab" },
      { cmd: "tap:640,600", delay: 2000, desc: "Collect all gifts" },
      { cmd: UI.BACK, delay: 1000, desc: "Back" },
      { cmd: UI.BACK, delay: 1000, desc: "Back" },
    ],
  },

  // ── Alliance Help ──
  "Alliance Help": {
    name: "Alliance Help",
    totalTime: 10000,
    steps: [
      { cmd: UI.ALLIANCE_BTN, delay: 3000, desc: "Open alliance" },
      { cmd: "tap:900,400", delay: 2000, desc: "Help all" },
      { cmd: UI.BACK, delay: 1000, desc: "Back" },
      { cmd: UI.BACK, delay: 1000, desc: "Back" },
    ],
  },

  // ── Send Gifts ──
  "Send Gifts": {
    name: "Send Gifts",
    totalTime: 12000,
    steps: [
      { cmd: UI.ALLIANCE_BTN, delay: 3000, desc: "Open alliance" },
      { cmd: "swipe:900,675,400,675", delay: 2000, desc: "Swipe menu" },
      { cmd: "tap:640,640", delay: 2000, desc: "Gifts" },
      { cmd: "tap:900,500", delay: 2000, desc: "Send gift" },
      { cmd: UI.CENTER, delay: 1500, desc: "Confirm" },
      { cmd: UI.BACK, delay: 1000, desc: "Back" },
    ],
  },

  // ── Collect Farms ──
  "Collect Farms": {
    name: "Collect Farms",
    totalTime: 15000,
    steps: [
      { cmd: "tap:300,300", delay: 2000, desc: "Tap farm building" },
      { cmd: "tap:640,400", delay: 2000, desc: "Collect" },
      { cmd: UI.BACK, delay: 1000, desc: "Back" },
      { cmd: "tap:500,400", delay: 2000, desc: "Tap next farm" },
      { cmd: "tap:640,400", delay: 2000, desc: "Collect" },
      { cmd: UI.BACK, delay: 1000, desc: "Back" },
    ],
  },

  // ── Open Chests ──
  "Open Chests": {
    name: "Open Chests",
    totalTime: 10000,
    steps: [
      { cmd: "tap:50,300", delay: 2000, desc: "Tap free chest" },
      { cmd: UI.CENTER, delay: 2000, desc: "Open chest" },
      { cmd: UI.CENTER, delay: 2000, desc: "Confirm" },
      { cmd: UI.BACK, delay: 1000, desc: "Back" },
    ],
  },

  // ── Collect Free Items ──
  "Collect Free Items": {
    name: "Collect Free Items",
    totalTime: 10000,
    steps: [
      { cmd: "tap:50,300", delay: 2000, desc: "Tap free items area" },
      { cmd: "tap:640,400", delay: 2000, desc: "Collect" },
      { cmd: UI.CENTER, delay: 2000, desc: "Confirm" },
      { cmd: UI.BACK, delay: 1000, desc: "Back" },
    ],
  },

  // ── Building Upgrade ──
  "Building Upgrade": {
    name: "Building Upgrade",
    totalTime: 15000,
    steps: [
      { cmd: "tap:640,360", delay: 2000, desc: "Tap main building" },
      { cmd: "tap:640,550", delay: 2000, desc: "Upgrade button" },
      { cmd: "tap:900,600", delay: 2000, desc: "Confirm upgrade" },
      { cmd: UI.CENTER, delay: 2000, desc: "OK" },
      { cmd: UI.BACK, delay: 1000, desc: "Back" },
    ],
  },

  // ── Train Troops ──
  "Train Troops": {
    name: "Train Troops",
    totalTime: 15000,
    steps: [
      { cmd: "tap:400,500", delay: 2000, desc: "Tap barracks" },
      { cmd: "tap:640,500", delay: 2000, desc: "Train button" },
      { cmd: "tap:900,600", delay: 2000, desc: "Max troops" },
      { cmd: UI.CENTER, delay: 2000, desc: "Confirm training" },
      { cmd: UI.BACK, delay: 1000, desc: "Back" },
    ],
  },

  // ── Research Tech ──
  "Research Tech": {
    name: "Research Tech",
    totalTime: 15000,
    steps: [
      { cmd: "tap:640,300", delay: 2000, desc: "Tap academy" },
      { cmd: "tap:640,400", delay: 2000, desc: "Select tech" },
      { cmd: "tap:900,600", delay: 2000, desc: "Research button" },
      { cmd: UI.CENTER, delay: 2000, desc: "Confirm" },
      { cmd: UI.BACK, delay: 1000, desc: "Back" },
    ],
  },

  // ── Heal Wounded ──
  "Heal Wounded": {
    name: "Heal Wounded",
    totalTime: 12000,
    steps: [
      { cmd: "tap:800,400", delay: 2000, desc: "Tap hospital" },
      { cmd: "tap:640,500", delay: 2000, desc: "Heal all" },
      { cmd: UI.CENTER, delay: 2000, desc: "Confirm heal" },
      { cmd: UI.BACK, delay: 1000, desc: "Back" },
    ],
  },
};

export function getTaskSequence(taskName: string): TaskSequence | null {
  return TASK_MAP[taskName] || null;
}

export function getAllTaskNames(): string[] {
  return Object.keys(TASK_MAP);
}

export function getTaskMap(): Record<string, TaskSequence> {
  return TASK_MAP;
}
