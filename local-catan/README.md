# Local Catan - 4 Player Local Game

A simplified local-only version of Catan for 4 players on the same machine.

## Features

- 4-player local multiplayer
- Classic Catan board (19 hexes)
- Resource management
- Building settlements, cities, and roads
- Victory point tracking
- Turn-based gameplay

## Official Catan Rules Implemented

Based on the official Settlers of Catan rules:

### Setup
- 19 hex tiles in classic layout
- Number tokens (2-12, excluding 7)
- Resource distribution: 3 Brick, 4 Wood, 4 Sheep, 4 Wheat, 3 Ore, 1 Desert
- 4 players with different colors (Red, Blue, Orange, White)

### Gameplay
- Turn order: Players take turns in order
- Dice rolling: Roll 2 dice each turn
- Resource production: Resources distributed based on dice roll
- Building costs:
  - Settlement: 1 Brick, 1 Wood, 1 Sheep, 1 Wheat
  - City: 2 Wheat, 3 Ore (upgrade from settlement)
  - Road: 1 Brick, 1 Wood
- Victory points:
  - Settlement: 1 VP
  - City: 2 VP
  - Longest Road: 2 VP (5+ continuous roads)
  - Largest Army: 2 VP (3+ knights)
- Winning: First to 10 victory points wins

### Special Rules
- 7 on dice: Robber activates (not fully implemented yet)
- Distance rule: Settlements must be at least 2 edges apart
- Initial placement: Two rounds (not fully implemented yet)

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

## Building

```bash
npm run build
```

## Project Structure

```
local-catan/
├── src/
│   ├── game/
│   │   ├── types.ts          # Game type definitions
│   │   └── GameEngine.ts     # Core game logic
│   ├── ui/
│   │   ├── GameRenderer.ts   # PixiJS rendering
│   │   └── UIManager.ts      # UI management
│   └── main.ts               # Entry point
├── assets/                   # Game assets (to be copied from colonist)
└── index.html
```

## Notes

This is a simplified implementation. Full features would include:
- Complete board geometry calculations
- Proper vertex/edge adjacency
- Development cards
- Trading
- Ports
- Robber mechanics
- Initial placement phase
- Longest road calculation
- Largest army tracking

## Assets

Assets should be copied from `colonist-client-code/assets/` for:
- Hex textures
- Building sprites
- Road sprites
- Number tokens
- UI elements

