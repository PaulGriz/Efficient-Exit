# Design Document

# Wedding Exit Sorting Animation

## 1. Project Summary

Build an interactive browser-based simulation that visualizes people leaving a wedding ceremony space. The main experience is an overhead animated view of rows of chairs, people represented as boxes, and different “exit algorithms” that control how people leave their seats and move toward the building exit.

The app should be built with **Next.js, React, and TypeScript**, using **ShadCN UI** for the interface and **Three.js via React Three Fiber** for the animated overhead scene.

IMPORTANT: Always use Bun. Never use npm or yarn.

Next.js App Router is a good fit because it is the current file-system routing model for Next.js and supports modern React patterns like Server Components and Suspense. React Three Fiber is a React renderer for Three.js that allows scenes to be built declaratively as React components. ShadCN UI provides reusable components for the controls, sidebar, sliders, dialogs, and buttons needed in this project.

---

## 2. Goals

The project should allow a user to:

1. View an overhead wedding seating layout.
2. Play, pause, reset, and adjust the animation.
3. Modify the number of chairs and people.
4. Select different exit algorithms from a sidebar.
5. See live stats, including total duration from start until everyone exits.
6. Drag a floating controls dialog inside the main simulation window.
7. Detect and resolve collisions between people as they move through aisles and toward exits.

---

## 3. Non-Goals for Initial Version

The first version should not attempt to simulate full human behavior or physics-level realism. It should not require detailed 3D character models, pathfinding through arbitrary architecture, or multiplayer/session sharing.

People can be boxes. Chairs can be simple rectangular boxes. The camera can remain fixed in an overhead orthographic view.

---

## 4. Recommended Technology Stack

### Core Framework

Use:

- **Next.js**
- **React**
- **TypeScript**
- **Tailwind CSS**
- **ShadCN UI**

ShadCN is appropriate because the project needs controls, sliders, dialogs, buttons, and a sidebar. Its component library includes reusable primitives that map well to the required interface.

### 3D / Animation Layer

Use:

- **three**
- **@react-three/fiber**
- **@react-three/drei**

Use Three.js for:

- Chair meshes
- Person box meshes
- Overhead camera
- Scene lighting
- Position interpolation
- Collision debugging helpers
- Bounding boxes

Three.js `Box3` should be used for axis-aligned bounding boxes. `Box3.setFromObject()` can compute a world-axis-aligned bounding box for a 3D object and its children while accounting for world transforms.

### State Management

Use:

- **Zustand**

This simulation will have many shared state values: playback state, speed, selected algorithm, chair count, people count, elapsed time, collision state, and simulation configuration. Zustand is a lightweight client-side state management library that works well for shared React state.

### Draggable Controls Dialog

Use:

- **ShadCN Card or Dialog styling**
- **dnd-kit** for drag behavior

The floating controls panel should visually use ShadCN components, but the drag mechanics should be handled by dnd-kit.

The “controls dialog” should probably behave more like a draggable floating panel than a true modal dialog, because a modal dialog would make the background inert and interfere with watching or interacting with the animation underneath.

### Testing

Use:

- **Vitest** for unit tests
- **React Testing Library** for UI/component tests
- **Playwright** for end-to-end tests

---

## 5. Application Layout

The app should have one primary page.

```text
┌───────────────────────────────────────────────────────────────┐
│ App Shell                                                     │
│                                                               │
│ ┌───────────────┐ ┌─────────────────────────────────────────┐ │
│ │ Sidebar       │ │ Main Simulation Window                  │ │
│ │               │ │                                         │ │
│ │ Algorithms    │ │ Top Controls: Play / Pause / Reset      │ │
│ │ - Row by row  │ │                                         │ │
│ │ - Front first │ │ 3D overhead scene                       │ │
│ │ - Back first  │ │ rows of chairs + people boxes           │ │
│ │ - Random      │ │                                         │ │
│ │ - Priority    │ │ Draggable controls panel                │ │
│ │               │ │                                         │ │
│ │               │ │ Bottom-left stats section               │ │
│ └───────────────┘ └─────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────┘
```

---

