---
name: math-tools
description: "Mathematical operations and calculations. Basic arithmetic, algebra, geometry, statistics. No external dependencies. No API key required."
---

# Math Tools Skill

Perform mathematical calculations and operations without external dependencies.

## When to Use

Γ£à **USE this skill when:**

- "Calculate X"
- "Compute statistics"
- "Solve equation"
- "Unit conversion"
- "Percentage calculation"
- "Random number generation"

## When NOT to Use

Γ¥î **DON'T use this skill when:**

- Complex symbolic math ΓåÆ use WolframAlpha API
- Plotting graphs ΓåÆ use plotting libraries
- Matrix operations ΓåÆ use Python with numpy

## Commands

### Basic Arithmetic

```bash
{baseDir}/math.sh add 5 3
{baseDir}/math.sh subtract 10 4
{baseDir}/math.sh multiply 7 8
{baseDir}/math.sh divide 20 4
{baseDir}/math.sh modulo 17 5
{baseDir}/math.sh power 2 10
```

### Multiple Numbers

```bash
{baseDir}/math.sh sum 1 2 3 4 5
{baseDir}/math.sh product 2 3 4
{baseDir}/math.sh average 10 20 30 40
```

### Statistics

```bash
{baseDir}/math.sh mean 1 2 3 4 5
{baseDir}/math.sh median 1 2 3 4 5
{baseDir}/math.sh mode 1 2 2 3 4
{baseDir}/math.sh stddev 1 2 3 4 5
{baseDir}/math.sh variance 1 2 3 4 5
{baseDir}/math.sh range 1 5 3 8 2
{baseDir}/math.sh min 5 3 8 1 9
{baseDir}/math.sh max 5 3 8 1 9
```

### Geometry

```bash
{baseDir}/math.sh circle-area 5
{baseDir}/math.sh circle-circumference 5
{baseDir}/math.sh rectangle-area 10 5
{baseDir}/math.sh rectangle-perimeter 10 5
{baseDir}/math.sh triangle-area 10 5
{baseDir}/math.sh triangle-hypotenuse 3 4
{baseDir}/math.sh sphere-volume 5
{baseDir}/math.sh cube-volume 5
```

### Algebra

```bash
{baseDir}/math.sh solve "x + 5 = 10"
{baseDir}/math.sh solve "2x = 10"
{baseDir}/math.sh quadratic 1 -5 6
{baseDir}/math.sh factorial 5
{baseDir}/math.sh fibonacci 10
{baseDir}/math.sh prime 17
```

### Unit Conversion

```bash
{baseDir}/math.sh convert 100 cm m
{baseDir}/math.sh convert 1 km mi
{baseDir}/math.sh convert 100 c f
{baseDir}/math.sh convert 32 f c
{baseDir}/math.sh convert 1 lb kg
{baseDir}/math.sh convert 1 gal L
```

### Percentage

```bash
{baseDir}/math.sh percentage 50 200
{baseDir}/math.sh percent-of 25 100
{baseDir}/math.sh percent-change 50 75
{baseDir}/math.sh percent-increase 100 20
{baseDir}/math.sh percent-decrease 100 25
```

### Random

```bash
{baseDir}/math.sh random 10
{baseDir}/math.sh random 1 100
{baseDir}/math.sh random-int 1 10
{baseDir}/math.sh random-float
{baseDir}/math.sh shuffle 1 2 3 4 5
{baseDir}/math.sh pick 1 2 3 4 5
```

### Trigonometry

```bash
{baseDir}/math.sh sin 30
{baseDir}/math.sh cos 30
{baseDir}/math.sh tan 30
{baseDir}/math.sh asin 0.5
{baseDir}/math.sh acos 0.5
{baseDir}/math.sh atan 1
```

### Rounding

```bash
{baseDir}/math.sh round 3.7
{baseDir}/math.sh floor 3.7
{baseDir}/math.sh ceil 3.2
{baseDir}/math.sh abs -5
{baseDir}/math.sh sign -10
```

### Number Theory

```bash
{baseDir}/math.sh gcd 12 18
{baseDir}/math.sh lcm 4 6
{baseDir}/math.sh prime-factors 60
{baseDir}/math.sh divisors 12
{baseDir}/math.sh is-prime 17
```

## Options

| Option | Description |
|--------|-------------|
| `--precision N` | Number of decimal places (default: 10) |
| `--json` | Output as JSON |
| `--quiet` | Output result only |

## Examples

**Basic arithmetic:**
```bash
{baseDir}/math.sh add 5 3
# 8
```

**Sum multiple numbers:**
```bash
{baseDir}/math.sh sum 1 2 3 4 5 6 7 8 9 10
# 55
```

**Statistics:**
```bash
{baseDir}/math.sh mean 10 20 30 40 50
# 30
```

**Geometry:**
```bash
{baseDir}/math.sh circle-area 5
# 78.5398163397...
```

**Unit conversion:**
```bash
{baseDir}/math.sh convert 100 km mi
# 62.1371192237...
```

**Percentage:**
```bash
{baseDir}/math.sh percentage 25 200
# 12.5
```

**Random number:**
```bash
{baseDir}/math.sh random 1 100 --json
# {"min": 1, "max": 100, "result": 42}
```

**Solve simple equation:**
```bash
{baseDir}/math.sh solve "x + 5 = 10"
# x = 5
```

## JSON Output

```bash
{baseDir}/math.sh mean 1 2 3 4 5 --json
# {"operation": "mean", "input": [1, 2, 3, 4, 5], "result": 3}
```

## Notes

- Uses bash arithmetic and bc for calculations
- All trigonometry uses degrees (not radians)
- Precision can be adjusted with --precision
- Complex math parsed safely
- No external API calls needed
