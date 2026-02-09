import {
  TILE_SIZE_PX,
  DEFAULT_SIZE,
  GameState,
  GameRules
} from "./player-state.js";
import {
  Systems,
  DEFAULT_UNITS,
  DEFAULT_BUILDINGS,
  ensureDefs,
  spawnUnit,
  syncUnitsFromEntities,
  getBuildingAnchorsById,
  rebuildBuildingAnchorsFromMap,
  getResourceCap,
  assignHomelessToHuts,
  assignLumberWorkers,
  assignHunterWorkers,
  syncWorkplaceFoodState,
  resetHourAccumulator
} from "./player-systems.js";
import { createGameView } from "./player-view.js";

const canvas = document.getElementById("gameCanvas");
const jsonFileInput = document.getElementById("jsonFileInput");
const speedInput = document.getElementById("simSpeed");
const speedValue = document.getElementById("speedValue");
const buildModeInput = document.getElementById("buildMode");
const buildButtons = document.getElementById("buildButtons");
const buildValue = document.getElementById("buildValue");
const modeHint = document.getElementById("modeHint");
const resourceFadeInput = document.getElementById("resourceFade");
const resourceFadeValue = document.getElementById("resourceFadeValue");
const woodHud = document.getElementById("woodHud");
const foodHud = document.getElementById("foodHud");
const happyHud = document.getElementById("happyHud");
const popHud = document.getElementById("popHud");
const freeHud = document.getElementById("freeHud");
const hutHud = document.getElementById("hutHud");
const lumberHud = document.getElementById("lumberHud");
const tileInfo = document.getElementById("tileInfo");
const resourceInfo = document.getElementById("resourceInfo");
const qtyInfo = document.getElementById("qtyInfo");
const popInfo = document.getElementById("popInfo");
const stepInfo = document.getElementById("stepInfo");
const toggleSimButton = document.getElementById("toggleSim");

const RESOURCE_SPRITES = window.SPRITES?.RESOURCE_SPRITES || {};
const BUILDING_SPRITES = window.SPRITES?.BUILDING_SPRITES || {};

const SystemState = GameState.runtime.system;
SystemState.paused = false;
SystemState.speed = Number(speedInput.value);
SystemState.resourceFade = Number(resourceFadeInput.value);
SystemState.buildMode = "none";

