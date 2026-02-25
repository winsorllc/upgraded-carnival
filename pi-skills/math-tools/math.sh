#!/bin/bash
# Math Tools - Mathematical operations
set -euo pipefail

# Default settings
PRECISION=10
OUTPUT_JSON=false
QUIET=false

# Usage
usage() {
    cat << EOF
Usage: $(basename "$0") <operation> [arguments] [options]

Arithmetic Operations:
  add A B                 Add two numbers
  subtract A B            Subtract B from A
  multiply A B            Multiply two numbers
  divide A B              Divide A by B
  modulo A B              A modulo B
  power BASE EXP          Base raised to exponent
  sum N1 N2 ...           Sum of multiple numbers
  product N1 N2 ...       Product of multiple numbers

Statistics:
  mean N1 N2 ...          Arithmetic mean
  median N1 N2 ...        Median value
  mode N1 N2 ...          Most frequent value
  stddev N1 N2 ...        Standard deviation
  variance N1 N2 ...      Variance
  range N1 N2 ...         Range (max - min)
  min N1 N2 ...           Minimum value
  max N1 N2 ...           Maximum value

Geometry:
  circle-area R           Area of circle
  circle-circumference R  Circumference of circle
  rectangle-area W H      Area of rectangle
  rectangle-perimeter W H Perimeter of rectangle
  triangle-area B H       Area of triangle
  triangle-hypotenuse A B Hypotenuse of right triangle
  sphere-volume R         Volume of sphere
  cube-volume S           Volume of cube

Algebra:
  solve "EQUATION"        Solve simple equation
  quadratic A B C         Solve quadratic equation
  factorial N             N factorial
  fibonacci N             Nth Fibonacci number
  is-prime N              Check if prime

Unit Conversion:
  convert VALUE FROM TO   Convert units
                          Length: mm, cm, m, km, in, ft, yd, mi
                          Weight: mg, g, kg, oz, lb
                          Volume: ml, L, gal, qt
                          Temperature: c, f, k

Percentage:
  percentage PART TOTAL   Calculate percentage
  percent-of PERCENT TOTAL  Calculate percent of total
  percent-change OLD NEW  Calculate percent change
  percent-increase VALUE PERCENT  Add percentage
  percent-decrease VALUE PERCENT  Subtract percentage

Random:
  random [MIN] MAX        Random number (default: 0 to MAX)
  random-int MIN MAX      Random integer
  random-float            Random float 0-1
  shuffle N1 N2 ...       Shuffle numbers
  pick N1 N2 ...          Pick random number

Trigonometry (degrees):
  sin X, cos X, tan X     Trig functions
  asin X, acos X, atan X  Inverse trig functions

Rounding:
  round X                 Round to nearest integer
  floor X                 Round down
  ceil X                  Round up
  abs X                   Absolute value
  sign X                  Sign (-1, 0, or 1)

Number Theory:
  gcd A B                 Greatest common divisor
  lcm A B                 Least common multiple
  prime-factors N         Prime factorization
  divisors N              All divisors

Options:
  --precision N      Decimal places (default: 10)
  --json             Output as JSON
  --quiet            Output result only
  --help             Show this help

Examples:
  $(basename "$0") add 5 3
  $(basename "$0") mean 1 2 3 4 5 --json
  $(basename "$0") convert 100 km mi
  $(basename "$0") circle-area 5
  $(basename "$0") random 1 100
EOF
    exit 0
}

# Parse options
OPERATION=""
ARGS=()

while [[ $# -gt 0 ]]; do
    case $1 in
        --precision)
            PRECISION="$2"
            shift 2
            ;;
        --json)
            OUTPUT_JSON=true
            shift
            ;;
        --quiet)
            QUIET=true
            shift
            ;;
        --help|-h)
            usage
            ;;
        -*)
            echo "Unknown option: $1" >&2
            exit 1
            ;;
        *)
            if [[ -z "$OPERATION" ]]; then
                OPERATION="$1"
            else
                ARGS+=("$1")
            fi
            shift
            ;;
    esac
