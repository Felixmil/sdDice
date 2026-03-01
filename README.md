# sdDice — Stream Deck Dice Roller

A Stream Deck plugin for rolling RPG dice. Supports d4, d6, d8, d10, d12, d20, and a fully customizable die.

## Features

- **7 dice types**: d4, d6, d8, d10, d12, d20, and custom limits
- **Distinct shapes** per die type (triangle, square, diamond, pentagon, hexagon)
- **Advantage/disadvantage rolls** via double press — shows both results (e.g. `14 | 8`)
- **Auto-reset** — result display clears after 10 seconds
- **Multiple dice** — roll 2d6, 3d8, etc. and sum (or take the median)
- **Add value** — add a flat modifier to every roll (e.g. +3 to hit)

## Installation

1. Download the latest release `.streamDeckPlugin` file
2. Double-click to install via the Stream Deck app
3. Drag any die action onto a button from the Stream Deck action list

## Usage

### Interactions

| Input | Result |
|---|---|
| **Short press** | Roll the die — result shown for 10 seconds |
| **Double press** | Roll two dice independently — shows `X \| Y` (for advantage/disadvantage) |
| **Long press** | Reset to standby (shows die name) |

### Standby display

Each button shows its die name in standby (`d4`, `d6`, `d20`, etc.) overlaid on the die shape. The custom die shows only the shape.

### Settings (Property Inspector)

| Setting | Description |
|---|---|
| **Amount of dice** | How many dice to roll and sum (default: 1) |
| **Median** | When rolling multiple dice, use the median value instead of the sum |
| **Add value** | Flat value added to every roll (can be negative) |
| **Lower / Upper limit** | Custom die only — sets the range of the roll (inclusive) |

## Die Shapes

| Die | Shape |
|---|---|
| d4 | Triangle |
| d6 | Square |
| d8 | Diamond |
| d10, d12 | Pentagon |
| d20, Custom | Hexagon |

## License

Icons taken from [FontAwesome](https://fontawesome.com/) — licensed under [CC BY 4.0](https://fontawesome.com/license/free).