const gameView = createGameView({
  canvas,
  tileSizePx: TILE_SIZE_PX,
  getResourceFade: () => SystemState.resourceFade,
  ui: {
    woodHud,
    foodHud,
    happyHud,
    popHud,
    freeHud,
    hutHud,
    lumberHud,
    tileInfo,
    resourceInfo,
    qtyInfo,
    popInfo,
    stepInfo,
    toggleSimButton
  }
});

    const recomputePopulation = (state) => {
      const units = state.runtime.unitEntities;
      let pop = units.length;
      let cap = 0;
      let used = 0;
      state.runtime.cityCenterIndex = -1;
      const buildings = state.map.buildings;
      const buildingDefs = state.defs.buildings;
      const owned = new Set();
      for (let i = 0; i < buildings.length; i += 1) {
        const idx = buildings[i];
        if (idx <= 0 || !buildingDefs[idx]) continue;
        const def = buildingDefs[idx];
        cap += def.popCap || 0;
        used += def.popUse || 0;
        owned.add(def.id);
        if (def.id === "tent") state.runtime.cityCenterIndex = i;
      }
      state.runtime.population = pop;
      state.runtime.populationCap = cap;
      const liveIds = new Set(state.runtime.unitEntities.map((u) => u.id));
      const staffed = Object.values(state.runtime.lumberWorkers || {}).reduce((sum, ids) => {
        if (!Array.isArray(ids)) return sum;
        return sum + ids.filter((id) => liveIds.has(id)).length;
      }, 0);
      const hunterStaffed = Object.values(state.runtime.hunterWorkers || {}).reduce((sum, ids) => {
        if (!Array.isArray(ids)) return sum;
        return sum + ids.filter((id) => liveIds.has(id)).length;
      }, 0);
      state.runtime.available = Math.max(0, pop - used - staffed - hunterStaffed);

      // unlock based on rules
      const unlocked = new Set(GameRules.build.startingBuildings || []);
      Object.entries(GameRules.build.prerequisites || {}).forEach(([buildingId, needs]) => {
        const reqs = Array.isArray(needs) ? needs : [];
        const ok = reqs.every((id) => owned.has(id));
        if (ok) unlocked.add(buildingId);
      });
      state.runtime.unlockedBuildings = unlocked;
    };

    const setBuildMode = (id) => {
      SystemState.buildMode = id || "none";
      buildModeInput.value = SystemState.buildMode;
      const def = GameState.defs.buildings.find((b) => b.id === SystemState.buildMode);
      buildValue.textContent = def ? (def.name_th || def.id) : "None";
      Array.from(buildButtons.querySelectorAll(".build-btn")).forEach((button) => {
        button.classList.toggle("active", button.dataset.buildId === SystemState.buildMode);
      });
      if (modeHint) {
        if (SystemState.buildMode === "none") modeHint.textContent = "เลือกอาคารจากปุ่มด้านบน แล้วคลิกบนแผนที่เพื่อสร้าง";
        else modeHint.textContent = `โหมดสร้าง: ${def ? (def.name_th || def.id) : SystemState.buildMode} - คลิกพื้นดินที่สูงกว่า 1 เพื่อวาง`;
      }
    };

    const refreshBuildOptions = () => {
      buildModeInput.innerHTML = "";
      buildButtons.innerHTML = "";
      const options = [{ id: "none", label: "None", def: null }];
      const order = ["tent", "hut", "lumberyard", "hunter", "storage"];
      order.forEach((id) => {
        const b = GameState.defs.buildings.find((item) => item.id === id);
        if (!b) return;
        if (!GameState.runtime.unlockedBuildings.has(b.id)) return;
        options.push({ id: b.id, label: b.name_th || b.id, def: b });
      });
      GameState.defs.buildings.forEach((b) => {
        if (b.id === "none") return;
        if (order.includes(b.id)) return;
        if (!GameState.runtime.unlockedBuildings.has(b.id)) return;
        options.push({ id: b.id, label: b.name_th || b.id, def: b });
      });

      options.forEach((opt) => {
        const option = document.createElement("option");
        option.value = opt.id;
        option.textContent = opt.label;
        buildModeInput.appendChild(option);
      });

      options.filter((o) => o.id !== "none").forEach((opt) => {
        const cost = GameRules.build.buildCosts[opt.id] || {};
        const wood = cost.wood || 0;
        const food = cost.food || 0;
        const workers = cost.workers || 0;
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "build-btn";
        btn.dataset.buildId = opt.id;
        btn.innerHTML = `<span>${opt.label}<br /><small>ไม้ ${wood} | อาหาร ${food} | คนงาน ${workers}</small></span><strong>${opt.def?.size?.w || 1}x${opt.def?.size?.h || 1}</strong>`;
        btn.addEventListener("click", () => setBuildMode(opt.id));
        buildButtons.appendChild(btn);
      });

      let nextMode = SystemState.buildMode;
      if (!options.some((o) => o.id === nextMode)) {
        nextMode = options.some((o) => o.id === "tent") ? "tent" : "none";
      }
      setBuildMode(nextMode);
      updateBuildButtonsState();
    };

    const updateBuildButtonsState = () => {
      Array.from(buildButtons.querySelectorAll(".build-btn")).forEach((button) => {
        const id = button.dataset.buildId;
        const cost = GameRules.build.buildCosts[id] || {};
        const workersNeed = cost.workers || 0;
        let disabled = false;
        if (GameState.runtime.available < workersNeed) disabled = true;
        if (id === "tent" && GameState.runtime.cityCenterIndex >= 0) disabled = true;
        button.disabled = disabled;
      });
    };

    const tryPlaceBuilding = (x, y) => {
      if (SystemState.buildMode === "none") return;
      const size = GameState.map.size;
      const buildingIndex = GameState.defs.buildings.findIndex((b) => b.id === SystemState.buildMode);
      if (buildingIndex <= 0) return;
      if (!GameState.runtime.unlockedBuildings.has(SystemState.buildMode)) return;
      const building = GameState.defs.buildings[buildingIndex];
      const w = building.size?.w || 1;
      const h = building.size?.h || 1;
      if (x + w > size || y + h > size) return;

      if (SystemState.buildMode === "tent" && GameState.runtime.cityCenterIndex >= 0) return;

      const cost = GameRules.build.buildCosts[SystemState.buildMode];
      if (cost) {
        const workersNeed = cost.workers || 0;
        if (GameState.runtime.available < workersNeed) return;
      }

      const footprint = [];
      for (let dy = 0; dy < h; dy += 1) {
        for (let dx = 0; dx < w; dx += 1) {
          const idx = (y + dy) * size + (x + dx);
          if (GameState.map.height[idx] <= 1) return;
          if (GameState.runtime.buildingAnchors[idx] !== -1) return;
          footprint.push(idx);
        }
      }

      const idx = y * size + x;

      if (SystemState.buildMode === "tent") {
        footprint.forEach((cell) => {
          GameState.runtime.buildingAnchors[cell] = idx;
        });
        GameState.map.buildings[idx] = buildingIndex;
        GameState.runtime.cityCenterIndex = idx;
        GameState.runtime.resources = { ...GameRules.build.startingResources };
        GameState.runtime.unitEntities = [];
        GameState.runtime.lumberWorkers = {};
        GameState.runtime.hunterWorkers = {};
        GameState.runtime.hunterFoodStock = {};
        GameState.runtime.resourceClaims = {};
        const spawnCount = Math.max(0, Number(GameRules.build.startingPopulation) || 0);
        for (let i = 0; i < spawnCount; i += 1) {
          spawnUnit(GameState, idx);
        }
        syncUnitsFromEntities(GameState);
      } else {
        footprint.forEach((cell) => {
          GameState.runtime.buildingAnchors[cell] = idx;
        });
        const site = {
          id: `site-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          buildingId: SystemState.buildMode,
          buildingIndex,
          anchorIndex: idx,
          x,
          y,
          w,
          h,
          requiredWorkers: Math.max(1, Number(cost?.workers) || 1),
          required: {
            wood: Math.max(0, Number(cost?.wood) || 0),
            food: Math.max(0, Number(cost?.food) || 0)
          },
          delivered: { wood: 0, food: 0 },
          progress: 0,
          active: false,
          footprint
        };
        GameState.runtime.buildingSites.push(site);
      }
      assignHomelessToHuts(GameState);
      recomputePopulation(GameState);
      refreshBuildOptions();
      updateHud();
    };

    const loadFromJson = (text) => {
      const data = JSON.parse(text);
      const world = data.world || data;
      const runtimeData = data.runtime || world.runtime || {};
      const size = world.size || DEFAULT_SIZE;
      const tileSizeM = world.tile_size_m || world.tileSizeM || 2;

      const height = new Int8Array(size * size);
      const resources = new Int16Array(size * size);
      const resourcesQty = new Int16Array(size * size);
      const roads = new Uint8Array(size * size);
      const units = new Int16Array(size * size);
      const buildings = new Int16Array(size * size);

      if (Array.isArray(world.data || world.height)) {
        const source = world.data || world.height;
        for (let i = 0; i < height.length; i += 1) height[i] = source[i] || 0;
      }

      if (world.resources) {
        const resData = world.resources.data || [];
        const qtyData = world.resources.qty || [];
        for (let i = 0; i < resources.length; i += 1) {
          resources[i] = resData[i] || 0;
          resourcesQty[i] = qtyData[i] || 0;
        }
      }

      if (world.roads && Array.isArray(world.roads.data)) {
        for (let i = 0; i < roads.length; i += 1) roads[i] = world.roads.data[i] || 0;
      }
      if (world.units && Array.isArray(world.units.data)) {
        for (let i = 0; i < units.length; i += 1) units[i] = world.units.data[i] || 0;
      }
      if (world.buildings && Array.isArray(world.buildings.data)) {
        for (let i = 0; i < buildings.length; i += 1) buildings[i] = world.buildings.data[i] || 0;
      }

      GameState.map = { size, tileSizeM, height, resources, resourcesQty, roads, units, buildings };
      GameState.defs.terrainLevels = world.levels || [];
      GameState.defs.resources = (world.resources && world.resources.defs) ? world.resources.defs.map((r) => ({
        ...r,
        category: r.category || (r.id && r.id.includes("ore") ? "mineral" : "flora"),
        sprite2d: r.sprite2d || RESOURCE_SPRITES[r.id]
      })) : [];
      GameState.defs.units = ensureDefs(world.units ? world.units.defs || [] : [], DEFAULT_UNITS);
      GameState.defs.buildings = ensureDefs(world.buildings ? world.buildings.defs || [] : [], DEFAULT_BUILDINGS)
        .map((b) => ({ ...b, sprite2d: b.sprite2d || BUILDING_SPRITES[b.id] }));

      const hasRuntime = Object.keys(runtimeData).length > 0;
      GameState.runtime.population = Number(runtimeData.population) || 0;
      GameState.runtime.populationCap = Number(runtimeData.populationCap) || 0;
      GameState.runtime.available = Number(runtimeData.available) || 0;
      GameState.runtime.steps = Number(runtimeData.steps) || 0;
      GameState.runtime.hour = Number.isFinite(runtimeData.hour) ? runtimeData.hour : 0;
      GameState.runtime.substep = Number.isFinite(runtimeData.substep) ? runtimeData.substep : 0;
      GameState.runtime.day = Number.isFinite(runtimeData.day) ? runtimeData.day : 1;
      GameState.runtime.week = Number.isFinite(runtimeData.week) ? runtimeData.week : 1;
      GameState.runtime.happiness = Number.isFinite(runtimeData.happiness) ? runtimeData.happiness : 50;
      GameState.runtime.happy = typeof runtimeData.happy === "boolean" ? runtimeData.happy : true;
      GameState.runtime.cityCenterIndex = Number.isFinite(runtimeData.cityCenterIndex) ? runtimeData.cityCenterIndex : -1;
      GameState.runtime.unlockedBuildings = new Set(Array.isArray(runtimeData.unlockedBuildings) ? runtimeData.unlockedBuildings : GameRules.build.startingBuildings);
      GameState.runtime.resources = runtimeData.resources ? { ...runtimeData.resources } : { ...GameRules.build.startingResources };
      Object.assign(
        GameState.runtime.system,
        runtimeData.system && typeof runtimeData.system === "object" ? runtimeData.system : {}
      );
      speedInput.value = String(SystemState.speed);
      speedValue.textContent = `${Number(SystemState.speed).toFixed(1)}x`;
      resourceFadeInput.value = String(SystemState.resourceFade);
      resourceFadeValue.textContent = Number(SystemState.resourceFade).toFixed(2);
      gameView.setPauseLabel(SystemState.paused);
      GameState.runtime.unitEntities = [];
      GameState.runtime.buildingSites = [];
      GameState.runtime.hutResidents = {};
      GameState.runtime.hutGrowth = {};
      GameState.runtime.lumberWorkers = {};
      GameState.runtime.walkable = new Uint8Array(size * size);
      GameState.runtime.hunterWorkers = runtimeData.hunterWorkers && typeof runtimeData.hunterWorkers === "object"
        ? { ...runtimeData.hunterWorkers }
        : {};
      GameState.runtime.resourceClaims = runtimeData.resourceClaims && typeof runtimeData.resourceClaims === "object"
        ? { ...runtimeData.resourceClaims }
        : {};
      GameState.runtime.workplaceFood = runtimeData.workplaceFood && typeof runtimeData.workplaceFood === "object"
        ? { ...runtimeData.workplaceFood }
        : {};
      GameState.runtime.hunterFoodStock = runtimeData.hunterFoodStock && typeof runtimeData.hunterFoodStock === "object"
        ? { ...runtimeData.hunterFoodStock }
        : {};
      GameState.runtime.depotQueues = {};
      GameState.runtime.lastWorkMealKey = typeof runtimeData.lastWorkMealKey === "string" ? runtimeData.lastWorkMealKey : "";
      resetHourAccumulator();
      GameState.runtime.buildingAnchors = new Int32Array(size * size);
      GameState.runtime.buildingAnchors.fill(-1);

      if (world.units && Array.isArray(world.units.data)) {
        for (let i = 0; i < units.length; i += 1) {
          if (units[i] > 0) {
            const x = i % size;
            const y = Math.floor(i / size);
            const entity = {
              id: `u${i}`,
              typeIndex: units[i],
              x: x + 0.5,
              y: y + 0.5,
              task: "idle",
              targetIndex: -1,
              arrived: false,
              wanderTime: 0,
              wanderTarget: null,
              gatherTimer: 0,
              carryFood: 0,
              carryWood: 0,
              job: "idle",
              workIndex: -1,
              homeIndex: -1,
              dailyTripPointsUsed: 0,
              dailyFoodGathered: 0,
              starvationDays: 0,
              starvationHours: 0,
              foodDebt: 0,
              tripCost: 0,
              siteId: null,
              carryType: null,
              carryAmount: 0,
              depotIndex: -1,
              workFoodTarget: -1,
              haulRole: null,
              haulTarget: -1,
              pathNodes: null,
              pathCursor: 0,
              pathGoalKey: ""
            };
            GameState.runtime.unitEntities.push(entity);
          }
        }
      }

      if (!hasRuntime && GameState.runtime.cityCenterIndex >= 0 && GameState.runtime.unitEntities.length === 0) {
        const spawnCount = Math.max(0, Number(GameRules.build.startingPopulation) || 0);
        for (let i = 0; i < spawnCount; i += 1) {
          spawnUnit(GameState, GameState.runtime.cityCenterIndex);
        }
      }
      rebuildBuildingAnchorsFromMap(GameState);
      Systems.hydrateFromLoadedState(GameState);
      recomputePopulation(GameState);
      refreshBuildOptions();
      updateHud();

      canvas.width = size * TILE_SIZE_PX;
      canvas.height = size * TILE_SIZE_PX;
      gameView.draw(GameState);
    };

    const countBuildingsById = (state, id) => getBuildingAnchorsById(state, id).length;

    const updateHud = () => {
      const woodCap = getResourceCap(GameState, "wood");
      const foodCap = getResourceCap(GameState, "food");
      gameView.updateHud({
        wood: `${GameState.runtime.resources.wood || 0}/${woodCap}`,
        food: `${GameState.runtime.resources.food || 0}/${foodCap}`,
        happy: `${Math.round(GameState.runtime.happiness || 0)}${GameState.runtime.happy ? "" : "!"}`,
        pop: `${GameState.runtime.population}/${GameState.runtime.populationCap}`,
        free: String(GameState.runtime.available || 0),
        hut: String(countBuildingsById(GameState, "hut")),
        lumber: String(countBuildingsById(GameState, "lumberyard"))
      });
      updateBuildButtonsState();
    };

    const createGameRootSystem = () => {
      const subSystems = [];
      return {
        add(system) {
          subSystems.push(system);
        },
        update(dt) {
          subSystems.forEach((system) => system.update(dt));
        }
      };
    };

    const GameRootSystem = createGameRootSystem();

    GameRootSystem.add({
      id: "simulation-system",
      update: (dt) => {
        if (!SystemState.paused) Systems.tick(GameState, dt * SystemState.speed);
      }
    });

    GameRootSystem.add({
      id: "population-system",
      update: () => {
        recomputePopulation(GameState);
      }
    });

    GameRootSystem.add({
      id: "render-system",
      update: () => {
        gameView.draw(GameState);
      }
    });

    GameRootSystem.add({
      id: "hud-system",
      update: () => {
        const minutesPerSubstep = Math.max(1, Math.min(60, Number(GameRules.time.minutesPerSubstep) || 10));
        const minute = ((Number(GameState.runtime.substep) || 0) * minutesPerSubstep) % 60;
        gameView.updateStatus({
          pop: `${GameState.runtime.population}/${GameState.runtime.populationCap}`,
          step: `W${GameState.runtime.week} D${GameState.runtime.day} H${String(GameState.runtime.hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
        });
        updateHud();
      }
    });

    const updateGameSystems = (dt) => {
      GameRootSystem.update(dt);
    };

    const loop = (() => {
      let lastTime = performance.now();
      return (time) => {
        const dt = (time - lastTime) / 1000;
        lastTime = time;
        updateGameSystems(dt);
        requestAnimationFrame(loop);
      };
    })();

    canvas.addEventListener("pointermove", (event) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = Math.floor((event.clientX - rect.left) * scaleX / TILE_SIZE_PX);
      const y = Math.floor((event.clientY - rect.top) * scaleY / TILE_SIZE_PX);
      if (x < 0 || y < 0 || x >= GameState.map.size || y >= GameState.map.size) return;
      const idx = y * GameState.map.size + x;
      const resIndex = GameState.map.resources[idx];
      if (resIndex > 0) {
        const def = GameState.defs.resources[resIndex - 1];
        gameView.updateTileInfo({
          position: `${x},${y}`,
          resource: def ? def.name_th || def.name_en : "?",
          qty: GameState.map.resourcesQty[idx] || 0
        });
      } else {
      gameView.updateTileInfo({
        position: `${x},${y}`,
        resource: "-",
        qty: "-"
      });
    }
    });

    canvas.addEventListener("pointerdown", (event) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = Math.floor((event.clientX - rect.left) * scaleX / TILE_SIZE_PX);
      const y = Math.floor((event.clientY - rect.top) * scaleY / TILE_SIZE_PX);
      if (x < 0 || y < 0 || x >= GameState.map.size || y >= GameState.map.size) return;
      tryPlaceBuilding(x, y);
      updateGameSystems(0);
    });

    document.getElementById("loadJson").addEventListener("click", () => {
      jsonFileInput.value = "";
      jsonFileInput.click();
    });

    const exportJson = () => {
      syncUnitsFromEntities(GameState);
      const runtime = {
        steps: GameState.runtime.steps,
        population: GameState.runtime.population,
        populationCap: GameState.runtime.populationCap,
        available: GameState.runtime.available,
        cityCenterIndex: GameState.runtime.cityCenterIndex,
        hour: GameState.runtime.hour,
        substep: GameState.runtime.substep,
        day: GameState.runtime.day,
        week: GameState.runtime.week,
        happiness: GameState.runtime.happiness,
        happy: GameState.runtime.happy,
        unlockedBuildings: Array.from(GameState.runtime.unlockedBuildings),
        resources: GameState.runtime.resources,
        hunterWorkers: GameState.runtime.hunterWorkers,
        resourceClaims: GameState.runtime.resourceClaims,
        workplaceFood: GameState.runtime.workplaceFood,
        hunterFoodStock: GameState.runtime.hunterFoodStock,
        lastWorkMealKey: GameState.runtime.lastWorkMealKey,
        system: GameState.runtime.system
      };
      const data = {
        meta: {
          version: "1.0",
          tile_size_m: GameState.map.tileSizeM
        },
        world: {
          size: GameState.map.size,
          levels: GameState.defs.terrainLevels,
          data: Array.from(GameState.map.height),
          resources: {
            defs: GameState.defs.resources,
            data: Array.from(GameState.map.resources),
            qty: Array.from(GameState.map.resourcesQty)
          },
          roads: { data: Array.from(GameState.map.roads) },
          units: { defs: GameState.defs.units, data: Array.from(GameState.map.units) },
          buildings: { defs: GameState.defs.buildings, data: Array.from(GameState.map.buildings) }
        },
        runtime
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "map.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    };

    document.getElementById("saveJson").addEventListener("click", exportJson);

    jsonFileInput.addEventListener("change", (event) => {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          loadFromJson(String(reader.result));
        } catch (err) {
          alert("อ่านไฟล์ JSON ไม่สำเร็จ");
        }
      };
      reader.readAsText(file);
    });

    toggleSimButton.addEventListener("click", () => {
      SystemState.paused = !SystemState.paused;
      gameView.setPauseLabel(SystemState.paused);
    });

    document.getElementById("stepSim").addEventListener("click", () => {
      Systems.tick(GameState, 1 / 60);
      updateGameSystems(0);
    });

    speedInput.addEventListener("input", (event) => {
      SystemState.speed = Number(event.target.value);
      speedValue.textContent = `${SystemState.speed.toFixed(1)}x`;
    });

    buildModeInput.addEventListener("change", (event) => {
      setBuildMode(event.target.value);
    });

    resourceFadeInput.addEventListener("input", (event) => {
      SystemState.resourceFade = Number(event.target.value);
      resourceFadeValue.textContent = SystemState.resourceFade.toFixed(2);
      updateGameSystems(0);
    });

    const defaultWorld = {
      size: DEFAULT_SIZE,
      tile_size_m: 2,
      levels: [
        { id: 0, name: "ปากน้ำ/ชายฝั่ง", height: 0, color: "#223a4d" },
        { id: 1, name: "หนอง/บึง/พรุ", height: 1, color: "#5aa6a9" },
        { id: 2, name: "ที่ราบลุ่ม/ทุ่ง", height: 2, color: "#8ac37c" },
        { id: 3, name: "ดอน/โคก/เนิน", height: 3, color: "#b5c07d" },
        { id: 4, name: "ที่ราบสูง", height: 4, color: "#d3b56a" },
        { id: 5, name: "ภูเขา/ดอย", height: 5, color: "#9f6a3f" }
      ],
      data: new Array(DEFAULT_SIZE * DEFAULT_SIZE).fill(2),
      resources: { defs: [], data: [], qty: [] },
      roads: { data: [] },
      units: { defs: [], data: [] },
      buildings: { defs: [], data: [] }
    };

    const applyRulesConfig = (rules) => {
      const buildingRules = rules.building_rules || rules.build_rules || {};
      const populationRules = rules.population_rules || {};
      const unitRules = rules.unit_rules || {};
      const happinessRules = rules.happiness_rules || {};
      const economyRules = rules.economy_rules || {};
      const timeRules = rules.time_rules || {};
      const storageRules = rules.storage_rules || {};
      const movementRules = unitRules.movement || rules.movement_rules || {};

      GameRules.build.startingBuildings = buildingRules.starting_buildings || GameRules.build.startingBuildings;
      GameRules.build.prerequisites = buildingRules.prerequisites || GameRules.build.prerequisites;
      GameRules.build.startingPopulation = Number(unitRules.starting_population || buildingRules.starting_population) || GameRules.build.startingPopulation;
      GameRules.build.startingResources = {
        ...GameRules.build.startingResources,
        ...(economyRules.starting_resources || buildingRules.starting_resources || {})
      };
      GameRules.build.buildCosts = buildingRules.build_costs || GameRules.build.buildCosts;

      GameRules.population.hutCapacity = Number(populationRules.hut_capacity) || GameRules.population.hutCapacity;
      GameRules.population.hutGrowthWeeks = Number(populationRules.hut_growth_weeks) || GameRules.population.hutGrowthWeeks;
      GameRules.population.foodPerPersonPerDay = Number(populationRules.food_per_person_per_day) || GameRules.population.foodPerPersonPerDay;
      GameRules.population.freeWorkerFoodGatherPerDay = Number(unitRules.free_worker_food_gather_per_day || populationRules.free_worker_food_gather_per_day) || GameRules.population.freeWorkerFoodGatherPerDay;
      GameRules.population.freeWorkerFoodCarryCap = Number(unitRules.free_worker_food_carry_cap || populationRules.free_worker_food_carry_cap) || GameRules.population.freeWorkerFoodCarryCap;
      GameRules.population.starvationWeeksToDie = Number(unitRules.starvation_weeks_to_die || populationRules.starvation_weeks_to_die) || GameRules.population.starvationWeeksToDie;

      GameRules.happiness.threshold = Number(happinessRules.threshold) || GameRules.happiness.threshold;
      GameRules.happiness.gainWhenFed = Number(happinessRules.gain_when_fed) || GameRules.happiness.gainWhenFed;
      GameRules.happiness.lossWhenStarving = Number(happinessRules.loss_when_starving) || GameRules.happiness.lossWhenStarving;

      GameRules.economy.lumberyardSteps = Number(economyRules.lumberyard_steps) || GameRules.economy.lumberyardSteps;
      GameRules.economy.lumberyardYield = Number(economyRules.lumberyard_yield) || GameRules.economy.lumberyardYield;
      GameRules.economy.lumberyardWorkers = Number(economyRules.lumberyard_workers) || GameRules.economy.lumberyardWorkers;
      GameRules.economy.workplaceMealsPerWorkerPerDay = Number(economyRules.workplace_meals_per_worker_per_day) || GameRules.economy.workplaceMealsPerWorkerPerDay;
      GameRules.economy.hunterWorkers = Number(economyRules.hunter_workers) || GameRules.economy.hunterWorkers;
      GameRules.economy.hunterFoodPerHunt = Number(economyRules.hunter_food_per_hunt) || GameRules.economy.hunterFoodPerHunt;
      GameRules.economy.hunterFoodPerDay = Number(economyRules.hunter_food_per_day) || GameRules.economy.hunterFoodPerDay;
      GameRules.economy.hunterHaulPerTrip = Number(economyRules.hunter_haul_per_trip) || GameRules.economy.hunterHaulPerTrip;
      GameRules.economy.hunterHutFoodCap = Number(economyRules.hunter_hut_food_cap) || GameRules.economy.hunterHutFoodCap;
      GameRules.economy.hunterStockBufferDays = Number(economyRules.hunter_stock_buffer_days) || GameRules.economy.hunterStockBufferDays;

      GameRules.time.hoursPerDay = Number(timeRules.hours_per_day) || GameRules.time.hoursPerDay;
      GameRules.time.daysPerWeek = Number(timeRules.days_per_week) || GameRules.time.daysPerWeek;
      GameRules.time.minutesPerSubstep = Number(timeRules.minutes_per_substep) || GameRules.time.minutesPerSubstep;
      GameRules.time.hourTickSeconds = Number(timeRules.hour_tick_seconds) || GameRules.time.hourTickSeconds;

      GameRules.storage.tentFoodCap = Number(storageRules.tent_food_cap) || GameRules.storage.tentFoodCap;
      GameRules.storage.tentWoodCap = Number(storageRules.tent_wood_cap) || GameRules.storage.tentWoodCap;
      GameRules.storage.storageFoodBonus = Number(storageRules.storage_food_bonus) || GameRules.storage.storageFoodBonus;
      GameRules.storage.storageWoodBonus = Number(storageRules.storage_wood_bonus) || GameRules.storage.storageWoodBonus;

      GameRules.movement.villagerWalkMetersPerHour = Number(movementRules.villager_walk_mph) || GameRules.movement.villagerWalkMetersPerHour;
      GameRules.movement.villagerWanderMetersPerHour = Number(movementRules.villager_wander_mph) || GameRules.movement.villagerWanderMetersPerHour;
      GameRules.movement.lumberjackWalkMetersPerHour = Number(movementRules.lumberjack_walk_mph) || GameRules.movement.lumberjackWalkMetersPerHour;
    };

    const loadRules = async () => {
      try {
        const res = await fetch("rules.json", { cache: "no-store" });
        if (!res.ok) throw new Error("rules not found");
        const rules = await res.json();
        applyRulesConfig(rules);
      } catch (err) {
        // fallback to defaults
      }
    };

    // bootstrap with rules + empty state
    loadRules().then(() => {
      loadFromJson(JSON.stringify(defaultWorld));
    });

    requestAnimationFrame(loop);