## 6. Main UI Components

### 6.1 App Shell

Responsible for:

- Overall layout
- Sidebar positioning
- Main simulation area
- Theme consistency
- Responsive behavior

Use ShadCN layout primitives and Tailwind utilities.

---

### 6.2 Algorithm Sidebar

Purpose: let the user select the exit strategy.

Suggested algorithms for the first version:

1. **Front-to-back**
   - People in the front rows exit first.
2. **Back-to-front**
   - People in the back rows exit first.
3. **Outside-in**
   - People closest to aisles exit first.
4. **Inside-out**
   - People farthest from aisles exit first.
5. **Random**
   - Randomized departure order.
6. **Table/party priority**
   - Groups leave together.
7. **Shortest-path greedy**
   - People who can reach the exit fastest are released first.
8. **Congestion-aware**
   - People are released only when nearby path segments are clear.

The sidebar should show the selected algorithm, a short description, and eventually tunable algorithm parameters.

---

### 6.3 Top Playback Controls

Location: top of the main simulation window.

Controls:

- Play
- Pause
- Reset
- Step forward
- Speed multiplier
- Optional timeline scrubber

Use ShadCN Button, Toggle, Slider, and Tooltip components.

---

### 6.4 Draggable Controls Panel

Location: inside the main simulation window.

Behavior:

- Movable by dragging a handle.
- Constrained to the bounds of the main simulation container.
- Should not block the sidebar.
- Should not pause the animation unless the user explicitly pauses.
- Should include sliders and inputs.

Controls:

- Animation speed
- Number of chair rows
- Number of chairs per row
- Number of people
- Aisle width
- Exit width
- Person box size
- Collision padding
- Spawn/departure delay
- Show/hide collision debug boxes
- Show/hide path lines

Important design decision: this should be a **floating controls panel**, not necessarily a strict modal dialog, because the user needs to continue watching and interacting with the simulation while it is open.

---

### 6.5 Stats Section

Location: bottom-left of the main simulation window.

Stats to show:

- Elapsed animation time
- Total completion time
- Number of people exited
- Number of people remaining
- Average exit time per person
- Current congestion count
- Number of active collisions or blocked moves
- Algorithm name
- Simulation speed

The key metric is:

> Duration from start to end, where “end” means every person has exited the building.

The stats section should update live during playback and freeze the final duration once the simulation completes.

---

## 7. 3D Scene Design

### 7.1 Camera

Use an orthographic overhead camera.

The scene should feel like a 2D floor plan but still use 3D meshes:

- X axis: horizontal seating direction
- Z axis: depth / rows
- Y axis: height

Camera position:

```text
Camera above the room, looking down along the Y axis.
```

This keeps the experience readable and makes collision logic easier.

---

### 7.2 Scene Objects

#### Chairs

Represent each chair as a rectangular box.

Properties:

- Chair ID
- Row index
- Column index
- Position
- Width
- Depth
- Occupied state
- Optional reserved group ID

#### People

Represent each person as a box.

Properties:

- Person ID
- Assigned chair ID
- Current position
- Target position
- Current path
- Movement state
- Exit time
- Group ID
- Collision bounds
- Speed
- Priority/order value

Movement states:

```text
Seated → Standing → Waiting → Moving → Exited
```

#### Exit

Represent the exit as a rectangular opening or target zone.

Properties:

- Position
- Width
- Queue area
- Exit threshold
- Direction of travel

---

## 8. Simulation Model

The simulation should be separated from rendering.

### Core Simulation Modules

```text
/simulation
  /models
    Chair.ts
    Person.ts
    Room.ts
    Exit.ts
    Algorithm.ts
  /algorithms
    frontToBack.ts
    backToFront.ts
    random.ts
    outsideIn.ts
    congestionAware.ts
  /collision
    boundingBoxes.ts
    collisionResolver.ts
  /pathing
    grid.ts
    pathPlanner.ts
  /engine
    simulationEngine.ts
    timeline.ts
```

The rendering layer should read the simulation state but not own the simulation rules.

---

## 9. Exit Algorithm Design

Each algorithm should implement a shared interface conceptually like:

