---
name: math-eval
description: Advanced mathematical expression evaluator with support for arithmetic, algebra, trigonometry, statistical functions, unit conversions, and complex number operations.
---

# Math Evaluator

Evaluate mathematical expressions with advanced functions.

## Features

- **Arithmetic**: Basic operations, parentheses, order of operations
- **Functions**: Trigonometric, logarithmic, exponential, rounding
- **Statistics**: Mean, median, standard deviation, variance
- **Constants**: pi, e, tau, phi (golden ratio)
- **Units**: Basic length, weight, temperature conversions
- **Complex**: Complex number operations
- **Base**: Binary, octal, hex conversions

## Usage

```bash
# Simple calculations
./scripts/math.js "2 + 2"
./scripts/math.js "sqrt(16) * 2"

# With variables
./scripts/math.js "x^2 + 2x + 1" --var x=5

# Trigonometry (radians by default)
./scripts/math.js "sin(pi/2)"
./scripts/math.js "cos(45 deg)"

# Statistics
./scripts/math.js stats "1,2,3,4,5"
./scripts/math.js mean "1,2,3,4,5"

# Conversions
./scripts/math.js convert 100 celsius fahrenheit
./scripts/math.js convert 5 miles km

# Base conversion
./scripts/math.js base 16 to 2 "FF"
./scripts/math.js base 10 to 16 "255"
```

## Examples

| Task | Command |
|------|---------|
| Calculate | `./scripts/math.js "2 * (3 + 4)"` |
| Square root | `./scripts/math.js "sqrt(144)"` |
| Power | `./scripts/math.js "2^10"` |
| Logarithm | `./scripts/math.js "log(100)"` |
| Sine | `./scripts/math.js "sin(pi/6)"` |
| Statistics | `./scripts/math.js stats "5,10,15,20"` |
| Convert | `./scripts/math.js convert 32 F C` |

## Supported Operators

| Operator | Description |
|----------|-------------|
| + | Addition |
| - | Subtraction |
| * | Multiplication |
| / | Division |
| ^ or ** | Power |
| % | Modulo |
| // | Integer division |

## Functions

- `sqrt(x)` - Square root
- `cbrt(x)` - Cube root
- `abs(x)` - Absolute value
- `sin(x), cos(x), tan(x)` - Trigonometric
- `asin(x), acos(x), atan(x)` - Inverse trig
- `log(x), ln(x)` - Logarithms
- `log10(x)` - Base 10 log
- `exp(x)` - e^x
- `round(x), floor(x), ceil(x)` - Rounding
- `min(a,b), max(a,b)` - Min/max
- `fact(n)` - Factorial
- `gcd(a,b), lcm(a,b)` - GCD/LCM

## Constants

- `pi` or `PI` - 3.14159...
- `e` or `E` - 2.71828...
- `tau` or `TAU` - 6.28318... (2*pi)
- `phi` or `PHI` - 1.61803... (golden ratio)

## Notes

- Angles default to radians; add 'deg' to use degrees: `sin(45 deg)`
- Supports scientific notation: `1.5e-3`
- Division by zero returns 'Infinity' or error
- Complex expressions should use quotes