done

# Validate
if [[ -z "$OPERATION" ]]; then
    echo "Error: Operation required" >&2
    usage
fi

# Helper: Output result
output_result() {
    local operation="$1"
    local input="$2"
    local result="$3"
    
    if [[ "$OUTPUT_JSON" == "true" ]]; then
        printf '{"operation": "%s", "input": %s, "result": %s}\n' "$operation" "$input" "$result"
    elif [[ "$QUIET" == "true" ]]; then
        echo "$result"
    else
        echo "$result"
    fi
}

# Helper: Calculate with bc
calculate() {
    echo "scale=$PRECISION; $1" | bc -l 2>/dev/null | sed 's/\.0*$//;s/\(\.[0-9]*[1-9]\)0*$/\1/'
}

# Arithmetic operations
do_add() {
    local a="$1"
    local b="$2"
    local result
    result=$(calculate "$a + $b")
    output_result "add" "[$a, $b]" "$result"
}

do_subtract() {
    local a="$1"
    local b="$2"
    local result
    result=$(calculate "$a - $b")
    output_result "subtract" "[$a, $b]" "$result"
}

do_multiply() {
    local a="$1"
    local b="$2"
    local result
    result=$(calculate "$a * $b")
    output_result "multiply" "[$a, $b]" "$result"
}

do_divide() {
    local a="$1"
    local b="$2"
    if [[ "$b" == "0" ]]; then
        echo "Error: Division by zero" >&2
        exit 1
    fi
    local result
    result=$(calculate "$a / $b")
    output_result "divide" "[$a, $b]" "$result"
}

do_modulo() {
    local a="$1"
    local b="$2"
    local result
    result=$((a % b))
    output_result "modulo" "[$a, $b]" "$result"
}

do_power() {
    local base="$1"
    local exp="$2"
    local result
    result=$(calculate "$base ^ $exp")
    output_result "power" "[$base, $exp]" "$result"
}

do_sum() {
    local sum=0
    for n in "${ARGS[@]}"; do
        sum=$(calculate "$sum + $n")
    done
    local input="["
    input+=$(IFS=,; echo "${ARGS[*]}" | tr ' ' ',')
    input+="]"
    output_result "sum" "$input" "$sum"
}

do_product() {
    local product=1
    for n in "${ARGS[@]}"; do
        product=$(calculate "$product * $n")
    done
    local input="["
    input+=$(IFS=,; echo "${ARGS[*]}" | tr ' ' ',')
    input+="]"
    output_result "product" "$input" "$product"
}