```text
Algorithm
- id
- name
- description
- initialize(room, people)
- getNextDepartures(state)
- update(state, deltaTime)
```

No code is needed yet, but the design should ensure every algorithm can answer:

1. Who is allowed to stand up next?
2. Who must wait?
3. Which path should each person take?
4. How should congestion be handled?
5. When is the algorithm complete?

---

## 10. Collision Detection Requirements

Collision detection is required because people are represented as moving boxes. Without collision detection, multiple people could occupy the same aisle, overlap visually, or pass through each other.

### Recommended Approach

Use **axis-aligned bounding boxes** for the first version.

Three.js has `Box3`, which supports bounding-box calculations and intersection-style workflows for 3D objects. For this project, every person box should have a collision box that is updated as the person moves.

For every moving person:

1. Compute the proposed next position.
2. Build/update that person’s bounding box.
3. Check against:
   - Other moving people
   - Waiting people
   - Chairs
   - Walls
   - Exit bottleneck area
4. If a collision would occur:
   - Stop movement for that frame, or
   - Reduce speed, or
   - Try a small lateral adjustment, or
   - Queue behind the blocking person.

### Broad Phase and Narrow Phase

For the first version:

- Broad phase: spatial grid partitioning.
- Narrow phase: `Box3` intersection checks.

This avoids checking every person against every other person as the crowd grows.

### Collision Debug Mode

Add a debug toggle in the controls panel:

- Show bounding boxes
- Highlight colliding people
- Highlight blocked path segments
- Show intended path lines
- Show exit queue area

---

## 11. Pathfinding and Movement

### MVP Pathing

For the first version, paths can be simple waypoints:

```text
Chair position → row aisle → center aisle → exit queue → exit
```

This is enough for a controlled wedding seating layout.

### Future Pathing

Later versions can use:

- Grid-based A*
- Flow fields
- Local avoidance
- Congestion penalties
- Group movement constraints

### Movement Model

Each person should move toward the next waypoint. When the waypoint is reached, the person advances to the next waypoint. When the final exit zone is reached, the person state becomes `Exited`.

---

## 12. Data Model

### Room Configuration

```text
RoomConfig
- rowCount
- chairsPerRow
- chairWidth
- chairDepth
- chairSpacing
- rowSpacing
- aisleWidth
- exitPosition
- exitWidth
```

### Simulation Configuration

```text
SimulationConfig
- peopleCount
- animationSpeed
- personWidth
- personDepth
- personSpeed
- collisionPadding
- departureInterval
- selectedAlgorithmId
- debugMode
```

### Runtime State

```text
SimulationState
- status: idle | playing | paused | complete
- elapsedTime
- completionTime
- people
- chairs
- activeCollisions
- exitedCount
- selectedAlgorithm
```

---

## 13. State Management Plan

Use Zustand for client-side simulation and UI state.

Suggested stores:

```text
useSimulationStore
- status
- elapsedTime
- completionTime
- selectedAlgorithm
- play()
- pause()
- reset()
- step()
- update(deltaTime)

useConfigStore
- roomConfig
- simulationConfig
- updateChairCount()
- updatePeopleCount()
- updateSpeed()

useUiStore
- controlsPanelPosition
- sidebarOpen
- debugOptions
```

Keep derived stats out of persistent state where possible. Compute them from the current simulation state.

---

## 14. Rendering Plan with Three.js / React Three Fiber

Use a single `<Canvas>` for the simulation viewport.

Render groups:

```text
<RoomScene>
  <Floor />
  <Chairs />
  <People />
  <Exit />
  <Paths />
  <CollisionDebug />
</RoomScene>
```

Recommended responsibilities:

- React components render meshes.
- Simulation engine updates positions.
- React Three Fiber `useFrame` drives per-frame simulation updates while playing.
- Zustand stores global state.
- Three.js objects handle vectors, boxes, and mesh positioning.

---

## 15. UI Library Usage

Use ShadCN components for:

- Sidebar
- Button
- Slider
- Dialog or floating Card
- Select
- Tabs
- Badge
- Separator
- Tooltip
- Switch
- Sheet for responsive mobile sidebar

