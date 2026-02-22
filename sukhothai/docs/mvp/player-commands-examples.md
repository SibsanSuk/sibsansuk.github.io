# Player Commands Examples (MVP)

## Command Envelope
```json
{
  "command_id": "cmd-0001",
  "type": "PlaceBuilding",
  "issued_at_tick": 120,
  "payload": {}
}
```

## Examples

### 1) PlaceBuilding
```json
{
  "command_id": "cmd-0001",
  "type": "PlaceBuilding",
  "issued_at_tick": 120,
  "payload": {
    "building_id": "water_collect_point",
    "origin_tile": { "x": 18, "y": 22 },
    "rotation": 0
  }
}
```

### 2) RemoveBuilding
```json
{
  "command_id": "cmd-0002",
  "type": "RemoveBuilding",
  "issued_at_tick": 155,
  "payload": {
    "building_instance_id": "bld-0042",
    "refund_policy": "partial"
  }
}
```

### 3) SetLaborPriority
```json
{
  "command_id": "cmd-0003",
  "type": "SetLaborPriority",
  "issued_at_tick": 200,
  "payload": {
    "building_type_id": "rice_farm",
    "priority": "high"
  }
}
```

### 4) SetGameSpeed
```json
{
  "command_id": "cmd-0004",
  "type": "SetGameSpeed",
  "issued_at_tick": 215,
  "payload": {
    "speed": "x2"
  }
}
```

### 5) AcknowledgeTutorialStep
```json
{
  "command_id": "cmd-0005",
  "type": "AcknowledgeTutorialStep",
  "issued_at_tick": 230,
  "payload": {
    "step_id": "tutorial_place_first_water_collect_point"
  }
}
```

### 6) SetOverlayLayerVisibility
```json
{
  "command_id": "cmd-0006",
  "type": "SetOverlayLayerVisibility",
  "issued_at_tick": 260,
  "payload": {
    "layer_id": "water_network_layer",
    "visible": true
  }
}
```

## Runtime Validation Rules
- `command_id` must be unique in a session.
- `issued_at_tick` must be greater than or equal to last committed tick.
- `PlaceBuilding` must pass placement validation before commit.
- `SetGameSpeed` accepts only `pause | x1 | x2`.
- Invalid commands must be rejected with a reason code.

## ID Model Guidelines (MVP)
- Use both `*_type_id` and `*_instance_id`.
- `*_type_id` is static content ID (from game data), e.g. `rice_farm`, `laborer`.
- `*_instance_id` is runtime entity ID, e.g. `bld_000123`, `wrk_000987`.

### Building IDs
- `building_type_id`: what kind of building.
- `building_instance_id`: which exact building on the map.

Example:
```json
{
  "command_id": "cmd-0101",
  "type": "SetBuildingWorkers",
  "issued_at_tick": 420,
  "payload": {
    "building_instance_id": "bld_000123",
    "target_workers": 6
  }
}
```

### Worker IDs
- If workers are simulated as walkers, each worker should have `worker_instance_id`.
- Keep `worker_type_id` for role grouping (laborer/carrier/service_walker).

Example:
```json
{
  "command_id": "cmd-0102",
  "type": "AssignWorker",
  "issued_at_tick": 425,
  "payload": {
    "worker_instance_id": "wrk_000987",
    "to_building_instance_id": "bld_000123"
  }
}
```