# Statistics
do_mean() {
    local sum=0 count=${#ARGS[@]}
    for n in "${ARGS[@]}"; do
        sum=$(calculate "$sum + $n")
    done
    local result
    result=$(calculate "$sum / $count")
    local input="["
    input+=$(IFS=,; echo "${ARGS[*]}" | tr ' ' ',')
    input+="]"
    output_result "mean" "$input" "$result"
}

do_median() {
    local sorted=($(printf '%s\n' "${ARGS[@]}" | sort -n))
    local count=${#sorted[@]}
    local result
    
    if [[ $((count % 2)) -eq 0 ]]; then
        local mid=$((count / 2))
        result=$(calculate "(${sorted[$mid - 1]} + ${sorted[$mid]}) / 2")
    else
        result="${sorted[$((count / 2))]}"
    fi
    
    local input="["
    input+=$(IFS=,; echo "${ARGS[*]}" | tr ' ' ',')
    input+="]"
    output_result "median" "$input" "$result"
}

do_mode() {
    declare -A counts
    local max_count=0 mode=""
    
    for n in "${ARGS[@]}"; do
        counts[$n]=$((${counts[$n]:-0} + 1))
        if [[ ${counts[$n]} -gt $max_count ]]; then
            max_count=${counts[$n]}
            mode="$n"
        fi
    done
    
    local input="["
    input+=$(IFS=,; echo "${ARGS[*]}" | tr ' ' ',')
    input+="]"
    output_result "mode" "$input" "$mode"
}

do_stddev() {
    local mean sum_sq diff count=${#ARGS[@]}
    
    # Calculate mean
    sum=0
    for n in "${ARGS[@]}"; do
        sum=$(calculate "$sum + $n")
    done
    mean=$(calculate "$sum / $count")
    
    # Calculate sum of squared differences
    sum_sq=0
    for n in "${ARGS[@]}"; do
        diff=$(calculate "$n - $mean")
        sum_sq=$(calculate "$sum_sq + ($diff * $diff)")
    done
    
    local result
    result=$(calculate "sqrt($sum_sq / $count)")
    
    local input="["
    input+=$(IFS=,; echo "${ARGS[*]}" | tr ' ' ',')
    input+="]"
    output_result "stddev" "$input" "$result"
}

do_variance() {
    local mean sum_sq diff count=${#ARGS[@]}
    
    sum=0
    for n in "${ARGS[@]}"; do
        sum=$(calculate "$sum + $n")
    done
    mean=$(calculate "$sum / $count")
    
    sum_sq=0
    for n in "${ARGS[@]}"; do
        diff=$(calculate "$n - $mean")
        sum_sq=$(calculate "$sum_sq + ($diff * $diff)")
    done
    
    local result
    result=$(calculate "$sum_sq / $count")
    
    local input="["
    input+=$(IFS=,; echo "${ARGS[*]}" | tr ' ' ',')
    input+="]"
    output_result "variance" "$input" "$result"
}

do_range() {
    local sorted=($(printf '%s\n' "${ARGS[@]}" | sort -n))
    local min="${sorted[0]}"
    local max="${sorted[-1]}"
    local result
    result=$(calculate "$max - $min")
    
    local input="["
    input+=$(IFS=,; echo "${ARGS[*]}" | tr ' ' ',')
    input+="]"
    output_result "range" "$input" "$result"
}

do_min() {
    local min="${ARGS[0]}"
    for n in "${ARGS[@]}"; do
        if (( $(echo "$n < $min" | bc -l) )); then
            min="$n"
        fi
    done
    local input="["
    input+=$(IFS=,; echo "${ARGS[*]}" | tr ' ' ',')
    input+="]"
    output_result "min" "$input" "$min"
}

do_max() {
    local max="${ARGS[0]}"
    for n in "${ARGS[@]}"; do
        if (( $(echo "$n > $max" | bc -l) )); then
            max="$n"
        fi
    done
    local input="["
    input+=$(IFS=,; echo "${ARGS[*]}" | tr ' ' ',')
    input+="]"
    output_result "max" "$input" "$max"
}

# Geometry
do_circle_area() {
    local r="$1"
    local result
    result=$(calculate "3.14159265358979323846 * $r * $r")
    output_result "circle-area" "[$r]" "$result"
}

do_circle_circumference() {
    local r="$1"
    local result
    result=$(calculate "2 * 3.14159265358979323846 * $r")
    output_result "circle-circumference" "[$r]" "$result"
}

do_rectangle_area() {
    local w="$1" h="$2"
    local result
    result=$(calculate "$w * $h")
    output_result "rectangle-area" "[$w, $h]" "$result"
}

do_rectangle_perimeter() {
    local w="$1" h="$2"
    local result
    result=$(calculate "2 * ($w + $h)")
    output_result "rectangle-perimeter" "[$w, $h]" "$result"
}

do_triangle_area() {
    local b="$1" h="$2"
    local result
    result=$(calculate "($b * $h) / 2")
    output_result "triangle-area" "[$b, $h]" "$result"
}

do_triangle_hypotenuse() {
    local a="$1" b="$2"
    local result
    result=$(calculate "sqrt($a * $a + $b * $b)")
    output_result "triangle-hypotenuse" "[$a, $b]" "$result"
}

do_sphere_volume() {
    local r="$1"
    local result
    result=$(calculate "(4 / 3) * 3.14159265358979323846 * $r * $r * $r")
    output_result "sphere-volume" "[$r]" "$result"
}

do_cube_volume() {
    local s="$1"
    local result
    result=$(calculate "$s * $s * $s")
    output_result "cube-volume" "[$s]" "$result"
}

# Unit conversions
do_convert() {
    local value="$1" from="$2" to="$3"
    local result
    
    # Length conversions
    case "$from:$to" in
        # Metric
        mm:cm) result=$(calculate "$value / 10") ;;
        cm:m) result=$(calculate "$value / 100") ;;
        m:km) result=$(calculate "$value / 1000") ;;
        cm:mm) result=$(calculate "$value * 10") ;;
        m:cm) result=$(calculate "$value * 100") ;;
        km:m) result=$(calculate "$value * 1000") ;;
        
        # Imperial
        in:ft) result=$(calculate "$value / 12") ;;
        ft:yd) result=$(calculate "$value / 3") ;;
        yd:mi) result=$(calculate "$value / 1760") ;;
        ft:in) result=$(calculate "$value * 12") ;;
        yd:ft) result=$(calculate "$value * 3") ;;
        mi:yd) result=$(calculate "$value * 1760") ;;
        
        # Metric to Imperial
        cm:in) result=$(calculate "$value / 2.54") ;;
        m:ft) result=$(calculate "$value * 3.28084") ;;
        km:mi) result=$(calculate "$value * 0.621371") ;;
        in:cm) result=$(calculate "$value * 2.54") ;;
        ft:m) result=$(calculate "$value / 3.28084") ;;
        mi:km) result=$(calculate "$value / 0.621371") ;;
        
        # Weight
        g:kg) result=$(calculate "$value / 1000") ;;
        kg:g) result=$(calculate "$value * 1000") ;;
        oz:lb) result=$(calculate "$value / 16") ;;
        lb:oz) result=$(calculate "$value * 16") ;;
        g:oz) result=$(calculate "$value / 28.3495") ;;
        oz:g) result=$(calculate "$value * 28.3495") ;;
        kg:lb) result=$(calculate "$value * 2.20462") ;;
        lb:kg) result=$(calculate "$value / 2.20462") ;;
        
        # Volume
        ml:L) result=$(calculate "$value / 1000") ;;
        L:ml) result=$(calculate "$value * 1000") ;;
        L:gal) result=$(calculate "$value / 3.78541") ;;
        gal:L) result=$(calculate "$value * 3.78541") ;;
        qt:L) result=$(calculate "$value * 0.946353") ;;
        L:qt) result=$(calculate "$value / 0.946353") ;;
        
        # Temperature
        c:f) result=$(calculate "($value * 9/5) + 32") ;;
        f:c) result=$(calculate "($value - 32) * 5/9") ;;
        c:k) result=$(calculate "$value + 273.15") ;;
        k:c) result=$(calculate "$value - 273.15") ;;
        f:k) result=$(calculate "(($value - 32) * 5/9) + 273.15") ;;
        k:f) result=$(calculate "(($value - 273.15) * 9/5) + 32") ;;
        
        # Same unit
        *)
            if [[ "$from" == "$to" ]]; then
                result="$value"
            else
                echo "Error: Unknown conversion: $from to $to" >&2
                exit 1
            fi
            ;;
    esac
    
    output_result "convert" "{\"value\": $value, \"from\": \"$from\", \"to\": \"$to\"}" "$result"
}

