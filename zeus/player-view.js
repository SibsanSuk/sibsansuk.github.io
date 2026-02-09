export const createGameView = ({ canvas, tileSizePx, getResourceFade, ui = {} }) => {
  const ctx = canvas.getContext('2d');
    const RESOURCE_SPRITES = window.SPRITES?.RESOURCE_SPRITES || {};
    const BUILDING_SPRITES = window.SPRITES?.BUILDING_SPRITES || {};

    const SpriteFactory = (() => {
      const cache = new Map();

      const hashString = (text) => {
        let h = 2166136261;
        for (let i = 0; i < text.length; i += 1) {
          h ^= text.charCodeAt(i);
          h = Math.imul(h, 16777619);
        }
        return h >>> 0;
      };

      const rand2 = (x, y, seed) => {
        let h = x * 374761393 + y * 668265263 + seed * 69069;
        h = (h ^ (h >> 13)) * 1274126177;
        return ((h ^ (h >> 16)) >>> 0) / 4294967296;
      };

      const resolveSpriteData = (sprite, desiredSize) => {
        if (!sprite) return null;
        if (Array.isArray(sprite)) {
          return { data: sprite, size: sprite.length };
        }
        if (sprite.data && Array.isArray(sprite.data)) {
          return { data: sprite.data, size: sprite.size || sprite.data.length };
        }
        if (sprite.sizes && typeof sprite.sizes === "object") {
          const sizes = Object.keys(sprite.sizes).map((s) => Number(s)).filter((n) => Number.isFinite(n));
          if (sizes.length === 0) return null;
          let pick = sizes[0];
          sizes.forEach((s) => {
            if (desiredSize && Math.abs(s - desiredSize) < Math.abs(pick - desiredSize)) pick = s;
          });
          const data = sprite.sizes[pick];
          if (Array.isArray(data)) return { data, size: pick };
        }
        return null;
      };

      const makeSprite = (key, baseColor, variant, shape, bitmap, sizePx) => {
        const spriteInfo = shape === "bitmap" ? resolveSpriteData(bitmap, sizePx) : null;
        const size = sizePx || spriteInfo?.size || tileSizePx;
        const cacheKey = `${key}:${variant}:${size}`;
        if (cache.has(cacheKey)) return cache.get(cacheKey);
        const c = document.createElement("canvas");
        c.width = size;
        c.height = size;
        const g = c.getContext("2d");
        g.imageSmoothingEnabled = false;
        if (shape === "bitmap" && spriteInfo) {
          g.clearRect(0, 0, size, size);
          g.fillStyle = baseColor;
          const scale = Math.max(1, Math.floor(size / spriteInfo.size));
          for (let y = 0; y < spriteInfo.data.length; y += 1) {
            const row = spriteInfo.data[y];
            for (let x = 0; x < row.length; x += 1) {
              if (row[x] === "1") {
                g.fillRect(x * scale, y * scale, scale, scale);
              }
            }
          }
          cache.set(cacheKey, c);
          return c;
        }
        g.fillStyle = baseColor;
        g.fillRect(0, 0, size, size);

        const seed = hashString(key) + variant * 31;
        for (let y = 0; y < size; y += 1) {
          for (let x = 0; x < size; x += 1) {
            const r = rand2(x, y, seed);
            if (shape === "tree" && r > 0.65) {
              g.fillStyle = "rgba(0,0,0,0.25)";
              g.fillRect(x, y, 1, 1);
            }
            if (shape === "ore" && r > 0.7) {
              g.fillStyle = "rgba(255,255,255,0.25)";
              g.fillRect(x, y, 1, 1);
            }
            if (shape === "unit" && r > 0.8) {
              g.fillStyle = "rgba(0,0,0,0.35)";
              g.fillRect(x, y, 1, 1);
            }
          }
        }
        cache.set(cacheKey, c);
        return c;
      };

      return {
        getTerrainSprite(level, variant) {
          const color = level && level.color ? level.color : "#2b2f2c";
          return makeSprite(`terrain-${level ? level.height : "x"}`, color, variant, "ground");
        },
        getResourceSprite(resource, variant) {
          if (resource.sprite2d) {
            return makeSprite(resource.id, resource.color, variant, "bitmap", resource.sprite2d, tileSizePx);
          }
          const shape = resource.category === "mineral" ? "ore" : "tree";
          return makeSprite(resource.id, resource.color, variant, shape);
        },
        getUnitSprite(unit) {
          return makeSprite(unit.id, unit.color, 0, "unit");
        },
        getBuildingSprite(building) {
          const sizePx = (building.size?.w || 1) * tileSizePx;
          if (building.sprite2d) {
            return makeSprite(building.id, building.color, 1, "bitmap", building.sprite2d, sizePx);
          }
          return makeSprite(building.id, building.color, 1, "ore", null, sizePx);
        }
      };
    })();

    const hexToRgb = (hex) => {
      if (!hex || typeof hex !== "string" || !hex.startsWith("#")) return { r: 43, g: 47, b: 44 };
      const clean = hex.replace("#", "");
      const num = parseInt(clean, 16);
      if (Number.isNaN(num)) return { r: 43, g: 47, b: 44 };
      return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
    };

    const shadeColor = (hex, amount) => {
      const c = hexToRgb(hex);
      const clamp = (v) => Math.max(0, Math.min(255, v));
      return `rgb(${clamp(c.r + amount)}, ${clamp(c.g + amount)}, ${clamp(c.b + amount)})`;
    };

    const FALLBACK_TERRAIN = ["#223a4d", "#5aa6a9", "#8ac37c", "#b5c07d", "#d3b56a", "#9f6a3f"];

    const View = {
      draw(state) {
        const size = state.map.size;
        const height = state.map.height;
        const resources = state.map.resources;
        const roads = state.map.roads;
        const buildings = state.map.buildings;
        const terrainLevels = state.defs.terrainLevels;
        const resDefs = state.defs.resources;
        const unitDefs = state.defs.units;
        const buildingDefs = state.defs.buildings;
        const anchors = state.runtime.buildingAnchors;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (let y = 0; y < size; y += 1) {
          for (let x = 0; x < size; x += 1) {
            const idx = y * size + x;
            const level = terrainLevels.find((l) => l.height === height[idx]) || terrainLevels[0];
            const fallback = FALLBACK_TERRAIN[height[idx]] || "#2b2f2c";
            const terrainLevel = level ? { ...level, color: level.color || fallback } : { height: height[idx], color: fallback };
            const variant = (x * 17 + y * 11) % 3;
            const sprite = SpriteFactory.getTerrainSprite(terrainLevel, variant);
            ctx.drawImage(sprite, x * tileSizePx, y * tileSizePx);

            const roadLevel = roads[idx];
            if (roadLevel > 0) {
              ctx.fillStyle = `rgba(100, 70, 40, ${0.2 + roadLevel * 0.1})`;
              ctx.fillRect(x * tileSizePx, y * tileSizePx, tileSizePx, tileSizePx);
            }

            const resIndex = resources[idx];
            if (resIndex > 0) {
              const resDef = resDefs[resIndex - 1];
              if (resDef) {
                const variant = (x + y) % 3;
                const sprite = SpriteFactory.getResourceSprite(resDef, variant);
                ctx.globalAlpha = getResourceFade();
                ctx.drawImage(sprite, x * tileSizePx, y * tileSizePx);
                ctx.globalAlpha = 1;
              }
            }
          }
        }

        // building layer on top
        for (let y = 0; y < size; y += 1) {
          for (let x = 0; x < size; x += 1) {
            const idx = y * size + x;
            const anchorIndex = anchors[idx];
            if (anchorIndex === idx) {
              const buildingIndex = buildings[idx];
              if (buildingIndex > 0) {
                const b = buildingDefs[buildingIndex];
                if (b) {
                  const sprite = SpriteFactory.getBuildingSprite(b);
                  const w = (b.size?.w || 1) * tileSizePx;
                  const h = (b.size?.h || 1) * tileSizePx;
                  ctx.drawImage(sprite, x * tileSizePx, y * tileSizePx, w, h);
                }
              }
            }
          }
        }

        // construction sites
        state.runtime.buildingSites.forEach((site) => {
          if (site.active) return;
          const px = site.x * tileSizePx;
          const py = site.y * tileSizePx;
          const w = site.w * tileSizePx;
          const h = site.h * tileSizePx;
          ctx.fillStyle = "rgba(180, 140, 80, 0.35)";
          ctx.fillRect(px, py, w, h);
          ctx.strokeStyle = "rgba(245, 220, 150, 0.75)";
          ctx.strokeRect(px + 0.5, py + 0.5, w - 1, h - 1);
          const barW = Math.max(4, w - 2);
          ctx.fillStyle = "rgba(40, 25, 15, 0.85)";
          ctx.fillRect(px + 1, py + h - 3, barW, 2);
          ctx.fillStyle = "rgba(120, 220, 120, 0.9)";
          ctx.fillRect(px + 1, py + h - 3, Math.round(barW * Math.max(0, Math.min(1, site.progress))), 2);
        });

        // units on top of buildings
        state.runtime.unitEntities.forEach((entity) => {
          const unit = unitDefs[entity.typeIndex];
          if (!unit) return;
          const sprite = SpriteFactory.getUnitSprite(unit);
          const px = Math.round((entity.x - 0.5) * tileSizePx);
          const py = Math.round((entity.y - 0.5) * tileSizePx);
          ctx.drawImage(sprite, px, py);
        });
      }
    };

    const setText = (el, value) => {
      if (!el) return;
      el.textContent = String(value);
    };

    const updateHud = (hud) => {
      if (!hud || typeof hud !== "object") return;
      setText(ui.woodHud, hud.wood ?? "0");
      setText(ui.foodHud, hud.food ?? "0");
      setText(ui.happyHud, hud.happy ?? "0");
      setText(ui.popHud, hud.pop ?? "0/0");
      setText(ui.freeHud, hud.free ?? "0");
      setText(ui.hutHud, hud.hut ?? "0");
      setText(ui.lumberHud, hud.lumber ?? "0");
    };

    const updateStatus = (status) => {
      if (!status || typeof status !== "object") return;
      setText(ui.popInfo, status.pop ?? "");
      setText(ui.stepInfo, status.step ?? "");
    };

    const updateTileInfo = (tile) => {
      if (!tile || typeof tile !== "object") return;
      setText(ui.tileInfo, tile.position ?? "-");
      setText(ui.resourceInfo, tile.resource ?? "-");
      setText(ui.qtyInfo, tile.qty ?? "-");
    };

    const setPauseLabel = (paused) => {
      setText(ui.toggleSimButton, paused ? "Play" : "Pause");
    };

  return {
    draw: View.draw,
    updateHud,
    updateStatus,
    updateTileInfo,
    setPauseLabel
  };
};
