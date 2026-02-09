import { GameRules } from "./player-state.js";

let hourAccumulator = 0;

    const Systems = {
      tick(state, dt) {
        FRAME_SYSTEM_PIPELINE.forEach((systemFn) => systemFn(state, dt));
      },
      runSimulationSubstep(state, dt) {
        SUBSTEP_SYSTEM_PIPELINE.forEach((systemFn) => systemFn(state, dt));
      },
      updateWalkableLayer(state) {
        const size = state.map.size;
        const total = size * size;
        if (!(state.runtime.walkable instanceof Uint8Array) || state.runtime.walkable.length !== total) {
          state.runtime.walkable = new Uint8Array(total);
        }
        const walk = state.runtime.walkable;
        const height = state.map.height;
        const resources = state.map.resources;
        const defs = state.defs.resources;
        for (let i = 0; i < total; i += 1) {
          let passable = (height[i] || 0) > 1;
          if (passable && resources[i] > 0) {
            const def = defs[resources[i] - 1];
            if (isBlockingResource(def)) passable = false;
          }
          walk[i] = passable ? 1 : 0;
        }
      },
      resourceDecay(state, dt) {
        const qty = state.map.resourcesQty;
        for (let i = 0; i < qty.length; i += 1) {
          if (qty[i] <= 0) continue;
          if ((i + Math.floor(dt * 1000)) % 800 === 0) {
            qty[i] = Math.max(0, qty[i] - 1);
            if (qty[i] === 0) state.map.resources[i] = 0;
          }
        }
      },
      advanceTime(state, dt) {
        const hourTick = Math.max(0.05, Number(GameRules.time.hourTickSeconds) || 0.35);
        const minutesPerSubstep = Math.max(1, Math.min(60, Number(GameRules.time.minutesPerSubstep) || 10));
        const substepsPerHour = Math.max(1, Math.round(60 / minutesPerSubstep));
        const substepTick = hourTick / substepsPerHour;
        const hoursPerDay = Math.max(1, Number(GameRules.time.hoursPerDay) || 24);
        const daysPerWeek = Math.max(1, Number(GameRules.time.daysPerWeek) || 7);
        hourAccumulator += dt;
        while (hourAccumulator >= substepTick) {
          hourAccumulator -= substepTick;
          Systems.runSimulationSubstep(state, substepTick);
          state.runtime.substep = (Number(state.runtime.substep) || 0) + 1;
          if (state.runtime.substep >= substepsPerHour) {
            state.runtime.substep = 0;
            state.runtime.hour += 1;
            processHourlyFood(state);
            if (state.runtime.hour >= hoursPerDay) {
              state.runtime.hour = 0;
              state.runtime.day += 1;
              state.runtime.steps += 1;
              if (state.runtime.day > daysPerWeek) {
                state.runtime.day = 1;
                state.runtime.week += 1;
              }
              Systems.settlementStep(state);
            }
            processWorkplaceMealWindow(state);
          }
        }
      },
      settlementStep(state) {
        SETTLEMENT_SYSTEM_PIPELINE.forEach((systemFn) => systemFn(state));
      },
      hydrateFromLoadedState(state) {
        Systems.updateWalkableLayer(state);
        assignHomelessToHuts(state);
        assignLumberWorkers(state);
        assignHunterWorkers(state);
        syncWorkplaceFoodState(state);
        pruneResourceClaims(state);
        syncUnitsFromEntities(state);
      },
      unitForage(state, dt) {
        const size = state.map.size;
        const resources = state.map.resources;
        const qty = state.map.resourcesQty;
        const defs = state.defs.resources;
        const entities = state.runtime.unitEntities;
        const centerIndex = state.runtime.cityCenterIndex;
        const centerX = centerIndex >= 0 ? (centerIndex % size) + 0.5 : -1;
        const centerY = centerIndex >= 0 ? Math.floor(centerIndex / size) + 0.5 : -1;
        const villagerWalkSpeed = tilesPerSecondFromMetersPerHour(state, GameRules.movement.villagerWalkMetersPerHour);
        const villagerWanderSpeed = tilesPerSecondFromMetersPerHour(state, GameRules.movement.villagerWanderMetersPerHour);
        const lumberjackWalkSpeed = tilesPerSecondFromMetersPerHour(state, GameRules.movement.lumberjackWalkMetersPerHour);
        const allowPersonalForage = !hasPendingCityJobs(state);
        pruneResourceClaims(state);
        pruneDepotQueues(state);
        const claims = state.runtime.resourceClaims || {};
        const isClaimedByOther = (index, unitId) => {
          if (!Number.isFinite(index) || index < 0) return false;
          const owner = claims[String(index)];
          return Boolean(owner && owner !== unitId);
        };

        const isTargetValid = (entity, index) => {
          if (!Number.isFinite(index) || index < 0 || index >= resources.length) return false;
          if (resources[index] <= 0 || qty[index] <= 0) return false;
          if (isClaimedByOther(index, entity.id)) return false;
          const def = defs[resources[index] - 1];
          return isFoodResource(def);
        };

        entities.forEach((entity) => {
          if (entity.job === "builder" && entity.siteId) {
            releaseResourceClaim(state, entity);
            entity.targetIndex = -1;
            const site = getSiteById(state, entity.siteId);
            if (!site || site.active) {
              entity.job = "idle";
              entity.siteId = null;
            } else {
              const siteX = site.x + 0.5;
              const siteY = site.y + 0.5;
              const depotAnchors = getDepotAnchors(state);
              const builderSpeed = villagerWalkSpeed;

              const needsWood = Math.max(0, site.required.wood - site.delivered.wood);
              const needsFood = Math.max(0, site.required.food - site.delivered.food);
              if (!entity.carryType || entity.carryAmount <= 0) {
                let type = null;
                if (needsWood > 0) type = "wood";
                else if (needsFood > 0) type = "food";
                if (!type) {
                  entity.job = "idle";
                  entity.siteId = null;
                } else if (depotAnchors.length > 0) {
                  if (!Number.isFinite(entity.depotIndex) || entity.depotIndex < 0 || !depotAnchors.includes(entity.depotIndex)) {
                    let best = depotAnchors[0];
                    let bestDist = Number.POSITIVE_INFINITY;
                    depotAnchors.forEach((anchor) => {
                      const dx = (anchor % size) + 0.5 - entity.x;
                      const dy = Math.floor(anchor / size) + 0.5 - entity.y;
                      const d2 = dx * dx + dy * dy;
                      if (d2 < bestDist) {
                        bestDist = d2;
                        best = anchor;
                      }
                    });
                    entity.depotIndex = best;
                  }
                  const depotX = (entity.depotIndex % size) + 0.5;
                  const depotY = Math.floor(entity.depotIndex / size) + 0.5;
                  const remain = PathfindingSystem.moveEntityTowards(state, entity, depotX, depotY, builderSpeed, dt);
                  if (remain <= 0.5) {
                    const got = withdrawResource(state, type, 1);
                    if (got > 0) {
                      entity.carryType = type;
                      entity.carryAmount = got;
                    } else {
                      entity.job = "idle";
                      entity.siteId = null;
                    }
                  }
                }
              } else {
                const remain = PathfindingSystem.moveEntityTowards(state, entity, siteX, siteY, builderSpeed, dt);
                if (remain <= 0.6) {
                  if (entity.carryType === "wood") site.delivered.wood += entity.carryAmount;
                  if (entity.carryType === "food") site.delivered.food += entity.carryAmount;
                  entity.carryType = null;
                  entity.carryAmount = 0;
                  const totalNeed = Math.max(1, site.required.wood + site.required.food);
                  const totalDone = Math.min(totalNeed, site.delivered.wood + site.delivered.food);
                  site.progress = Math.min(1, totalDone / totalNeed);
                  if (site.progress >= 1) {
                    site.active = true;
                    const anchor = site.anchorIndex;
                    state.map.buildings[anchor] = site.buildingIndex;
                    site.footprint.forEach((idx) => {
                      state.runtime.buildingAnchors[idx] = anchor;
                    });
                    entity.job = "idle";
                    entity.siteId = null;
                  }
                }
              }
              return;
            }
          }

          if (entity.job === "lumberjack") {
            const lumberIndex = Number.isFinite(entity.workIndex) ? entity.workIndex : -1;
            const workX = lumberIndex >= 0 ? (lumberIndex % size) + 0.5 : entity.x;
            const workY = lumberIndex >= 0 ? Math.floor(lumberIndex / size) + 0.5 : entity.y;
            const canWork = lumberIndex >= 0 ? isWorkplaceFedForCurrentMeal(state, lumberIndex) : false;
            const woodTargetValid = (index) => {
              if (!Number.isFinite(index) || index < 0 || index >= resources.length) return false;
              if (resources[index] <= 0 || qty[index] <= 0) return false;
              if (isClaimedByOther(index, entity.id)) return false;
              const def = defs[resources[index] - 1];
              return isWoodResource(def);
            };

            if (!canWork) {
              releaseResourceClaim(state, entity);
              entity.targetIndex = -1;
              entity.task = "wait_food";
              entity.gatherTimer = 0;
              const distToWork = distance(entity.x, entity.y, workX, workY);
              if (distToWork > 1.2) PathfindingSystem.moveEntityTowards(state, entity, workX, workY, lumberjackWalkSpeed, dt);
              return;
            }

            if ((entity.carryWood || 0) > 0) {
              releaseResourceClaim(state, entity);
              entity.targetIndex = -1;
              entity.task = "return_wood";
              const remain = PathfindingSystem.moveEntityTowards(state, entity, workX, workY, lumberjackWalkSpeed, dt);
              if (remain <= 0.5) {
                depositResource(state, "wood", entity.carryWood);
                entity.carryWood = 0;
                entity.task = "seek_wood";
              }
              return;
            }

            if (!woodTargetValid(entity.targetIndex)) {
              releaseResourceClaim(state, entity);
              // Lumberyard workers should prioritize trees nearest to their own yard first.
              let candidate = -1;
              for (let r = 6; r <= 24; r += 6) {
                candidate = findNearestResourceBy(workX, workY, state, r, isWoodResource, entity.id);
                if (candidate >= 0) break;
              }
              entity.targetIndex = claimResourceIndex(state, entity, candidate) ? candidate : -1;
              entity.task = entity.targetIndex >= 0 ? "seek_wood" : "idle";
            }

            if (entity.targetIndex >= 0) {
              const tx = (entity.targetIndex % size) + 0.5;
              const ty = Math.floor(entity.targetIndex / size) + 0.5;
              const beforeDist = distance(entity.x, entity.y, tx, ty);
              const dist = PathfindingSystem.moveEntityTowards(state, entity, tx, ty, lumberjackWalkSpeed, dt);
              if (dist <= 1.1) {
                entity.task = "harvest_wood";
                const toReach = Math.max(0, (beforeDist - 1.1) / Math.max(0.0001, lumberjackWalkSpeed));
                const gatherDt = beforeDist <= 1.1 ? dt : Math.max(0, dt - toReach);
                entity.gatherTimer = (entity.gatherTimer || 0) + gatherDt;
                if (entity.gatherTimer >= 1.2) {
                  entity.gatherTimer = 0;
                  qty[entity.targetIndex] = Math.max(0, qty[entity.targetIndex] - 1);
                  entity.carryWood = Math.max(1, Number(GameRules.economy.lumberyardYield) || 1);
                  if (qty[entity.targetIndex] === 0) resources[entity.targetIndex] = 0;
                  releaseResourceClaim(state, entity);
                  entity.targetIndex = -1;
                  entity.task = "return_wood";
                }
              } else if (entity.task !== "harvest_wood") {
                entity.gatherTimer = 0;
                entity.task = "seek_wood";
              }
            } else {
              entity.gatherTimer = 0;
              const distToWork = distance(entity.x, entity.y, workX, workY);
              if (distToWork > 2.5) PathfindingSystem.moveEntityTowards(state, entity, workX, workY, lumberjackWalkSpeed, dt);
            }
            return;
          }

          if (entity.job === "hunter") {
            const hunterIndex = Number.isFinite(entity.workIndex) ? entity.workIndex : -1;
            const workX = hunterIndex >= 0 ? (hunterIndex % size) + 0.5 : entity.x;
            const workY = hunterIndex >= 0 ? Math.floor(hunterIndex / size) + 0.5 : entity.y;
            const stock = hunterIndex >= 0 ? getHunterStockForAnchor(state, hunterIndex) : 0;
            const cap = hunterIndex >= 0 ? getHunterStockCapForAnchor(state, hunterIndex) : 0;
            const gameTargetValid = (index) => {
              if (!Number.isFinite(index) || index < 0 || index >= resources.length) return false;
              if (resources[index] <= 0 || qty[index] <= 0) return false;
              if (isClaimedByOther(index, entity.id)) return false;
              const def = defs[resources[index] - 1];
              return isGameResource(def);
            };

            if ((entity.carryFood || 0) > 0 && hunterIndex >= 0) {
              entity.task = "return_hunter";
              releaseResourceClaim(state, entity);
              entity.targetIndex = -1;
              const remain = PathfindingSystem.moveEntityTowards(state, entity, workX, workY, villagerWalkSpeed, dt);
              if (remain <= 0.6) {
                const key = String(hunterIndex);
                const current = Math.max(0, Number(state.runtime.hunterFoodStock?.[key]) || 0);
                const accepted = Math.max(0, Math.min(entity.carryFood, cap - current));
                if (accepted > 0) {
                  state.runtime.hunterFoodStock[key] = current + accepted;
                  entity.carryFood -= accepted;
                }
                if ((entity.carryFood || 0) <= 0) {
                  entity.carryFood = 0;
                  entity.task = "hunt";
                } else {
                  entity.task = "wait_haul";
                }
              }
              return;
            }

            if (stock >= cap && cap > 0) {
              entity.task = "wait_haul";
              entity.gatherTimer = 0;
              releaseResourceClaim(state, entity);
              entity.targetIndex = -1;
              const distToWork = distance(entity.x, entity.y, workX, workY);
              if (distToWork > 1.2) PathfindingSystem.moveEntityTowards(state, entity, workX, workY, villagerWalkSpeed, dt);
              return;
            }

            if (!gameTargetValid(entity.targetIndex)) {
              releaseResourceClaim(state, entity);
              let target = -1;
              for (let r = 6; r <= 24; r += 6) {
                const candidate = findNearestResourceBy(workX, workY, state, r, isGameResource, entity.id);
                if (candidate < 0) continue;
                if (!claimResourceIndex(state, entity, candidate)) continue;
                target = candidate;
                break;
              }
              entity.targetIndex = target;
            }

            if (entity.targetIndex >= 0) {
              const tx = (entity.targetIndex % size) + 0.5;
              const ty = Math.floor(entity.targetIndex / size) + 0.5;
              entity.task = "seek_game";
              const beforeDist = distance(entity.x, entity.y, tx, ty);
              const dist = PathfindingSystem.moveEntityTowards(state, entity, tx, ty, villagerWalkSpeed, dt);
              if (dist <= 1.1) {
                entity.task = "hunt";
                const toReach = Math.max(0, (beforeDist - 1.1) / Math.max(0.0001, villagerWalkSpeed));
                const gatherDt = beforeDist <= 1.1 ? dt : Math.max(0, dt - toReach);
                entity.gatherTimer = (entity.gatherTimer || 0) + gatherDt;
                if (entity.gatherTimer >= 1.2) {
                  entity.gatherTimer = 0;
                  qty[entity.targetIndex] = Math.max(0, qty[entity.targetIndex] - 1);
                  if (qty[entity.targetIndex] === 0) resources[entity.targetIndex] = 0;
                  entity.carryFood = (entity.carryFood || 0) + Math.max(1, Number(GameRules.economy.hunterFoodPerHunt) || 1);
                  releaseResourceClaim(state, entity);
                  entity.targetIndex = -1;
                  entity.task = "return_hunter";
                }
              }
            } else {
              entity.task = "hunt";
              entity.gatherTimer = 0;
              const distToWork = distance(entity.x, entity.y, workX, workY);
              if (distToWork > 1.2) PathfindingSystem.moveEntityTowards(state, entity, workX, workY, villagerWalkSpeed, dt);
            }
            return;
          }

          if (entity.job === "idle" && entity.haulRole === "workplace_food" && Number.isFinite(entity.haulTarget) && entity.haulTarget >= 0) {
            releaseResourceClaim(state, entity);
            entity.targetIndex = -1;
            const target = Number(entity.haulTarget);
            const site = state.runtime.workplaceFood?.[String(target)];
            const need = site ? Math.max(0, (Number(site.cap) || 0) - (Number(site.stock) || 0)) : 0;
            if (need <= 0) {
              clearHaulAssignment(entity);
              if (entity.workFoodTarget === target) entity.workFoodTarget = -1;
            } else if ((entity.carryFood || 0) > 0) {
              entity.workFoodTarget = target;
            } else if ((state.runtime.resources.food || 0) > 0) {
              if (!Number.isFinite(entity.depotIndex) || entity.depotIndex < 0) {
                entity.depotIndex = getNearestDepotAnchor(state, entity.x, entity.y);
              }
              if (entity.depotIndex >= 0) {
                const depotX = (entity.depotIndex % size) + 0.5;
                const depotY = Math.floor(entity.depotIndex / size) + 0.5;
                entity.task = "pickup_work_food";
                const remain = PathfindingSystem.moveEntityTowards(state, entity, depotX, depotY, villagerWalkSpeed, dt);
                if (remain <= 0.5) {
                  const got = withdrawResource(state, "food", Math.max(1, need));
                  if (got > 0) {
                    entity.carryFood = got;
                    entity.workFoodTarget = target;
                    entity.task = "deliver_work_food";
                  } else {
                    clearHaulAssignment(entity);
                    entity.task = "idle";
                  }
                }
                return;
              }
            } else {
              clearHaulAssignment(entity);
            }
          }

          if (entity.job === "idle" && entity.haulRole === "hunter_haul" && Number.isFinite(entity.haulTarget) && entity.haulTarget >= 0) {
            releaseResourceClaim(state, entity);
            entity.targetIndex = -1;
            const source = Number(entity.haulTarget);
            if ((entity.carryFood || 0) > 0) {
              clearHaulAssignment(entity);
            } else {
              const stock = getHunterStockForAnchor(state, source);
              const hasDepot = getDepotAnchors(state).length > 0;
              const foodSpace = Math.max(0, getResourceCap(state, "food") - (state.runtime.resources.food || 0));
              if (stock <= 0 || !hasDepot || foodSpace <= 0) {
                clearHaulAssignment(entity);
              } else {
                const hx = (source % size) + 0.5;
                const hy = Math.floor(source / size) + 0.5;
                entity.task = "pickup_hunter_food";
                const remain = PathfindingSystem.moveEntityTowards(state, entity, hx, hy, villagerWalkSpeed, dt);
                if (remain <= 0.6) {
                  const haulCap = Math.max(1, Number(GameRules.economy.hunterHaulPerTrip) || 12);
                  const maxTake = Math.max(0, Math.min(haulCap, foodSpace));
                  const got = withdrawHunterFood(state, source, maxTake);
                  if (got > 0) {
                    entity.carryFood = got;
                    clearHaulAssignment(entity);
                    entity.task = "return_food";
                  } else {
                    clearHaulAssignment(entity);
                    entity.task = "idle";
                  }
                }
                return;
              }
            }
          }

          if (entity.task !== "harvest_food") entity.gatherTimer = 0;

          if ((entity.carryFood || 0) > 0 && Number.isFinite(entity.workFoodTarget) && entity.workFoodTarget >= 0) {
            releaseResourceClaim(state, entity);
            entity.targetIndex = -1;
            const target = entity.workFoodTarget;
            const tx = (target % size) + 0.5;
            const ty = Math.floor(target / size) + 0.5;
            entity.task = "deliver_work_food";
            const remain = PathfindingSystem.moveEntityTowards(state, entity, tx, ty, villagerWalkSpeed, dt);
            if (remain <= 0.6) {
              const delivered = depositWorkplaceFood(state, target, entity.carryFood);
              entity.carryFood -= delivered;
              if (entity.carryFood > 0) depositResource(state, "food", entity.carryFood);
              entity.carryFood = 0;
              entity.workFoodTarget = -1;
              entity.task = "idle";
            }
            return;
          }

          if ((entity.carryFood || 0) <= 0 && (!Number.isFinite(entity.workFoodTarget) || entity.workFoodTarget < 0)) {
            const workplaceNeed = findNearestHungryWorkplace(state, entity.x, entity.y);
            if (workplaceNeed >= 0 && (state.runtime.resources.food || 0) > 0) {
              releaseResourceClaim(state, entity);
              entity.targetIndex = -1;
              if (!Number.isFinite(entity.depotIndex) || entity.depotIndex < 0) {
                entity.depotIndex = getNearestDepotAnchor(state, entity.x, entity.y);
              }
              if (entity.depotIndex >= 0) {
                const depotX = (entity.depotIndex % size) + 0.5;
                const depotY = Math.floor(entity.depotIndex / size) + 0.5;
                entity.task = "pickup_work_food";
                const remain = PathfindingSystem.moveEntityTowards(state, entity, depotX, depotY, villagerWalkSpeed, dt);
                if (remain <= 0.5) {
                  const got = withdrawResource(state, "food", 1);
                  if (got > 0) {
                    entity.carryFood = got;
                    entity.workFoodTarget = workplaceNeed;
                    entity.targetIndex = -1;
                    entity.task = "deliver_work_food";
                  } else {
                    entity.task = "idle";
                  }
                }
                return;
              }
            }
          }

          // Hunter pickup is assignment-driven (haulRole === "hunter_haul") to avoid crowding.

          const gatheredToday = Number(entity.dailyFoodGathered) || 0;
          const gatherCap = Math.max(0, Number(GameRules.population.freeWorkerFoodGatherPerDay) || 4);
          const canHuntToday = gatheredToday < gatherCap;
          const carryCap = Math.max(1, Number(GameRules.population.freeWorkerFoodCarryCap) || 6);

          if ((entity.carryFood || 0) > 0 && ((entity.carryFood || 0) >= carryCap || !canHuntToday || !allowPersonalForage)) {
            releaseResourceClaim(state, entity);
            entity.task = "return_food";
            entity.targetIndex = -1;
            const foodSpace = Math.max(0, getResourceCap(state, "food") - (state.runtime.resources.food || 0));
            if (foodSpace <= 0 && (!Number.isFinite(entity.workFoodTarget) || entity.workFoodTarget < 0)) {
              const workplaceNeed = findNearestHungryWorkplace(state, entity.x, entity.y);
              if (workplaceNeed >= 0) {
                entity.workFoodTarget = workplaceNeed;
                entity.task = "deliver_work_food";
              }
            }
            if (Number.isFinite(entity.workFoodTarget) && entity.workFoodTarget >= 0) {
              const target = entity.workFoodTarget;
              const tx = (target % size) + 0.5;
              const ty = Math.floor(target / size) + 0.5;
              const remain = PathfindingSystem.moveEntityTowards(state, entity, tx, ty, villagerWalkSpeed, dt);
              if (remain <= 0.6) {
                const delivered = depositWorkplaceFood(state, target, entity.carryFood);
                entity.carryFood -= delivered;
                entity.workFoodTarget = -1;
                if (entity.carryFood <= 0) {
                  entity.carryFood = 0;
                  entity.task = "idle";
                  return;
                }
              } else {
                return;
              }
            }
            if (!Number.isFinite(entity.depotIndex) || entity.depotIndex < 0) {
              entity.depotIndex = getNearestDepotAnchor(state, entity.x, entity.y);
            }
            if (entity.depotIndex >= 0) {
              const depotAnchor = entity.depotIndex;
              const depotX = (depotAnchor % size) + 0.5;
              const depotY = Math.floor(depotAnchor / size) + 0.5;
              const distToDepot = distance(entity.x, entity.y, depotX, depotY);
              if (distToDepot <= 2.2 || getDepotQueuePosition(state, depotAnchor, entity.id) >= 0) {
                enqueueDepotQueue(state, depotAnchor, entity.id);
              }
              const queuePos = getDepotQueuePosition(state, depotAnchor, entity.id);
              if (queuePos > 0) {
                entity.task = "queue_depot";
                const slot = (queuePos - 1) % 8;
                const ring = Math.floor((queuePos - 1) / 8);
                const angle = (Math.PI * 2 * slot) / 8;
                const radius = 1.0 + ring * 0.6;
                const waitX = Math.max(0.5, Math.min(size - 0.5, depotX + Math.cos(angle) * radius));
                const waitY = Math.max(0.5, Math.min(size - 0.5, depotY + Math.sin(angle) * radius));
                PathfindingSystem.moveEntityTowards(state, entity, waitX, waitY, villagerWalkSpeed, dt);
                return;
              }
              entity.task = "return_food";
              const remain = PathfindingSystem.moveEntityTowards(state, entity, depotX, depotY, villagerWalkSpeed, dt);
              if (remain <= 0.5) {
                depositResource(state, "food", entity.carryFood);
                entity.carryFood = 0;
                leaveDepotQueue(state, depotAnchor, entity.id);
                entity.task = "idle";
              }
            } else if (centerIndex >= 0) {
              leaveDepotQueue(state, entity.depotIndex, entity.id);
              const remain = PathfindingSystem.moveEntityTowards(state, entity, centerX, centerY, villagerWalkSpeed, dt);
              if (remain <= 0.5) {
                depositResource(state, "food", entity.carryFood);
                entity.carryFood = 0;
                entity.task = "idle";
              }
            } else {
              leaveDepotQueue(state, entity.depotIndex, entity.id);
              entity.task = "idle";
            }
            return;
          }

          const needsTarget = !isTargetValid(entity, entity.targetIndex);
          if (!allowPersonalForage) {
            releaseResourceClaim(state, entity);
            entity.targetIndex = -1;
            entity.gatherTimer = 0;
            entity.task = "idle";
            const depot = getNearestDepotAnchor(state, entity.x, entity.y);
            if (depot >= 0) {
              const dx = (depot % size) + 0.5;
              const dy = Math.floor(depot / size) + 0.5;
              const remain = PathfindingSystem.moveEntityTowards(state, entity, dx, dy, villagerWalkSpeed, dt);
              if (remain <= 1.2) {
                entity.wanderTarget = null;
                entity.wanderTime = 0;
              }
            }
            return;
          }
          if (needsTarget) {
            releaseResourceClaim(state, entity);
            entity.tripCost = 0;
            if (canHuntToday) {
              let target = -1;
              const depot = getNearestDepotAnchor(state, entity.x, entity.y);
              const sx = depot >= 0 ? (depot % size) + 0.5 : entity.x;
              const sy = depot >= 0 ? Math.floor(depot / size) + 0.5 : entity.y;
              for (let r = 6; r <= 24; r += 6) {
                const candidate = findNearestResourceBy(sx, sy, state, r, isFoodResource, entity.id);
                if (candidate < 0) continue;
                if (!claimResourceIndex(state, entity, candidate)) continue;
                target = candidate;
                break;
              }
              entity.targetIndex = target;
            } else {
              entity.targetIndex = -1;
            }
            entity.task = entity.targetIndex >= 0 ? "seek_food" : "idle";
            entity.arrived = false;
          }

          if ((entity.carryFood || 0) > 0 && entity.targetIndex < 0) {
            entity.task = "return_food";
          }

          if (entity.targetIndex >= 0) {
            const tx = (entity.targetIndex % size) + 0.5;
            const ty = Math.floor(entity.targetIndex / size) + 0.5;
            const beforeDist = distance(entity.x, entity.y, tx, ty);
            const dist = PathfindingSystem.moveEntityTowards(state, entity, tx, ty, villagerWalkSpeed, dt);
            if (dist <= 1.1) {
              entity.task = "harvest_food";
              const toReach = Math.max(0, (beforeDist - 1.1) / Math.max(0.0001, villagerWalkSpeed));
              const gatherDt = beforeDist <= 1.1 ? dt : Math.max(0, dt - toReach);
              entity.gatherTimer += gatherDt;
              if (entity.gatherTimer >= 1.1) {
                entity.gatherTimer = 0;
                qty[entity.targetIndex] = Math.max(0, qty[entity.targetIndex] - 1);
                entity.carryFood = (entity.carryFood || 0) + 1;
                entity.dailyFoodGathered = (Number(entity.dailyFoodGathered) || 0) + 1;
                entity.tripCost = 0;
                if (qty[entity.targetIndex] === 0) {
                  resources[entity.targetIndex] = 0;
                }
                releaseResourceClaim(state, entity);
                entity.targetIndex = -1;
                entity.task = ((entity.carryFood || 0) >= carryCap || !canHuntToday || !allowPersonalForage) ? "return_food" : "seek_food";
              }
            } else {
              entity.task = "seek_food";
            }
          } else {
            if (!entity.wanderTarget || entity.wanderTime <= 0 || distance(entity.x, entity.y, entity.wanderTarget.x, entity.wanderTarget.y) < 0.3) {
              entity.wanderTime = 0.8 + Math.random() * 1.5;
              const wx = Math.max(0.5, Math.min(size - 0.5, entity.x + (Math.random() * 10 - 5)));
              const wy = Math.max(0.5, Math.min(size - 0.5, entity.y + (Math.random() * 10 - 5)));
              entity.wanderTarget = { x: wx, y: wy };
            }
            entity.wanderTime -= dt;
            PathfindingSystem.moveEntityTowards(state, entity, entity.wanderTarget.x, entity.wanderTarget.y, villagerWanderSpeed, dt);
          }
        });

        syncUnitsFromEntities(state);
      }
    };

    // System pipelines define authoritative mutation order for the in-memory model.
    const FRAME_SYSTEM_PIPELINE = [
      (state, dt) => Systems.resourceDecay(state, dt),
      (state) => Systems.updateWalkableLayer(state),
      (state, dt) => Systems.advanceTime(state, dt)
    ];

    const SUBSTEP_SYSTEM_PIPELINE = [
      (state) => assignLumberWorkers(state),
      (state) => assignHunterWorkers(state),
      (state) => assignBuildersToSites(state),
      (state) => assignHaulWorkers(state),
      (state, dt) => Systems.unitForage(state, dt)
    ];

    const SETTLEMENT_SYSTEM_PIPELINE = [
      (state) => assignHomelessToHuts(state),
      (state) => assignLumberWorkers(state),
      (state) => assignHunterWorkers(state),
      (state) => syncWorkplaceFoodState(state),
      (state) => resetDailyTripBudget(state),
      (state) => processHunterProduction(state),
      (state) => processWeeklyPopulationGrowth(state),
      (state) => clampResourceStock(state)
    ];

    const DEFAULT_UNITS = [
      { id: "none", name_th: "None", color: "#1c1f1d" },
      { id: "villager", name_th: "ชาวบ้าน", color: "#c96a5a" },
      { id: "worker", name_th: "แรงงาน", color: "#b46c8b" },
      { id: "scout", name_th: "หน่วยสำรวจ", color: "#5aa6a9" }
    ];

    const DEFAULT_BUILDINGS = [
      { id: "none", name_th: "None", color: "#1c1f1d", popUse: 0, popCap: 0, size: { w: 1, h: 1 } },
      { id: "tent", name_th: "กระโจม", color: "#f25f2c", popUse: 0, popCap: 3, size: { w: 4, h: 4 } },
      { id: "hut", name_th: "กระท่อม", color: "#f2c94c", popUse: 0, popCap: 2, size: { w: 1, h: 1 } },
      { id: "lumberyard", name_th: "โรงตัดไม้", color: "#8c5a2f", popUse: 0, popCap: 0, size: { w: 2, h: 2 } },
      { id: "hunter", name_th: "บ้านนายพราน", color: "#6d4f39", popUse: 0, popCap: 0, size: { w: 2, h: 2 } },
      { id: "storage", name_th: "คลังเสบียง", color: "#5f6e7f", popUse: 0, popCap: 0, size: { w: 2, h: 2 } }
    ];

    const ensureDefs = (defs, defaults) => {
      const defaultsById = new Map(defaults.map((d) => [d.id, d]));
      const merged = Array.isArray(defs)
        ? defs.map((d) => ({ ...(defaultsById.get(d.id) || {}), ...d }))
        : [];
      const ids = new Set(merged.map((d) => d.id));
      defaults.forEach((d) => {
        if (!ids.has(d.id)) merged.push({ ...d });
      });
      return merged;
    };

    const spawnUnit = (state, originIndex, options = {}) => {
      const size = state.map.size;
      const ox = originIndex % size;
      const oy = Math.floor(originIndex / size);
      const unitIndex = state.defs.units.findIndex((u) => u.id === "villager");
      const unitId = unitIndex >= 0 ? unitIndex : 1;
      const entity = {
        id: `u${Date.now()}-${Math.random().toString(16).slice(2)}`,
        typeIndex: unitId,
        x: ox + 0.5,
        y: oy + 0.5,
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
        homeIndex: Number.isFinite(options.homeIndex) ? options.homeIndex : -1,
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
      state.runtime.unitEntities.push(entity);
    };

    const distance = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);

    const moveTowards = (entity, tx, ty, speed, dt) => {
      const dx = tx - entity.x;
      const dy = ty - entity.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= 0.0001) return 0;
      const step = Math.min(dist, speed * dt);
      entity.x += (dx / dist) * step;
      entity.y += (dy / dist) * step;
      return dist - step;
    };

    const clearEntityPath = (entity) => {
      entity.pathNodes = null;
      entity.pathCursor = 0;
      entity.pathGoalKey = "";
    };

    const clearHaulAssignment = (entity) => {
      entity.haulRole = null;
      entity.haulTarget = -1;
    };

    const toCellIndex = (size, x, y) => {
      const cx = Math.max(0, Math.min(size - 1, Math.floor(x)));
      const cy = Math.max(0, Math.min(size - 1, Math.floor(y)));
      return cy * size + cx;
    };

    const isWalkableCell = (state, cell) => {
      if (!Number.isFinite(cell) || cell < 0 || cell >= state.map.height.length) return false;
      const walk = state.runtime.walkable;
      if (walk instanceof Uint8Array && cell < walk.length) return walk[cell] === 1;
      return (state.map.height[cell] || 0) > 1;
    };

    const resolvePathGoalCell = (state, start, goal, maxRadius = 2) => {
      if (isWalkableCell(state, goal)) return goal;
      const size = state.map.size;
      const gx = goal % size;
      const gy = Math.floor(goal / size);
      let best = -1;
      let bestToGoal = Number.POSITIVE_INFINITY;
      let bestToStart = Number.POSITIVE_INFINITY;
      for (let r = 1; r <= maxRadius; r += 1) {
        for (let dy = -r; dy <= r; dy += 1) {
          for (let dx = -r; dx <= r; dx += 1) {
            const nx = gx + dx;
            const ny = gy + dy;
            if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
            const idx = ny * size + nx;
            if (!isWalkableCell(state, idx)) continue;
            const dGoal = Math.abs(dx) + Math.abs(dy);
            const sx = start % size;
            const sy = Math.floor(start / size);
            const dStart = Math.abs(nx - sx) + Math.abs(ny - sy);
            if (dGoal < bestToGoal || (dGoal === bestToGoal && (dStart < bestToStart || (dStart === bestToStart && idx < best)))) {
              best = idx;
              bestToGoal = dGoal;
              bestToStart = dStart;
            }
          }
        }
        if (best >= 0) return best;
      }
      return goal;
    };

    const reconstructPath = (cameFrom, start, goal) => {
      const out = [];
      let cur = goal;
      while (cur >= 0 && cur !== start) {
        out.push(cur);
        cur = cameFrom[cur];
      }
      out.reverse();
      return out;
    };

    const findPathAStar = (state, start, goal, maxExpand = 4096) => {
      const size = state.map.size;
      const total = size * size;
      if (start === goal) return [];
      if (!isWalkableCell(state, start) || !isWalkableCell(state, goal)) return null;

      const gScore = new Float64Array(total);
      const fScore = new Float64Array(total);
      const cameFrom = new Int32Array(total);
      const inOpen = new Uint8Array(total);
      const inClosed = new Uint8Array(total);
      gScore.fill(Number.POSITIVE_INFINITY);
      fScore.fill(Number.POSITIVE_INFINITY);
      cameFrom.fill(-1);

      const DIAG = Math.SQRT2;
      const heuristic = (a, b) => {
        const ax = a % size;
        const ay = Math.floor(a / size);
        const bx = b % size;
        const by = Math.floor(b / size);
        const dx = Math.abs(ax - bx);
        const dy = Math.abs(ay - by);
        const minD = Math.min(dx, dy);
        const maxD = Math.max(dx, dy);
        return maxD + (DIAG - 1) * minD;
      };

      const open = [start];
      gScore[start] = 0;
      fScore[start] = heuristic(start, goal);
      inOpen[start] = 1;

      let expanded = 0;
      while (open.length > 0 && expanded < maxExpand) {
        let bestPos = 0;
        let best = open[0];
        let bestF = fScore[best];
        let bestH = heuristic(best, goal);
        for (let i = 1; i < open.length; i += 1) {
          const node = open[i];
          const f = fScore[node];
          const h = heuristic(node, goal);
          if (f < bestF
            || (f === bestF && (h < bestH
              || (h === bestH && (gScore[node] > gScore[best] || (gScore[node] === gScore[best] && node < best)))))) {
            best = node;
            bestPos = i;
            bestF = f;
            bestH = h;
          }
        }

        open.splice(bestPos, 1);
        inOpen[best] = 0;
        inClosed[best] = 1;
        expanded += 1;

        if (best === goal) return reconstructPath(cameFrom, start, goal);

        const bx = best % size;
        const by = Math.floor(best / size);
        const neighbors = [
          { x: bx - 1, y: by - 1, cost: DIAG, diag: true },
          { x: bx + 1, y: by - 1, cost: DIAG, diag: true },
          { x: bx - 1, y: by + 1, cost: DIAG, diag: true },
          { x: bx + 1, y: by + 1, cost: DIAG, diag: true },
          { x: bx, y: by - 1, cost: 1, diag: false },
          { x: bx - 1, y: by, cost: 1, diag: false },
          { x: bx + 1, y: by, cost: 1, diag: false },
          { x: bx, y: by + 1, cost: 1, diag: false }
        ];

        neighbors.forEach((n) => {
          if (n.x < 0 || n.y < 0 || n.x >= size || n.y >= size) return;
          const next = n.y * size + n.x;
          if (!isWalkableCell(state, next)) return;
          if (n.diag) {
            const sideA = by * size + n.x;
            const sideB = n.y * size + bx;
            if (!isWalkableCell(state, sideA) || !isWalkableCell(state, sideB)) return;
          }
          if (inClosed[next]) return;
          const tentative = gScore[best] + n.cost;
          if (tentative >= gScore[next]) return;
          cameFrom[next] = best;
          gScore[next] = tentative;
          fScore[next] = tentative + heuristic(next, goal);
          if (!inOpen[next]) {
            open.push(next);
            inOpen[next] = 1;
          }
        });
      }
      return null;
    };

    const advanceEntityAlongPath = (state, entity, speed, dt) => {
      if (!Array.isArray(entity.pathNodes) || entity.pathNodes.length === 0) return;
      const size = state.map.size;
      let stepBudget = Math.max(0, speed * dt);
      while (stepBudget > 0 && entity.pathCursor < entity.pathNodes.length) {
        const nextCell = entity.pathNodes[entity.pathCursor];
        const nextX = (nextCell % size) + 0.5;
        const nextY = Math.floor(nextCell / size) + 0.5;
        const dist = distance(entity.x, entity.y, nextX, nextY);
        if (dist <= 0.0001) {
          entity.pathCursor += 1;
          continue;
        }
        const step = Math.min(dist, stepBudget);
        entity.x += ((nextX - entity.x) / dist) * step;
        entity.y += ((nextY - entity.y) / dist) * step;
        stepBudget -= step;
        if (dist - step <= 0.0001) entity.pathCursor += 1;
      }
      if (entity.pathCursor >= entity.pathNodes.length) {
        PathfindingSystem.clearPath(entity);
      }
    };

    const moveEntityTowards = (state, entity, tx, ty, speed, dt) => {
      const size = state.map.size;
      const start = toCellIndex(size, entity.x, entity.y);
      const rawGoal = toCellIndex(size, tx, ty);
      const goal = resolvePathGoalCell(state, start, rawGoal, 2);
      const goalX = (goal % size) + 0.5;
      const goalY = Math.floor(goal / size) + 0.5;
      const goalKey = String(goal);

      if (entity.pathGoalKey !== goalKey || !Array.isArray(entity.pathNodes)) {
        const path = findPathAStar(state, start, goal);
        entity.pathNodes = Array.isArray(path) ? path : null;
        entity.pathCursor = 0;
        entity.pathGoalKey = goalKey;
      } else if ((entity.pathNodes || []).length > 0) {
        const nextCell = entity.pathNodes[Math.max(0, entity.pathCursor)];
        const nextX = (nextCell % size) + 0.5;
        const nextY = Math.floor(nextCell / size) + 0.5;
        if (distance(entity.x, entity.y, nextX, nextY) > 1.6) {
          const path = findPathAStar(state, start, goal);
          entity.pathNodes = Array.isArray(path) ? path : null;
          entity.pathCursor = 0;
          entity.pathGoalKey = goalKey;
        }
      }

      if (!Array.isArray(entity.pathNodes) || entity.pathNodes.length === 0) return distance(entity.x, entity.y, goalX, goalY);

      advanceEntityAlongPath(state, entity, speed, dt);
      return distance(entity.x, entity.y, goalX, goalY);
    };

    const PathfindingSystem = {
      clearPath(entity) {
        clearEntityPath(entity);
      },
      findPathAStar(state, start, goal, maxExpand = 4096) {
        return findPathAStar(state, start, goal, maxExpand);
      },
      moveEntityTowards(state, entity, tx, ty, speed, dt) {
        return moveEntityTowards(state, entity, tx, ty, speed, dt);
      }
    };

    const tilesPerSecondFromMetersPerHour = (state, metersPerHour) => {
      const tileSizeM = Math.max(0.1, Number(state.map.tileSizeM) || 2);
      const hourTick = Math.max(0.05, Number(GameRules.time.hourTickSeconds) || 0.35);
      return (Math.max(0, Number(metersPerHour) || 0) / tileSizeM) / hourTick;
    };

    const FOOD_ID_HINTS = ["fish", "rice", "banana", "game", "herb", "food", "fruit"];
    const FOOD_NAME_HINTS = ["ปลา", "ข้าว", "กล้วย", "สัตว์", "สมุนไพร", "อาหาร", "fruit", "fish", "rice", "banana", "game", "herb"];
    const GAME_ID_HINTS = ["game", "animal", "hunt", "deer", "boar"];
    const GAME_NAME_HINTS = ["สัตว์", "ล่า", "พราน", "game", "animal", "hunt", "deer", "boar"];
    const WOOD_ID_HINTS = ["forest", "bamboo", "timber", "wood"];
    const WOOD_NAME_HINTS = ["ป่าไม้", "ไม้", "ไผ่", "timber", "wood", "bamboo", "forest"];
    const BLOCK_ID_HINTS = ["rock", "stone", "ore", "cliff", "reef", "forest", "bamboo", "timber", "wood"];
    const BLOCK_NAME_HINTS = ["หิน", "โขด", "ผา", "ป่า", "ไม้", "ไผ่", "rock", "stone", "ore", "cliff", "forest", "wood", "bamboo"];

    const isFoodResource = (resourceDef) => {
      if (!resourceDef) return false;
      const id = String(resourceDef.id || "").toLowerCase();
      const name = `${resourceDef.name_th || ""} ${resourceDef.name_en || ""}`.toLowerCase();
      if (FOOD_ID_HINTS.some((hint) => id.includes(hint))) return true;
      if (FOOD_NAME_HINTS.some((hint) => name.includes(hint))) return true;
      return false;
    };

    const isWoodResource = (resourceDef) => {
      if (!resourceDef) return false;
      const id = String(resourceDef.id || "").toLowerCase();
      const name = `${resourceDef.name_th || ""} ${resourceDef.name_en || ""}`.toLowerCase();
      if (WOOD_ID_HINTS.some((hint) => id.includes(hint))) return true;
      if (WOOD_NAME_HINTS.some((hint) => name.includes(hint))) return true;
      return false;
    };

    const isGameResource = (resourceDef) => {
      if (!resourceDef) return false;
      const id = String(resourceDef.id || "").toLowerCase();
      const name = `${resourceDef.name_th || ""} ${resourceDef.name_en || ""}`.toLowerCase();
      if (GAME_ID_HINTS.some((hint) => id.includes(hint))) return true;
      if (GAME_NAME_HINTS.some((hint) => name.includes(hint))) return true;
      return false;
    };

    const isBlockingResource = (resourceDef) => {
      if (!resourceDef) return false;
      if (resourceDef.blocks_movement === false) return false;
      if (resourceDef.blocks_movement === true) return true;
      const id = String(resourceDef.id || "").toLowerCase();
      const name = `${resourceDef.name_th || ""} ${resourceDef.name_en || ""}`.toLowerCase();
      if (resourceDef.category === "mineral") return true;
      if (BLOCK_ID_HINTS.some((hint) => id.includes(hint))) return true;
      if (BLOCK_NAME_HINTS.some((hint) => name.includes(hint))) return true;
      return false;
    };

    const findNearestResourceBy = (x, y, state, radius, predicate, unitId = "") => {
      const size = state.map.size;
      const cx = Math.floor(x);
      const cy = Math.floor(y);
      const resources = state.map.resources;
      const qty = state.map.resourcesQty;
      const defs = state.defs.resources;
      const claims = state.runtime.resourceClaims || {};
      let bestIndex = -1;
      let bestDist = Number.POSITIVE_INFINITY;
      for (let dy = -radius; dy <= radius; dy += 1) {
        for (let dx = -radius; dx <= radius; dx += 1) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
          const idx = ny * size + nx;
          if (resources[idx] <= 0 || qty[idx] <= 0) continue;
          const owner = claims[String(idx)];
          if (owner && owner !== unitId) continue;
          const def = defs[resources[idx] - 1];
          if (predicate && !predicate(def)) continue;
          const dist = dx * dx + dy * dy;
          if (dist < bestDist) {
            bestDist = dist;
            bestIndex = idx;
          }
        }
      }
      return bestIndex;
    };

    const claimResourceIndex = (state, entity, index) => {
      if (!Number.isFinite(index) || index < 0) return false;
      if (!state.runtime.resourceClaims) state.runtime.resourceClaims = {};
      const key = String(index);
      const owner = state.runtime.resourceClaims[key];
      if (owner && owner !== entity.id) return false;
      state.runtime.resourceClaims[key] = entity.id;
      return true;
    };

    const releaseResourceClaim = (state, entity) => {
      if (!state.runtime.resourceClaims) return;
      const index = Number(entity.targetIndex);
      if (!Number.isFinite(index) || index < 0) return;
      const key = String(index);
      if (state.runtime.resourceClaims[key] === entity.id) delete state.runtime.resourceClaims[key];
    };

    const pruneResourceClaims = (state) => {
      const claims = state.runtime.resourceClaims || {};
      const valid = new Map(state.runtime.unitEntities.map((entity) => [entity.id, entity]));
      Object.entries(claims).forEach(([key, owner]) => {
        const idx = Number(key);
        const entity = valid.get(owner);
        if (!entity) {
          delete claims[key];
          return;
        }
        const task = String(entity.task || "");
        const gatheringTask = task === "seek_food"
          || task === "harvest_food"
          || task === "seek_wood"
          || task === "harvest_wood"
          || task === "seek_game"
          || task === "hunt";
        if (!gatheringTask || Number(entity.targetIndex) !== idx) delete claims[key];
      });
      state.runtime.resourceClaims = claims;
    };

    const syncUnitsFromEntities = (state) => {
      const size = state.map.size;
      state.map.units.fill(0);
      state.runtime.unitEntities.forEach((entity) => {
        const x = Math.max(0, Math.min(size - 1, Math.floor(entity.x)));
        const y = Math.max(0, Math.min(size - 1, Math.floor(entity.y)));
        state.map.units[y * size + x] = entity.typeIndex;
      });
    };

    const getBuildingIndexById = (state, id) => state.defs.buildings.findIndex((b) => b.id === id);

    const getBuildingAnchorsById = (state, id) => {
      const buildingIndex = getBuildingIndexById(state, id);
      if (buildingIndex <= 0) return [];
      const anchors = [];
      const buildings = state.map.buildings;
      for (let i = 0; i < buildings.length; i += 1) {
        if (buildings[i] === buildingIndex) anchors.push(i);
      }
      return anchors;
    };

    const rebuildBuildingAnchorsFromMap = (state) => {
      const size = state.map.size;
      state.runtime.buildingAnchors.fill(-1);
      for (let i = 0; i < state.map.buildings.length; i += 1) {
        const buildingIndex = state.map.buildings[i];
        if (buildingIndex <= 0) continue;
        const b = state.defs.buildings[buildingIndex];
        const w = b?.size?.w || 1;
        const h = b?.size?.h || 1;
        const x = i % size;
        const y = Math.floor(i / size);
        for (let dy = 0; dy < h; dy += 1) {
          for (let dx = 0; dx < w; dx += 1) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
            state.runtime.buildingAnchors[ny * size + nx] = i;
          }
        }
      }
      state.runtime.buildingSites.forEach((site) => {
        if (site.active) return;
        (site.footprint || []).forEach((idx) => {
          if (idx >= 0 && idx < state.runtime.buildingAnchors.length) state.runtime.buildingAnchors[idx] = site.anchorIndex;
        });
      });
    };

    const getSiteById = (state, id) => state.runtime.buildingSites.find((site) => site.id === id);

    const getDepotAnchors = (state) => {
      const depots = [];
      getBuildingAnchorsById(state, "tent").forEach((a) => depots.push(a));
      getBuildingAnchorsById(state, "storage").forEach((a) => depots.push(a));
      return depots;
    };

    const getNearestDepotAnchor = (state, x, y) => {
      const depots = getDepotAnchors(state);
      if (depots.length === 0) return -1;
      let best = depots[0];
      let bestDist = Number.POSITIVE_INFINITY;
      depots.forEach((anchor) => {
        const dx = (anchor % state.map.size) + 0.5 - x;
        const dy = Math.floor(anchor / state.map.size) + 0.5 - y;
        const d2 = dx * dx + dy * dy;
        if (d2 < bestDist) {
          bestDist = d2;
          best = anchor;
        }
      });
      return best;
    };

    const ensureDepotQueues = (state) => {
      if (!state.runtime.depotQueues || typeof state.runtime.depotQueues !== "object") {
        state.runtime.depotQueues = {};
      }
      return state.runtime.depotQueues;
    };

    const enqueueDepotQueue = (state, anchor, unitId) => {
      if (!Number.isFinite(anchor) || anchor < 0 || !unitId) return;
      const queues = ensureDepotQueues(state);
      const key = String(anchor);
      if (!Array.isArray(queues[key])) queues[key] = [];
      if (!queues[key].includes(unitId)) queues[key].push(unitId);
    };

    const leaveDepotQueue = (state, anchor, unitId) => {
      if (!Number.isFinite(anchor) || anchor < 0 || !unitId) return;
      const queues = ensureDepotQueues(state);
      const key = String(anchor);
      if (!Array.isArray(queues[key])) return;
      queues[key] = queues[key].filter((id) => id !== unitId);
      if (queues[key].length <= 0) delete queues[key];
    };

    const getDepotQueuePosition = (state, anchor, unitId) => {
      if (!Number.isFinite(anchor) || anchor < 0 || !unitId) return -1;
      const queues = ensureDepotQueues(state);
      const key = String(anchor);
      if (!Array.isArray(queues[key])) return -1;
      return queues[key].indexOf(unitId);
    };

    const pruneDepotQueues = (state) => {
      const queues = ensureDepotQueues(state);
      const validDepots = new Set(getDepotAnchors(state).map((a) => String(a)));
      const unitsById = new Map((state.runtime.unitEntities || []).map((u) => [u.id, u]));
      const queueTasks = new Set(["return_food", "queue_depot"]);
      Object.entries(queues).forEach(([anchorKey, ids]) => {
        if (!validDepots.has(anchorKey)) {
          delete queues[anchorKey];
          return;
        }
        const filtered = (Array.isArray(ids) ? ids : []).filter((id) => {
          const unit = unitsById.get(id);
          if (!unit) return false;
          return queueTasks.has(String(unit.task || ""));
        });
        if (filtered.length > 0) queues[anchorKey] = filtered;
        else delete queues[anchorKey];
      });
      state.runtime.depotQueues = queues;
    };

    const findNearestHunterFoodSource = (state, x, y) => {
      const stock = state.runtime.hunterFoodStock || {};
      let best = -1;
      let bestD2 = Number.POSITIVE_INFINITY;
      Object.entries(stock).forEach(([anchorKey, amount]) => {
        if ((Number(amount) || 0) <= 0) return;
        const anchor = Number(anchorKey);
        const dx = (anchor % state.map.size) + 0.5 - x;
        const dy = Math.floor(anchor / state.map.size) + 0.5 - y;
        const d2 = dx * dx + dy * dy;
        if (d2 < bestD2) {
          bestD2 = d2;
          best = anchor;
        }
      });
      return best;
    };

    const getHunterStockCapForAnchor = (state, anchor) => {
      if (anchor < 0) return 0;
      return Math.max(0, Number(GameRules.economy.hunterHutFoodCap) || 20);
    };

    const getHunterStockForAnchor = (state, anchor) => {
      return Math.max(0, Number(state.runtime.hunterFoodStock?.[String(anchor)]) || 0);
    };

    const withdrawHunterFood = (state, anchor, amount) => {
      const key = String(anchor);
      const current = Math.max(0, Number(state.runtime.hunterFoodStock?.[key]) || 0);
      const taken = Math.max(0, Math.min(amount, current));
      state.runtime.hunterFoodStock[key] = current - taken;
      return taken;
    };

    const syncWorkplaceFoodState = (state) => {
      const mealsPerDay = Math.max(1, Number(GameRules.economy.workplaceMealsPerWorkerPerDay) || 3);
      const next = {};
      const anchors = getBuildingAnchorsById(state, "lumberyard");
      anchors.forEach((anchor) => {
        const key = String(anchor);
        const workers = Math.max(0, (state.runtime.lumberWorkers?.[key] || []).length);
        const cap = workers * mealsPerDay;
        const prev = state.runtime.workplaceFood?.[key];
        const prevStock = Math.max(0, Number(prev?.stock) || 0);
        const prevFed = typeof prev?.fedThisMeal === "boolean" ? prev.fedThisMeal : true;
        next[key] = {
          buildingId: "lumberyard",
          workers,
          cap,
          stock: Math.min(cap, prevStock),
          fedThisMeal: workers <= 0 ? true : prevFed
        };
      });
      state.runtime.workplaceFood = next;
    };

    const findNearestHungryWorkplace = (state, x, y) => {
      syncWorkplaceFoodState(state);
      const entries = Object.entries(state.runtime.workplaceFood || {});
      if (entries.length <= 0) return -1;
      let best = -1;
      let bestD2 = Number.POSITIVE_INFINITY;
      entries.forEach(([anchorKey, info]) => {
        const cap = Math.max(0, Number(info?.cap) || 0);
        const stock = Math.max(0, Number(info?.stock) || 0);
        const workers = Math.max(0, Number(info?.workers) || 0);
        if (workers <= 0) return;
        if (stock >= cap) return;
        const anchor = Number(anchorKey);
        const dx = (anchor % state.map.size) + 0.5 - x;
        const dy = Math.floor(anchor / state.map.size) + 0.5 - y;
        const d2 = dx * dx + dy * dy;
        if (d2 < bestD2) {
          bestD2 = d2;
          best = anchor;
        }
      });
      return best;
    };

    const depositWorkplaceFood = (state, anchor, amount) => {
      const key = String(anchor);
      const site = state.runtime.workplaceFood?.[key];
      if (!site) return 0;
      const cap = Math.max(0, Number(site.cap) || 0);
      const stock = Math.max(0, Number(site.stock) || 0);
      const accepted = Math.max(0, Math.min(amount, cap - stock));
      site.stock = stock + accepted;
      if (site.stock > 0 && site.workers > 0 && site.fedThisMeal !== true) {
        site.fedThisMeal = true;
      }
      return accepted;
    };

    const processWorkplaceMealWindow = (state) => {
      syncWorkplaceFoodState(state);
      const mealsPerDay = Math.max(1, Number(GameRules.economy.workplaceMealsPerWorkerPerDay) || 3);
      const hoursPerDay = Math.max(1, Number(GameRules.time.hoursPerDay) || 24);
      const hoursPerMeal = hoursPerDay / mealsPerDay;
      const mealWindow = Math.min(mealsPerDay - 1, Math.floor(state.runtime.hour / Math.max(1, hoursPerMeal)));
      const mealKey = `${state.runtime.week}-${state.runtime.day}-${mealWindow}`;
      if (state.runtime.lastWorkMealKey === mealKey) return;
      state.runtime.lastWorkMealKey = mealKey;

      Object.values(state.runtime.workplaceFood || {}).forEach((site) => {
        const workers = Math.max(0, Number(site.workers) || 0);
        if (workers <= 0) {
          site.fedThisMeal = true;
          return;
        }
        const current = Math.max(0, Number(site.stock) || 0);
        const taken = Math.min(current, workers);
        site.stock = current - taken;
        site.fedThisMeal = taken >= workers;
      });
    };

    const isWorkplaceFedForCurrentMeal = (state, anchor) => {
      const site = state.runtime.workplaceFood?.[String(anchor)];
      if (!site) return true;
      const workers = Math.max(0, Number(site.workers) || 0);
      if (workers <= 0) return true;
      return site.fedThisMeal === true;
    };

    const getResourceCap = (state, type) => {
      const tentCount = getBuildingAnchorsById(state, "tent").length;
      const storageCount = getBuildingAnchorsById(state, "storage").length;
      const base = type === "food"
        ? (tentCount > 0 ? Number(GameRules.storage.tentFoodCap) || 20 : 0)
        : (tentCount > 0 ? Number(GameRules.storage.tentWoodCap) || 20 : 0);
      const bonus = type === "food"
        ? (Number(GameRules.storage.storageFoodBonus) || 50)
        : (Number(GameRules.storage.storageWoodBonus) || 50);
      return Math.max(0, base + storageCount * bonus);
    };

    const clampResourceStock = (state) => {
      const foodCap = getResourceCap(state, "food");
      const woodCap = getResourceCap(state, "wood");
      state.runtime.resources.food = Math.max(0, Math.min(foodCap, state.runtime.resources.food || 0));
      state.runtime.resources.wood = Math.max(0, Math.min(woodCap, state.runtime.resources.wood || 0));
    };

    const depositResource = (state, type, amount) => {
      const cap = getResourceCap(state, type);
      const current = state.runtime.resources[type] || 0;
      const accepted = Math.max(0, Math.min(amount, cap - current));
      state.runtime.resources[type] = current + accepted;
      return accepted;
    };

    const withdrawResource = (state, type, amount) => {
      const current = state.runtime.resources[type] || 0;
      const taken = Math.max(0, Math.min(amount, current));
      state.runtime.resources[type] = current - taken;
      return taken;
    };

    const assignHomelessToHuts = (state) => {
      const hutAnchors = getBuildingAnchorsById(state, "hut");
      const assignLimit = Math.max(1, Number(GameRules.population.hutCapacity) || 2);
      const residents = {};
      hutAnchors.forEach((anchor) => { residents[String(anchor)] = 0; });

      state.runtime.unitEntities.forEach((entity) => {
        const home = Number.isFinite(entity.homeIndex) ? entity.homeIndex : -1;
        if (home >= 0 && residents[String(home)] !== undefined) {
          residents[String(home)] += 1;
        } else {
          entity.homeIndex = -1;
        }
      });

      state.runtime.unitEntities.forEach((entity) => {
        if (entity.homeIndex >= 0) return;
        let pick = -1;
        let lowest = Number.POSITIVE_INFINITY;
        hutAnchors.forEach((anchor) => {
          const key = String(anchor);
          const current = residents[key] || 0;
          if (current >= assignLimit) return;
          if (current < lowest) {
            lowest = current;
            pick = anchor;
          }
        });
        if (pick >= 0) {
          entity.homeIndex = pick;
          residents[String(pick)] = (residents[String(pick)] || 0) + 1;
        }
      });

      state.runtime.hutResidents = residents;
    };

    const processWeeklyPopulationGrowth = (state) => {
      const weeksPerGrowth = Math.max(1, Number(GameRules.population.hutGrowthWeeks) || 1);
      if (state.runtime.week % weeksPerGrowth !== 0 || state.runtime.day !== 1) return;
      const hutAnchors = getBuildingAnchorsById(state, "hut");
      if (!state.runtime.happy) return;
      const freeSlots = Math.max(0, (state.runtime.populationCap || 0) - (state.runtime.population || 0));
      const births = Math.min(hutAnchors.length, freeSlots);
      for (let i = 0; i < births; i += 1) {
        const anchor = hutAnchors[i];
        spawnUnit(state, anchor, { homeIndex: anchor });
      }
      syncUnitsFromEntities(state);
    };

    const processHourlyFood = (state) => {
      const foodPerPerson = Math.max(0, Number(GameRules.population.foodPerPersonPerDay) || 3);
      const hoursPerDay = Math.max(1, Number(GameRules.time.hoursPerDay) || 24);
      const happyThreshold = Math.max(0, Number(GameRules.happiness.threshold) || 50);
      const gainWhenFed = Math.max(0, Number(GameRules.happiness.gainWhenFed) || 12);
      const lossWhenStarving = Math.max(0, Number(GameRules.happiness.lossWhenStarving) || 24);
      const units = state.runtime.unitEntities;
      const hunterIds = new Set();
      Object.values(state.runtime.hunterWorkers || {}).forEach((ids) => {
        (Array.isArray(ids) ? ids : []).forEach((id) => hunterIds.add(id));
      });
      const nonHunterUnits = units.filter((entity) => !hunterIds.has(entity.id));
      const demandPerHour = foodPerPerson / hoursPerDay;
      const mealsPerDay = Math.max(1, foodPerPerson);
      const starvationHoursPerMealMiss = hoursPerDay / mealsPerDay;
      const totalHoursToDie = Math.max(1, Math.floor(
        (Number(GameRules.population.starvationWeeksToDie) || 4)
        * (Number(GameRules.time.daysPerWeek) || 7)
        * hoursPerDay
      ));

      nonHunterUnits.forEach((entity) => {
        entity.foodDebt = Math.max(0, Number(entity.foodDebt) || 0) + demandPerHour;
        entity.starvationHours = Math.max(0, Number(entity.starvationHours) || 0);
      });

      let totalDueMeals = 0;
      nonHunterUnits.forEach((entity) => {
        totalDueMeals += Math.floor((Number(entity.foodDebt) || 0) + 1e-9);
      });

      const daysPerWeek = Math.max(1, Number(GameRules.time.daysPerWeek) || 7);
      const absoluteHour = (
        ((Math.max(1, state.runtime.week) - 1) * daysPerWeek + (Math.max(1, state.runtime.day) - 1)) * hoursPerDay
      ) + Math.max(0, state.runtime.hour);
      const startOffset = nonHunterUnits.length > 0 ? (absoluteHour % nonHunterUnits.length) : 0;

      let missedMeals = 0;
      let available = Math.max(0, Number(state.runtime.resources.food) || 0);
      for (let i = 0; i < nonHunterUnits.length; i += 1) {
        const entity = nonHunterUnits[(i + startOffset) % nonHunterUnits.length];
        let dueMeals = Math.floor((Number(entity.foodDebt) || 0) + 1e-9);
        while (dueMeals > 0) {
          entity.foodDebt = Math.max(0, (Number(entity.foodDebt) || 0) - 1);
          if (available >= 1) {
            available -= 1;
            entity.starvationHours = 0;
            entity.starvationDays = 0;
          } else {
            missedMeals += 1;
            entity.starvationHours = (Number(entity.starvationHours) || 0) + starvationHoursPerMealMiss;
            entity.starvationDays = Math.floor((Number(entity.starvationHours) || 0) / hoursPerDay);
          }
          dueMeals -= 1;
        }
      }
      state.runtime.resources.food = available;

      units.forEach((entity) => {
        if (hunterIds.has(entity.id)) {
          entity.starvationDays = 0;
          entity.starvationHours = 0;
          entity.foodDebt = 0;
        }
      });

      const hunterIdSet = new Set((state.runtime.unitEntities || []).map((entity) => entity.id));
      Object.entries(state.runtime.hunterWorkers || {}).forEach(([anchor, ids]) => {
        state.runtime.hunterWorkers[anchor] = (Array.isArray(ids) ? ids : []).filter((id) => hunterIdSet.has(id));
      });
      Object.entries(state.runtime.hunterFoodStock || {}).forEach(([anchor]) => {
        if (!getBuildingAnchorsById(state, "hunter").some((a) => String(a) === anchor)) delete state.runtime.hunterFoodStock[anchor];
      });

      for (let i = units.length - 1; i >= 0; i -= 1) {
        if ((Number(units[i].starvationHours) || 0) >= totalHoursToDie) units.splice(i, 1);
      }

      if (totalDueMeals <= 0 || missedMeals <= 0) {
        state.runtime.happiness = Math.min(100, (state.runtime.happiness || 0) + (gainWhenFed / hoursPerDay));
        state.runtime.happy = (state.runtime.happiness || 0) >= happyThreshold;
        syncUnitsFromEntities(state);
        return;
      }

      const shortageRatio = Math.max(0, Math.min(1, missedMeals / Math.max(1, totalDueMeals)));
      state.runtime.happiness = Math.max(0, (state.runtime.happiness || 0) - ((lossWhenStarving / hoursPerDay) * shortageRatio));
      state.runtime.happy = (state.runtime.happiness || 0) >= happyThreshold;
      syncUnitsFromEntities(state);
    };

    const processHunterProduction = (state) => {
      // Hunter output is now produced by unit movement/harvest loops.
      // Keep this system as stock cleanup/clamp only.
      const stock = state.runtime.hunterFoodStock || {};
      Object.entries(stock).forEach(([anchor, amount]) => {
        const cap = getHunterStockCapForAnchor(state, Number(anchor));
        const current = Math.max(0, Number(stock[anchor]) || 0);
        stock[anchor] = Math.max(0, Math.min(cap, Number(amount) || current));
      });
      state.runtime.hunterFoodStock = stock;
    };

    const assignLumberWorkers = (state) => {
      const workersPerYard = Math.max(1, Number(GameRules.economy.lumberyardWorkers) || 1);
      const lumberAnchors = getBuildingAnchorsById(state, "lumberyard");
      const mapping = state.runtime.lumberWorkers || {};
      const validIds = new Set(state.runtime.unitEntities.map((u) => u.id));

      Object.entries(mapping).forEach(([anchor, ids]) => {
        if (!lumberAnchors.some((a) => String(a) === anchor)) {
          delete mapping[anchor];
          return;
        }
        mapping[anchor] = (Array.isArray(ids) ? ids : []).filter((id) => validIds.has(id));
      });

      state.runtime.unitEntities.forEach((entity) => {
        if (entity.job === "lumberjack" || entity.job === "hunter") {
          entity.job = "idle";
          entity.workIndex = -1;
        }
      });

      const assignedIds = new Set();
      Object.values(mapping).forEach((ids) => {
        (ids || []).forEach((id) => assignedIds.add(id));
      });

      lumberAnchors.forEach((anchor) => {
        const key = String(anchor);
        if (!Array.isArray(mapping[key])) mapping[key] = [];

        const current = mapping[key].slice(0, workersPerYard);
        mapping[key] = current;

        while (mapping[key].length < workersPerYard) {
          const candidate = state.runtime.unitEntities.find((entity) => !assignedIds.has(entity.id));
          if (!candidate) break;
          mapping[key].push(candidate.id);
          assignedIds.add(candidate.id);
        }

        mapping[key].forEach((id) => {
          const entity = state.runtime.unitEntities.find((u) => u.id === id);
          if (!entity) return;
          entity.job = "lumberjack";
          entity.workIndex = anchor;
        });
      });

      state.runtime.lumberWorkers = mapping;
      syncWorkplaceFoodState(state);
    };

    const assignHunterWorkers = (state) => {
      const workersPerHunter = Math.max(1, Number(GameRules.economy.hunterWorkers) || 1);
      const hunterAnchors = getBuildingAnchorsById(state, "hunter");
      const mapping = state.runtime.hunterWorkers || {};
      const validIds = new Set(state.runtime.unitEntities.map((u) => u.id));

      Object.entries(mapping).forEach(([anchor, ids]) => {
        if (!hunterAnchors.some((a) => String(a) === anchor)) {
          delete mapping[anchor];
          return;
        }
        mapping[anchor] = (Array.isArray(ids) ? ids : []).filter((id) => validIds.has(id));
      });

      const assignedIds = new Set(state.runtime.unitEntities.filter((entity) => entity.job === "lumberjack").map((entity) => entity.id));
      Object.values(mapping).forEach((ids) => {
        (ids || []).forEach((id) => assignedIds.add(id));
      });

      hunterAnchors.forEach((anchor) => {
        const key = String(anchor);
        if (!Array.isArray(mapping[key])) mapping[key] = [];
        mapping[key] = mapping[key].slice(0, workersPerHunter);

        while (mapping[key].length < workersPerHunter) {
          const candidate = state.runtime.unitEntities.find((entity) => !assignedIds.has(entity.id));
          if (!candidate) break;
          mapping[key].push(candidate.id);
          assignedIds.add(candidate.id);
        }

        mapping[key].forEach((id) => {
          const entity = state.runtime.unitEntities.find((u) => u.id === id);
          if (!entity) return;
          entity.job = "hunter";
          entity.workIndex = anchor;
        });
      });

      state.runtime.hunterWorkers = mapping;
    };

    const assignHaulWorkers = (state) => {
      const entities = state.runtime.unitEntities || [];
      const haulCap = Math.max(1, Number(GameRules.economy.hunterHaulPerTrip) || 12);
      const depots = getDepotAnchors(state);
      const hasDepot = depots.length > 0;
      const foodSpace = Math.max(0, getResourceCap(state, "food") - (state.runtime.resources.food || 0));

      const workplaceNeeds = new Map();
      Object.entries(state.runtime.workplaceFood || {}).forEach(([anchorKey, info]) => {
        const anchor = Number(anchorKey);
        const cap = Math.max(0, Number(info?.cap) || 0);
        const stock = Math.max(0, Number(info?.stock) || 0);
        const need = Math.max(0, cap - stock);
        if (need > 0) workplaceNeeds.set(anchor, need);
      });

      const hunterNeeds = new Map();
      if (hasDepot && foodSpace > 0) {
        let remainingFoodSpace = foodSpace;
        Object.entries(state.runtime.hunterFoodStock || {}).forEach(([anchorKey, amount]) => {
          if (remainingFoodSpace <= 0) return;
          const anchor = Number(anchorKey);
          const stock = Math.max(0, Number(amount) || 0);
          if (stock <= 0) return;
          const movable = Math.min(stock, remainingFoodSpace);
          const trips = Math.ceil(movable / haulCap);
          if (trips > 0) {
            hunterNeeds.set(anchor, trips);
            remainingFoodSpace = Math.max(0, remainingFoodSpace - trips * haulCap);
          }
        });
      }

      const countAssignedByTarget = (role, target) => entities.filter((e) => {
        if (e.job !== "idle") return false;
        if ((e.carryFood || 0) > 0 || (e.carryWood || 0) > 0) return false;
        return e.haulRole === role && Number(e.haulTarget) === target;
      }).length;

      entities.forEach((entity) => {
        if (entity.job !== "idle") {
          clearHaulAssignment(entity);
          return;
        }
        if ((entity.carryFood || 0) > 0 || (entity.carryWood || 0) > 0) return;
        if (entity.haulRole === "workplace_food") {
          const need = workplaceNeeds.get(Number(entity.haulTarget)) || 0;
          if (need <= 0) clearHaulAssignment(entity);
          return;
        }
        if (entity.haulRole === "hunter_haul") {
          const needTrips = hunterNeeds.get(Number(entity.haulTarget)) || 0;
          if (needTrips <= 0) clearHaulAssignment(entity);
          return;
        }
        clearHaulAssignment(entity);
      });

      const freeWorkers = entities
        .filter((e) => e.job === "idle" && (e.carryFood || 0) <= 0 && (e.carryWood || 0) <= 0 && !e.haulRole)
        .slice();

      const pickNearestFreeWorker = (anchor) => {
        if (freeWorkers.length <= 0) return null;
        const tx = (anchor % state.map.size) + 0.5;
        const ty = Math.floor(anchor / state.map.size) + 0.5;
        let bestIdx = 0;
        let bestDist = Number.POSITIVE_INFINITY;
        for (let i = 0; i < freeWorkers.length; i += 1) {
          const worker = freeWorkers[i];
          const d2 = (worker.x - tx) * (worker.x - tx) + (worker.y - ty) * (worker.y - ty);
          if (d2 < bestDist || (d2 === bestDist && String(worker.id) < String(freeWorkers[bestIdx].id))) {
            bestDist = d2;
            bestIdx = i;
          }
        }
        const [picked] = freeWorkers.splice(bestIdx, 1);
        return picked || null;
      };

      Array.from(workplaceNeeds.keys()).sort((a, b) => a - b).forEach((anchor) => {
        const need = workplaceNeeds.get(anchor) || 0;
        let assigned = countAssignedByTarget("workplace_food", anchor);
        while (assigned < need) {
          const worker = pickNearestFreeWorker(anchor);
          if (!worker) break;
          worker.haulRole = "workplace_food";
          worker.haulTarget = anchor;
          assigned += 1;
        }
      });

      Array.from(hunterNeeds.keys()).sort((a, b) => a - b).forEach((anchor) => {
        const trips = hunterNeeds.get(anchor) || 0;
        let assigned = countAssignedByTarget("hunter_haul", anchor);
        while (assigned < trips) {
          const worker = pickNearestFreeWorker(anchor);
          if (!worker) break;
          worker.haulRole = "hunter_haul";
          worker.haulTarget = anchor;
          assigned += 1;
        }
      });
    };

    const assignBuildersToSites = (state) => {
      const assigned = new Set(state.runtime.unitEntities
        .filter((e) => e.job === "lumberjack" || e.job === "hunter")
        .map((e) => e.id));
      const sites = state.runtime.buildingSites.filter((site) => !site.active);
      const siteIds = new Set(sites.map((s) => s.id));

      state.runtime.unitEntities.forEach((entity) => {
        if (entity.job !== "builder") return;
        if (!entity.siteId || !siteIds.has(entity.siteId)) {
          entity.job = "idle";
          entity.siteId = null;
          return;
        }
        assigned.add(entity.id);
      });

      sites.forEach((site) => {
        const workersNeed = Math.max(1, Number(site.requiredWorkers) || 1);
        let assignedCount = state.runtime.unitEntities.filter((entity) => entity.job === "builder" && entity.siteId === site.id).length;
        state.runtime.unitEntities.forEach((entity) => {
          if (assignedCount >= workersNeed) return;
          if (assigned.has(entity.id)) return;
          if (entity.carryFood || entity.carryWood) return;
          entity.job = "builder";
          entity.siteId = site.id;
          assigned.add(entity.id);
          assignedCount += 1;
        });
      });
    };

    const resetDailyTripBudget = (state) => {
      state.runtime.unitEntities.forEach((entity) => {
        entity.dailyTripPointsUsed = 0;
        entity.dailyFoodGathered = 0;
      });
    };

    const findNearbyResource = (state, x, y, radius) => {
      const size = state.map.size;
      const cx = Math.floor(x);
      const cy = Math.floor(y);
      const resources = state.map.resources;
      const qty = state.map.resourcesQty;
      for (let r = 1; r <= radius; r += 1) {
        for (let dy = -r; dy <= r; dy += 1) {
          for (let dx = -r; dx <= r; dx += 1) {
            const nx = cx + dx;
            const ny = cy + dy;
            if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
            const idx = ny * size + nx;
            if (resources[idx] > 0 && qty[idx] > 0) return idx;
          }
        }
      }
      return -1;
    };

    const hasPendingCityJobs = (state) => {
      const entities = state.runtime.unitEntities || [];
      const liveIds = new Set(entities.map((e) => e.id));

      // Any incomplete building site means city work is still pending.
      if ((state.runtime.buildingSites || []).some((site) => !site.active)) return true;

      const requiredLumber = getBuildingAnchorsById(state, "lumberyard").length
        * Math.max(1, Number(GameRules.economy.lumberyardWorkers) || 1);
      const assignedLumber = Object.values(state.runtime.lumberWorkers || {}).reduce((sum, ids) => {
        if (!Array.isArray(ids)) return sum;
        return sum + ids.filter((id) => liveIds.has(id)).length;
      }, 0);
      if (assignedLumber < requiredLumber) return true;

      const requiredHunter = getBuildingAnchorsById(state, "hunter").length
        * Math.max(1, Number(GameRules.economy.hunterWorkers) || 1);
      const assignedHunter = Object.values(state.runtime.hunterWorkers || {}).reduce((sum, ids) => {
        if (!Array.isArray(ids)) return sum;
        return sum + ids.filter((id) => liveIds.has(id)).length;
      }, 0);
      if (assignedHunter < requiredHunter) return true;

      const hasDepot = getDepotAnchors(state).length > 0;
      const cityFood = Math.max(0, Number(state.runtime.resources.food) || 0);
      if (hasDepot && cityFood > 0) {
        syncWorkplaceFoodState(state);
        const needWorkFood = Object.values(state.runtime.workplaceFood || {}).some((site) => {
          const workers = Math.max(0, Number(site?.workers) || 0);
          const cap = Math.max(0, Number(site?.cap) || 0);
          const stock = Math.max(0, Number(site?.stock) || 0);
          return workers > 0 && stock < cap;
        });
        if (needWorkFood) return true;
      }

      const foodSpace = Math.max(0, getResourceCap(state, "food") - cityFood);
      if (hasDepot && foodSpace > 0) {
        const hasHunterStock = Object.values(state.runtime.hunterFoodStock || {}).some((amount) => (Number(amount) || 0) > 0);
        if (hasHunterStock) return true;
      }

      return false;
    };

const resetHourAccumulator = () => {
  hourAccumulator = 0;
};

export {
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
};