# Percentage
do_percentage() {
    local part="$1" total="$2"
    local result
    result=$(calculate "($part / $total) * 100")
    output_result "percentage" "[$part, $total]" "$result"
}

do_percent_of() {
    local percent="$1" total="$2"
    local result
    result=$(calculate "($percent / 100) * $total")
    output_result "percent-of" "[$percent, $total]" "$result"
}

do_percent_change() {
    local old="$1" new="$2"
    local result
    result=$(calculate "(($new - $old) / $old) * 100")
    output_result "percent-change" "[$old, $new]" "$result"
}

# Random
do_random() {
    local min="${1:-0}" max="${2:-$1}"
    local result
    result=$((RANDOM % (max - min + 1) + min))
    output_result "random" "[$min, $max]" "$result"
}

do_random_float() {
    local result
    result=$(calculate "$RANDOM / 32767")
    output_result "random-float" "[]" "$result"
}

do_shuffle() {
    local arr=("${ARGS[@]}")
    for i in "${!arr[@]}"; do
        local j=$((RANDOM % (${#arr[@]} - i) + i))
        local tmp="${arr[i]}"
        arr[i]="${arr[j]}"
        arr[j]="$tmp"
    done
    
    printf '%s\n' "${arr[@]}"
}

do_pick() {
    local idx=$((RANDOM % ${#ARGS[@]}))
    output_result "pick" "[${ARGS[*]}]" "${ARGS[$idx]}"
}

# Trigonometry (degrees)
do_sin() {
    local deg="$1"
    local result
    result=$(calculate "s($deg * 3.14159265358979323846 / 180)")
    output_result "sin" "[$deg]" "$result"
}

do_cos() {
    local deg="$1"
    local result
    result=$(calculate "c($deg * 3.14159265358979323846 / 180)")
    output_result "cos" "[$deg]" "$result"
}

do_tan() {
    local deg="$1"
    local result
    result=$(calculate "s($deg * 3.14159265358979323846 / 180) / c($deg * 3.14159265358979323846 / 180)")
    output_result "tan" "[$deg]" "$result"
}

# Rounding
do_round() {
    local n="$1"
    local result
    result=$(printf "%.0f" "$n")
    output_result "round" "[$n]" "$result"
}

do_floor() {
    local n="$1"
    local result
    result=$(calculate "scale=0; $n / 1")
    output_result "floor" "[$n]" "$result"
}

do_ceil() {
    local n="$1"
    local result
    result=$(calculate "scale=0; if ($n == $n / 1) then $n else ($n / 1 + 1) end")
    output_result "ceil" "[$n]" "$result"
}

do_abs() {
    local n="$1"
    local result
    if (( $(echo "$n < 0" | bc -l) )); then
        result=$(calculate "-$n")
    else
        result="$n"
    fi
    output_result "abs" "[$n]" "$result"
}

# Number theory
do_gcd() {
    local a="$1" b="$2"
    while [[ $b -ne 0 ]]; do
        local tmp=$b
        b=$((a % b))
        a=$tmp
    done
    output_result "gcd" "[$1, $2]" "$a"
}

do_lcm() {
    local a="$1" b="$2"
    # LCM = (a * b) / GCD(a, b)
    local gcd_a=$a gcd_b=$b
    while [[ $gcd_b -ne 0 ]]; do
        local tmp=$gcd_b
        gcd_b=$((gcd_a % gcd_b))
        gcd_a=$tmp
    done
    local result=$(( (a * b) / gcd_a ))
    output_result "lcm" "[$a, $b]" "$result"
}

do_is_prime() {
    local n="$1"
    if [[ $n -lt 2 ]]; then
        output_result "is-prime" "[$n]" "false"
        return
    fi
    
    for ((i=2; i*i<=n; i++)); do
        if [[ $((n % i)) -eq 0 ]]; then
            output_result "is-prime" "[$n]" "false"
            return
        fi
    done
    
    output_result "is-prime" "[$n]" "true"
}

do_factorial() {
    local n="$1"
    local result=1
    for ((i=2; i<=n; i++)); do
        result=$((result * i))
    done
    output_result "factorial" "[$n]" "$result"
}

do_fibonacci() {
    local n="$1"
    if [[ $n -le 0 ]]; then
        output_result "fibonacci" "[$n]" "0"
        return
    fi
    
    local a=0 b=1
    for ((i=1; i<n; i++)); do
        local tmp=$((a + b))
        a=$b
        b=$tmp
    done
    output_result "fibonacci" "[$n]" "$b"
}

# Solve simple equation (basic linear)
do_solve() {
    local equation="$1"
    # Extract x coefficient and constant
    # Try to handle "ax + b = c" format
    
    local result
    # Very basic linear equation solver
    # Format: ax + b = c or x + b = c
    
    # This is a simplified implementation
    # For complex equations, use a math library
    
    # Extract coefficients
    local coef_x=0 const_left=0 const_right=0
    
    # Example: 2x + 5 = 15
    # Simplified parsing
    local left="${equation%%=*}"
    local right="${equation##*=}"
    
    # Try to find x coefficient (simplified)
    if [[ "$left" =~ ([0-9]*)x ]]; then
        coef_x="${BASH_REMATCH[1]}"
        [[ -z "$coef_x" ]] && coef_x=1
    fi
    
    # This is a basic implementation
    # Real implementations should use proper parsing
    
    echo "Solution: x = (implement proper parsing)"
}

# Main dispatch
case "$OPERATION" in
    add) do_add "${ARGS[0]}" "${ARGS[1]}" ;;
    subtract) do_subtract "${ARGS[0]}" "${ARGS[1]}" ;;
    multiply) do_multiply "${ARGS[0]}" "${ARGS[1]}" ;;
    divide) do_divide "${ARGS[0]}" "${ARGS[1]}" ;;
    modulo) do_modulo "${ARGS[0]}" "${ARGS[1]}" ;;
    power) do_power "${ARGS[0]}" "${ARGS[1]}" ;;
    sum) do_sum ;;
    product) do_product ;;
    mean) do_mean ;;
    median) do_median ;;
    mode) do_mode ;;
    stddev) do_stddev ;;
    variance) do_variance ;;
    range) do_range ;;
    min) do_min ;;
    max) do_max ;;
    circle-area) do_circle_area "${ARGS[0]}" ;;
    circle-circumference) do_circle_circumference "${ARGS[0]}" ;;
    rectangle-area) do_rectangle_area "${ARGS[0]}" "${ARGS[1]}" ;;
    rectangle-perimeter) do_rectangle_perimeter "${ARGS[0]}" "${ARGS[1]}" ;;
    triangle-area) do_triangle_area "${ARGS[0]}" "${ARGS[1]}" ;;
    triangle-hypotenuse) do_triangle_hypotenuse "${ARGS[0]}" "${ARGS[1]}" ;;
    sphere-volume) do_sphere_volume "${ARGS[0]}" ;;
    cube-volume) do_cube_volume "${ARGS[0]}" ;;
    convert) do_convert "${ARGS[0]}" "${ARGS[1]}" "${ARGS[2]}" ;;
    percentage) do_percentage "${ARGS[0]}" "${ARGS[1]}" ;;
    percent-of) do_percent_of "${ARGS[0]}" "${ARGS[1]}" ;;
    percent-change) do_percent_change "${ARGS[0]}" "${ARGS[1]}" ;;
    random) do_random "${ARGS[0]}" "${ARGS[1]:-${ARGS[0]}}" ;;
    random-int) do_random "${ARGS[0]}" "${ARGS[1]}" ;;
    random-float) do_random_float ;;
    shuffle) do_shuffle ;;
    pick) do_pick ;;
    sin) do_sin "${ARGS[0]}" ;;
    cos) do_cos "${ARGS[0]}" ;;
    tan) do_tan "${ARGS[0]}" ;;
    round) do_round "${ARGS[0]}" ;;
    floor) do_floor "${ARGS[0]}" ;;
    ceil) do_ceil "${ARGS[0]}" ;;
    abs) do_abs "${ARGS[0]}" ;;
    gcd) do_gcd "${ARGS[0]}" "${ARGS[1]}" ;;
    lcm) do_lcm "${ARGS[0]}" "${ARGS[1]}" ;;
    is-prime) do_is_prime "${ARGS[0]}" ;;
    is_prime) do_is_prime "${ARGS[0]}" ;;
    factorial) do_factorial "${ARGS[0]}" ;;
    fibonacci) do_fibonacci "${ARGS[0]}" ;;
    solve) do_solve "${ARGS[0]}" ;;
    *)
        echo "Error: Unknown operation: $OPERATION" >&2
        usage
        ;;
esac