The algorithm selector should use the ShadCN Sidebar component. The floating controls panel can use ShadCN Card styling and dnd-kit movement behavior.

---

## 16. Accessibility Requirements

Even though the simulation is visual, the UI controls should be accessible.

Requirements:

- Play/pause buttons must have clear labels.
- Sliders must have labels and current values.
- Algorithm selection must be keyboard accessible.
- Stats should be exposed as readable text, not only visual elements.
- The simulation canvas should have an accessible description.
- Motion speed controls should support reduced-motion users.

---

## 17. Performance Considerations

Potential bottlenecks:

- Too many React re-renders per frame.
- Too many collision checks.
- Recomputing paths every frame.
- Updating every person through React state individually.

Mitigations:

- Store mutable simulation positions efficiently.
- Batch state updates.
- Use spatial partitioning for collisions.
- Use instanced meshes for chairs if the chair count becomes large.
- Avoid unnecessary React component re-renders inside the animation loop.
- Recalculate paths only when configuration changes or blockage requires it.

---

## 18. Testing Plan

### Unit Tests

Test:

- Algorithm ordering
- Path generation
- Collision detection
- Completion-time calculation
- People/chair layout generation
- Reset behavior

Use Vitest for pure simulation logic.

### Component Tests

Test:

- Play/pause button behavior
- Slider updates
- Algorithm selector
- Stats display
- Controls panel visibility

### End-to-End Tests

Use Playwright for:

- Starting the simulation
- Pausing the simulation
- Changing algorithms
- Dragging the controls panel
- Adjusting people/chair counts
- Confirming the simulation eventually reaches the complete state

---

## 19. Implementation Phases

### Phase 1: Project Setup

Tasks:

1. Create Next.js project with TypeScript.
2. Configure Tailwind CSS.
3. Install and configure ShadCN UI.
4. Add base layout.
5. Add placeholder sidebar and main simulation area.
6. Add basic design tokens and theme.

Deliverable:

A static UI shell with sidebar, main window, top controls, floating controls placeholder, and stats placeholder.

---

### Phase 2: Seating Layout

Tasks:

1. Define room, chair, and person data models.
2. Generate rows of chairs from configuration.
3. Assign people to chairs.
4. Render the overhead scene using React Three Fiber.
5. Add orthographic camera.
6. Render chairs and people as boxes.

Deliverable:

A static overhead wedding seating scene.

---

### Phase 3: Playback Engine

Tasks:

1. Add simulation status: idle, playing, paused, complete.
2. Add play, pause, reset, and step controls.
3. Add elapsed-time tracking.
4. Add animation speed control.
5. Move people along basic waypoint paths.
6. Mark people as exited when they reach the exit.

Deliverable:

People can leave their seats and move toward the exit using one hardcoded algorithm.

---

### Phase 4: Algorithms

Tasks:

1. Define the shared algorithm interface.
2. Implement front-to-back.
3. Implement back-to-front.
4. Implement outside-in.
5. Implement random.
6. Add sidebar algorithm selection.
7. Reset simulation when algorithm changes.
8. Add algorithm descriptions.

Deliverable:

The sidebar can switch between multiple exit strategies.

---

### Phase 5: Collision Detection

Tasks:

1. Add bounding boxes for people.
2. Add bounding boxes for chairs and walls.
3. Detect person-person collisions.
4. Detect person-chair collisions.
5. Detect exit bottleneck congestion.
6. Add blocked/waiting behavior.
7. Add debug mode to visualize bounding boxes.

Deliverable:

People no longer overlap while exiting.

---

### Phase 6: Draggable Controls Panel

Tasks:

1. Build floating controls panel using ShadCN Card/Dialog styling.
2. Add dnd-kit drag behavior.
3. Constrain movement to the simulation window.
4. Add sliders for animation speed, chair count, people count, aisle width, and collision padding.
5. Ensure changing layout values resets or regenerates the simulation safely.

Deliverable:

A movable controls panel inside the main simulation window.

---

### Phase 7: Stats and Completion Metrics

Tasks:

