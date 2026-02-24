# GAME_DEV - Game Design and Development

## Course Information
- Program:
- Level: Bachelor's Degree
- Format: 7 sessions (1 session per week)
- Semester/Academic Year:
- Instructor:

## Course Description
Course focuses on practical game development workflow with modern game engines, component-based architecture, and rapid prototyping in Unity.

## Course Learning Outcomes (CLO)
1. Explain core concepts and modules of a modern game engine used in industry.
2. Build small gameplay prototypes in Unity using GameObjects, Components, Physics, and Script.
3. Apply basic SOLID thinking in component design.
4. Develop and present a playable mini prototype.

## 7-Session Plan
| Session | Topics | In-Class Activity | Assignment/Lab |
|---|---|---|---|
| 1 | Game Engine Fundamentals + Unity Basics | Engine modules overview, Unity UI/layout/windows walkthrough, create Cube from Empty with Components, physics/collision/rendering separation, intro scripting + loop instantiate Rigidbody objects | Unity Lab 01 |
| 2 | Scene, Prefab, Transform System | Prefab workflow, hierarchy structure, reusable object setup | Unity Lab 02 |
| 3 | Input + Basic Gameplay Loop | Player control, interaction triggers, game state basics | Unity Lab 03 |
| 4 | Physics-driven Gameplay | Rigidbody tuning, collision events, simple mechanics | Unity Lab 04 |
| 5 | UI, Feedback, and Game Feel | HUD, score/health UI, VFX/SFX integration basics | Unity Lab 05 |
| 6 | Production Workflow + Build | Project structure, optimization basics, build pipeline | Final Prototype Development |
| 7 | Final Playtest and Presentation | Demo, critique, iteration notes | Final Submission + Reflection |

## Session 1 (Detailed Teaching Plan)
### Session Goal
Students understand what a game engine is, how Unity is structured, and why component-based design enables scalable development.

### Expected Outcomes
By the end of Session 1, students can:
- Explain key modules inside a game engine.
- Navigate Unity Editor (UI, Layout, Windows, Project/Files).
- Create a Cube manually from an Empty GameObject by adding Components.
- Demonstrate that Rendering, Physics (Rigidbody), and Collision are independent systems.
- Write a basic script to instantiate Rigidbody objects in a loop.

### Teaching Flow (Suggested)
1. Industry Context and Engine Overview (20-30 min)
- What is a game engine?
- Industry usage examples and why teams use engines.
- Core engine modules: Rendering, Physics, Input, Audio, Animation, Scripting, Scene Management, UI, Asset Pipeline.

2. Unity Editor Foundation (35-45 min)
- UI and layout overview.
- Key windows: Scene, Game, Hierarchy, Inspector, Project, Console.
- Project and file/folder structure.

3. Component-based Design Concept (35-45 min)
- GameObject as container.
- Components as independent behavior modules.
- Unity design pattern: add/remove components to compose behavior.
- SOLID mindset for component design (high-level intro):
  - Single Responsibility
  - Open/Closed
  - Dependency direction awareness

4. Guided Lab: Build Cube from Empty (45-60 min)
- Create Empty GameObject.
- Add Mesh Filter + Mesh Renderer (visual).
- Add Box Collider (collision).
- Add Rigidbody (physics).
- Observe behavior when each component is enabled/disabled.
- Discussion: why independent modules are powerful.

5. Intro Script: Instantiate with Loop (30-40 min)
- Create C# script and attach to spawner object.
- Use loop instantiate to spawn multiple Rigidbody cubes.
- Let objects fall and collide to show emergent behavior.
- Quick parameter tweak: count, spacing, spawn height.

### In-Class Demo Script (Starter)
```csharp
using UnityEngine;

public class CubeRainSpawner : MonoBehaviour
{
    public GameObject cubePrefab;
    public int count = 20;
    public float spacing = 1.25f;
    public float height = 10f;

    void Start()
    {
        for (int i = 0; i < count; i++)
        {
            Vector3 pos = transform.position + new Vector3(i * spacing, height, 0f);
            Instantiate(cubePrefab, pos, Quaternion.identity);
        }
    }
}
```

## Assessment (Suggested for 7 Sessions)
- Attendance / Participation: 15%
- Weekly Labs (Session 1-5): 35%
- Final Prototype: 35%
- Final Presentation + Reflection: 15%

## Tools and Software
- Unity (LTS recommended)
- Visual Studio / VS Code

## Session 1 Lab Checklist
- Explain game engine in your own words.
- Identify all major Unity windows.
- Build a functional cube from Empty using components.
- Show separate roles of Renderer / Collider / Rigidbody.
- Run script that spawns multiple rigidbody cubes via loop.

## Teaching Notes
- Keep Session 1 highly visual and hands-on.
- Emphasize concept first, then code.
- Use mistakes intentionally (disable a component) to show system independence.
