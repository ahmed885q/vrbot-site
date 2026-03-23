/**
 * Viking Rise Task Sequences — maps task names → ADB command sequences
 *
 * Coordinate system: 1280x720 (landscape mode)
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
const UI = {
  // Bottom menu bar
  MAP:        "tap:71,647",
  CASTLE:     "tap:640,360",
  MAIL:       "tap:1210,647",
  REWARDS:    "tap:1140,647",
  ATTACK:     "tap:949,467",
  DEFENSE:    "tap:850,467",
  RESEARCH:   "tap:640,467",
  BUILD:      "tap:640,550",
  ALLIANCE:   "tap:71,467",

  // Common buttons
  BACK:       "key:BACK",
  HOME:       "key:HOME",
  CONFIRM:    "tap:640,550",
  COLLECT:    "tap:640,400",
  CLOSE_X:    "tap:1230,50",
  CENTER:     "tap:640,360",

  // Specific areas
  MAIL_REWARDS_TAB: "tap:400,100",
  MAIL_SYSTEM_TAB:  "tap:640,100",
  COLLECT_ALL:      "tap:640,600",
  TRIBE_TECH_BTN:   "tap:400,400",
  TRIBE_GIFTS_BTN:  "tap:640,400",
  HELP_ALL_BTN:     "tap:900,400",
  QUEST_BTN:        "tap:1230,300",
  QUEST_CLAIM:      "tap:1100,400",
  TRAIN_BTN:        "tap:640,500",
  HEAL_BTN:         "tap:800,500",
  FREE_CHEST:       "tap:50,300",
  PROSPERITY_BTN:   "tap:200,100",
};

// ── Task Definitions ──────────────────────────────────────────────

const TASK_MAP: Record<string, TaskSequence> = {

  "Gather Resources": {
    name: "Gather Resources",
    totalTime: 15000,
    steps: [
      { cmd: UI.MAP, delay: 2000, desc: "Open world map" },
      { cmd: "tap:400,300", delay: 1500, desc: "Tap resource area" },
      { cmd: "tap:640,500", delay: 1500, desc: "Tap gather button" },
      { cmd: UI.CONFIRM, delay: 1500, desc: "Confirm march" },
      { cmd: "tap:640,650", delay: 2000, desc: "Send march" },
      { cmd: UI.BACK, delay: 1000, desc: "Back" },
    ],
  },

  "Collect Farms": {
    name: "Collect Farms",
    totalTime: 10000,
    steps: [
      { cmd: UI.CASTLE, delay: 2000, desc: "Go to castle" },
      { cmd: "tap:300,300", delay: 1500, desc: "Tap farm building" },
      { cmd: UI.COLLECT, delay: 1500, desc: "Collect" },
      { cmd: UI.BACK, delay: 1000, desc: "Back" },
      { cmd: "tap:500,400", delay: 1500, desc: "Tap next farm" },
      { cmd: UI.COLLECT, delay: 1000, desc: "Collect" },
      { cmd: UI.BACK, delay: 1000, desc: "Back" },
    ],
  },

  "Open Chests": {
    name: "Open Chests",
    totalTime: 8000,
    steps: [
      { cmd: UI.FREE_CHEST, delay: 2000, desc: "Tap free chest" },
      { cmd: UI.CENTER, delay: 1500, desc: "Open chest" },
      { cmd: UI.CONFIRM, delay: 1500, desc: "Confirm" },
      { cmd: UI.BACK, delay: 1000, desc: "Back" },
    ],
  },

  "Collect Free Items": {
    name: "Collect Free Items",
    totalTime: 8000,
    steps: [
      { cmd: UI.FREE_CHEST, delay: 2000, desc: "Tap free items area" },
      { cmd: UI.COLLECT, delay: 1500, desc: "Collect" },
      { cmd: UI.CONFIRM, delay: 1500, desc: "Confirm" },
      { cmd: UI.BACK, delay: 1000, desc: "Back" },
    ],
  },

  "Kill Monster": {
    name: "Kill Monster",
    totalTime: 15000,
    steps: [
      { cmd: UI.MAP, delay: 2000, desc: "Open world map" },
      { cmd: "tap:900,200", delay: 1500, desc: "Find monster" },
      { cmd: UI.ATTACK, delay: 1500, desc: "Attack" },
      { cmd: UI.CONFIRM, delay: 1500, desc: "Confirm troops" },
      { cmd: "tap:640,650", delay: 2000, desc: "March" },
      { cmd: UI.BACK, delay: 1000, desc: "Back" },
    ],
  },

  "Hunt Niflung": {
    name: "Hunt Niflung",
    totalTime: 15000,
    steps: [
      { cmd: UI.MAP, delay: 2000, desc: "Open world map" },
      { cmd: "tap:200,500", delay: 2000, desc: "Find Niflung" },
      { cmd: UI.ATTACK, delay: 1500, desc: "Attack" },
      { cmd: UI.CONFIRM, delay: 1500, desc: "Confirm" },
      { cmd: "tap:640,650", delay: 2000, desc: "March" },
      { cmd: UI.BACK, delay: 1000, desc: "Back" },
    ],
  },

  "Rally Niflung": {
    name: "Rally Niflung",
    totalTime: 15000,
    steps: [
      { cmd: UI.MAP, delay: 2000, desc: "Open world map" },
      { cmd: "tap:200,500", delay: 2000, desc: "Find Niflung" },
      { cmd: "tap:800,500", delay: 1500, desc: "Rally button" },
      { cmd: UI.CONFIRM, delay: 1500, desc: "Confirm rally" },
      { cmd: "tap:640,650", delay: 2000, desc: "Start rally" },
      { cmd: UI.BACK, delay: 1000, desc: "Back" },
    ],
  },

  "Tribe Tech": {
    name: "Tribe Tech",
    totalTime: 10000,
    steps: [
      { cmd: UI.ALLIANCE, delay: 2000, desc: "Open alliance" },
      { cmd: UI.TRIBE_TECH_BTN, delay: 2000, desc: "Tribe Tech tab" },
      { cmd: "tap:640,500", delay: 1500, desc: "Donate/Contribute" },
      { cmd: UI.CONFIRM, delay: 1500, desc: "Confirm" },
      { cmd: UI.BACK, delay: 1000, desc: "Back" },
    ],
  },

  "Tribe Gifts": {
    name: "Tribe Gifts",
    totalTime: 10000,
    steps: [
      { cmd: UI.ALLIANCE, delay: 2000, desc: "Open alliance" },
      { cmd: UI.TRIBE_GIFTS_BTN, delay: 2000, desc: "Gifts tab" },
      { cmd: UI.COLLECT_ALL, delay: 1500, desc: "Collect all gifts" },
      { cmd: UI.BACK, delay: 1000, desc: "Back" },
      { cmd: UI.BACK, delay: 1000, desc: "Back" },
    ],
  },

  "Alliance Help": {
    name: "Alliance Help",
    totalTime: 8000,
    steps: [
      { cmd: UI.ALLIANCE, delay: 2000, desc: "Open alliance" },
      { cmd: UI.HELP_ALL_BTN, delay: 2000, desc: "Help all" },
      { cmd: UI.BACK, delay: 1000, desc: "Back" },
      { cmd: UI.BACK, delay: 1000, desc: "Back" },
    ],
  },

  "Send Gifts": {
    name: "Send Gifts",
    totalTime: 10000,
    steps: [
      { cmd: UI.ALLIANCE, delay: 2000, desc: "Open alliance" },
      { cmd: UI.TRIBE_GIFTS_BTN, delay: 2000, desc: "Gifts" },
      { cmd: "tap:900,500", delay: 1500, desc: "Send gift" },
      { cmd: UI.CONFIRM, delay: 1500, desc: "Confirm" },
      { cmd: UI.BACK, delay: 1000, desc: "Back" },
    ],
  },

  "Mail Rewards": {
    name: "Mail Rewards",
    totalTime: 10000,
    steps: [
      { cmd: UI.MAIL, delay: 2500, desc: "Open mail" },
      { cmd: UI.MAIL_REWARDS_TAB, delay: 1500, desc: "Rewards tab" },
      { cmd: UI.COLLECT_ALL, delay: 1500, desc: "Collect all" },
      { cmd: UI.BACK, delay: 1000, desc: "Back" },
      { cmd: UI.BACK, delay: 1000, desc: "Back" },
    ],
  },

  "Hall of Valor": {
    name: "Hall of Valor",
    totalTime: 10000,
    steps: [
      { cmd: UI.CASTLE, delay: 2000, desc: "Go to castle" },
      { cmd: "tap:900,300", delay: 2000, desc: "Hall of Valor building" },
      { cmd: UI.COLLECT, delay: 1500, desc: "Collect rewards" },
      { cmd: UI.CONFIRM, delay: 1500, desc: "Confirm" },
      { cmd: UI.BACK, delay: 1000, desc: "Back" },
    ],
  },

  "Prosperity": {
    name: "Prosperity",
    totalTime: 8000,
    steps: [
      { cmd: UI.PROSPERITY_BTN, delay: 2000, desc: "Open prosperity" },
      { cmd: UI.COLLECT, delay: 1500, desc: "Collect" },
      { cmd: UI.CONFIRM, delay: 1500, desc: "Confirm" },
      { cmd: UI.BACK, delay: 1000, desc: "Back" },
    ],
  },

  "Quest Rewards": {
    name: "Quest Rewards",
    totalTime: 10000,
    steps: [
      { cmd: UI.QUEST_BTN, delay: 2000, desc: "Open quests" },
      { cmd: UI.QUEST_CLAIM, delay: 1500, desc: "Claim reward" },
      { cmd: UI.QUEST_CLAIM, delay: 1500, desc: "Claim next" },
      { cmd: UI.QUEST_CLAIM, delay: 1500, desc: "Claim next" },
      { cmd: UI.BACK, delay: 1000, desc: "Back" },
    ],
  },

  "Building Upgrade": {
    name: "Building Upgrade",
    totalTime: 12000,
    steps: [
      { cmd: UI.CASTLE, delay: 2000, desc: "Go to castle" },
      { cmd: UI.BUILD, delay: 2000, desc: "Open build menu" },
      { cmd: "tap:640,300", delay: 1500, desc: "Select building" },
      { cmd: "tap:900,600", delay: 1500, desc: "Upgrade button" },
      { cmd: UI.CONFIRM, delay: 1500, desc: "Confirm upgrade" },
      { cmd: UI.BACK, delay: 1000, desc: "Back" },
    ],
  },

  "Train Troops": {
    name: "Train Troops",
    totalTime: 12000,
    steps: [
      { cmd: UI.CASTLE, delay: 2000, desc: "Go to castle" },
      { cmd: "tap:400,500", delay: 2000, desc: "Barracks" },
      { cmd: UI.TRAIN_BTN, delay: 1500, desc: "Train" },
      { cmd: "tap:900,600", delay: 1500, desc: "Max troops" },
      { cmd: UI.CONFIRM, delay: 1500, desc: "Confirm training" },
      { cmd: UI.BACK, delay: 1000, desc: "Back" },
    ],
  },

  "Research Tech": {
    name: "Research Tech",
    totalTime: 12000,
    steps: [
      { cmd: UI.CASTLE, delay: 2000, desc: "Go to castle" },
      { cmd: UI.RESEARCH, delay: 2000, desc: "Open research" },
      { cmd: "tap:640,400", delay: 1500, desc: "Select tech" },
      { cmd: "tap:900,600", delay: 1500, desc: "Research button" },
      { cmd: UI.CONFIRM, delay: 1500, desc: "Confirm" },
      { cmd: UI.BACK, delay: 1000, desc: "Back" },
    ],
  },

  "Heal Wounded": {
    name: "Heal Wounded",
    totalTime: 10000,
    steps: [
      { cmd: UI.CASTLE, delay: 2000, desc: "Go to castle" },
      { cmd: "tap:800,400", delay: 2000, desc: "Hospital" },
      { cmd: UI.HEAL_BTN, delay: 1500, desc: "Heal all" },
      { cmd: UI.CONFIRM, delay: 1500, desc: "Confirm heal" },
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