1. Track exited count.
2. Track remaining count.
3. Track elapsed time.
4. Capture completion time when the last person exits.
5. Show active collision count.
6. Show average exit time.
7. Freeze final stats at completion.

Deliverable:

The bottom-left stats panel accurately reports simulation progress and final duration.

---

### Phase 8: Polish and Testing

Tasks:

1. Add responsive layout behavior.
2. Add keyboard-accessible controls.
3. Add unit tests for algorithms and collision detection.
4. Add component tests for controls.
5. Add Playwright tests for main user flows.
6. Add debug tools.
7. Tune default room dimensions and animation speed.

Deliverable:

A usable, tested MVP.

---

## 20. Suggested Folder Structure

```text
app/
  page.tsx
  layout.tsx

components/
  app-shell/
  sidebar/
  simulation-window/
  controls/
  stats/
  ui/

features/
  simulation/
    components/
      RoomScene.tsx
      Chairs.tsx
      People.tsx
      ExitZone.tsx
      CollisionDebug.tsx
    engine/
      simulationEngine.ts
      timeline.ts
    algorithms/
      frontToBack.ts
      backToFront.ts
      outsideIn.ts
      random.ts
      congestionAware.ts
    collision/
      boundingBoxes.ts
      spatialGrid.ts
      collisionResolver.ts
    pathing/
      waypointPlanner.ts
      gridPlanner.ts
    models/
      chair.ts
      person.ts
      room.ts
      algorithm.ts
    stores/
      useSimulationStore.ts
      useConfigStore.ts
      useUiStore.ts

lib/
  math/
  constants/
  utils/
```

---

## 21. Key Design Decisions

### Use React Three Fiber instead of raw Three.js

This keeps the scene aligned with React’s component model while still allowing direct Three.js math and collision utilities.

### Use boxes for people and chairs

Boxes simplify rendering, movement, and collision detection.

### Use overhead orthographic view

This matches the requested overhead visual and reduces the complexity of camera controls.

### Keep simulation logic separate from rendering

This makes algorithms, pathfinding, and collision detection testable without requiring the browser or canvas.

### Treat the controls “dialog” as a draggable floating panel

A strict modal dialog would make the rest of the UI inert, which is not ideal for live simulation controls. Use ShadCN styling, but implement it as a floating panel unless a true modal is needed.

---

## 22. MVP Definition

The MVP is complete when:

1. The user can see rows of chairs from overhead.
2. People are represented as boxes on chairs.
3. The user can play, pause, and reset the animation.
4. The user can select at least three exit algorithms.
5. People exit the room without visually overlapping.
6. The controls panel can be dragged inside the main window.
7. Sliders can change animation speed, chair count, and people count.
8. The stats panel shows elapsed time and final completion duration.
9. Collision detection is implemented for person-person and person-chair interactions.

---

## 23. Future Enhancements

Potential later improvements:

- Multiple exits
- Group/family-based seating behavior
- Priority rows for wedding party or elderly guests
- Bottleneck heatmap
- Algorithm comparison mode
- Replay export
- Save/load simulation configurations
- 2D minimap overlay
- A* pathfinding
- Realistic pedestrian flow models
- Instanced rendering for large guest counts
- “Best algorithm” scoring based on completion time and congestion

---

## 24. Recommended First Build Order

Start with the UI shell, then the static 3D scene, then one simple exit algorithm. After that, add collision detection before adding more algorithms. This order avoids building algorithm complexity on top of a movement system that does not yet handle blocked paths or overlapping people.

---

## 25. References

- Next.js App Router Documentation: <https://nextjs.org/docs/app>
- React Three Fiber TypeScript Documentation: <https://r3f.docs.pmnd.rs/api/typescript>
- ShadCN UI Components Documentation: <https://ui.shadcn.com/docs/components>
- Three.js Box3 Documentation: <https://threejs.org/docs/pages/Box3.html>
- MDN: Bounding Volume Collision Detection with Three.js: <https://developer.mozilla.org/en-US/docs/Games/Techniques/3D_collision_detection/Bounding_volume_collision_detection_with_THREE.js>
