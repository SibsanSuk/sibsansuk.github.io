const TILE_SIZE_PX = 8;
const DEFAULT_SIZE = 128;

const GameState = {
  map: {
    size: DEFAULT_SIZE,
    tileSizeM: 2,
    height: new Int8Array(DEFAULT_SIZE * DEFAULT_SIZE),
    resources: new Int16Array(DEFAULT_SIZE * DEFAULT_SIZE),
    resourcesQty: new Int16Array(DEFAULT_SIZE * DEFAULT_SIZE),
    roads: new Uint8Array(DEFAULT_SIZE * DEFAULT_SIZE),
    units: new Int16Array(DEFAULT_SIZE * DEFAULT_SIZE),
    buildings: new Int16Array(DEFAULT_SIZE * DEFAULT_SIZE)
  },
  defs: {
    terrainLevels: [],
    resources: [],
    units: [],
    buildings: []
  },
  runtime: {
    population: 0,
    populationCap: 0,
    available: 0,
    steps: 0,
    hour: 0,
    substep: 0,
    day: 1,
    week: 1,
    happiness: 50,
    happy: true,
    cityCenterIndex: -1,
    unlockedBuildings: new Set(),
    unitEntities: [],
    buildingSites: [],
    buildingAnchors: new Int32Array(DEFAULT_SIZE * DEFAULT_SIZE),
    hutResidents: {},
    hutGrowth: {},
    lumberWorkers: {},
    hunterWorkers: {},
    workplaceFood: {},
    hunterFoodStock: {},
    resourceClaims: {},
    depotQueues: {},
    walkable: new Uint8Array(DEFAULT_SIZE * DEFAULT_SIZE),
    lastWorkMealKey: "",
    system: {
      paused: false,
      speed: 1,
      resourceFade: 0.75,
      buildMode: "none"
    },
    resources: {
      wood: 0,
      food: 0
    }
  }
};

const GameRules = {
  // Runtime balance/config is loaded from rules.json by player-system.js.
  // Values here are internal fallbacks only.
  build: {
    startingBuildings: ["tent"],
    prerequisites: { hut: ["tent"], lumberyard: ["tent"], hunter: ["tent"], storage: ["tent"] },
    startingPopulation: 3,
    startingResources: { wood: 20, food: 0 },
    buildCosts: {
      hut: { wood: 10, workers: 1 },
      lumberyard: { wood: 8, workers: 1 },
      hunter: { wood: 10, workers: 1 },
      storage: { wood: 12, workers: 1 }
    }
  },
  population: {
    hutCapacity: 2,
    hutGrowthWeeks: 1,
    foodPerPersonPerDay: 3,
    freeWorkerFoodGatherPerDay: 4,
    freeWorkerFoodCarryCap: 6,
    starvationWeeksToDie: 4
  },
  happiness: {
    threshold: 50,
    gainWhenFed: 12,
    lossWhenStarving: 24
  },
  economy: {
    lumberyardSteps: 4,
    lumberyardYield: 1,
    lumberyardWorkers: 1,
    workplaceMealsPerWorkerPerDay: 3,
    hunterWorkers: 1,
    hunterFoodPerHunt: 1,
    hunterFoodPerDay: 12,
    hunterHaulPerTrip: 10,
    hunterHutFoodCap: 20,
    hunterStockBufferDays: 2
  },
  time: {
    hoursPerDay: 24,
    daysPerWeek: 7,
    minutesPerSubstep: 10,
    hourTickSeconds: 0.35
  },
  storage: {
    tentFoodCap: 20,
    tentWoodCap: 20,
    storageFoodBonus: 50,
    storageWoodBonus: 50
  },
  movement: {
    villagerWalkMetersPerHour: 72,
    villagerWanderMetersPerHour: 48,
    lumberjackWalkMetersPerHour: 64
  }
};

export {
  TILE_SIZE_PX,
  DEFAULT_SIZE,
  GameState,
  GameRules
};
