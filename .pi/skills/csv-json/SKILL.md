---
name: csv-json
description: Convert between CSV and JSON formats. Use when transforming tabular data between formats for APIs, databases, or data analysis.
---

# CSV <-> JSON Converter

Convert CSV to JSON and vice versa.

## Features

- **csv2json**: Convert CSV to JSON
- **json2csv**: Convert JSON to CSV
- **Header detection**: Auto-detect or specify
- **Delimiter options**: Comma, tab, semicolon
- **Type inference**: Parse numbers and booleans

## Usage

```bash
# CSV to JSON
./scripts/csvjson.js csv2json --file data.csv
./scripts/csvjson.js csv2json --text "name,age\nJohn,30"

# JSON to CSV
./scripts/csvjson.js json2csv --file data.json
./scripts/csvjson.js json2csv --text '[{"name":"John","age":30}]'

# Custom delimiter
./scripts/csvjson.js csv2json --file data.tsv --delimiter $'\t'
```

## Examples

| Task | Command |
|------|---------|
| Convert file | `csvjson.js csv2json --file data.csv` |
| With headers | `csvjson.js csv2json --file data.csv --headers` |
| TSV to JSON | `csvjson.js csv2json --file data.tsv --delimiter $'\t'` |
| JSON file | `csvjson.js json2csv --file data.json` |

## Options

- `--pretty`: Pretty print JSON output
- `--no-infer`: Don't convert strings to numbers/booleans
- `--headers`: First row contains headers
- `--output`: Write to file