---
name: data-faker
description: Generate realistic fake/mock data for testing, development, and demos. Create names, addresses, emails, phone numbers, companies, and more. Inspired by ZeroClaw's data generation patterns.
---

# Data Faker

Generate realistic fake data for testing and development.

## Features

- **Person**: Names, emails, phone numbers, birthdays
- **Addresses**: Street addresses, cities, states, zips
- **Company**: Business names, catch phrases, industries
- **Internet**: Domain names, URLs, usernames, IPs
- **Lorem**: Lorem ipsum paragraphs, words, sentences
- **JSON/CSV**: Generate structured data files

## Usage

```bash
# Generate a person
./scripts/faker.js person
./scripts/faker.js person --format pretty

# Generate multiple
./scripts/faker.js person --count 5

# Generate company
./scripts/faker.js company

# Generate address
./scripts/faker.js address

# Generate lorem text
./scripts/faker.js lorem --sentences 3 --paragraphs 2

# Generate structured data file
./scripts/faker.js json --count 10 --output users.json

# Generate combined data
./scripts/faker.js combined --count 3
```

## Examples

| Task | Command |
|------|---------|
| Single user | `./scripts/faker.js person` |
| Multiple users | `./scripts/faker.js person --count 10` |
| Company data | `./scripts/faker.js company` |
| Product names | `./scripts/faker.js product` |
| Lorem ipsum | `./scripts/faker.js lorem --words 50` |
| Export CSV | `./scripts/faker.js csv --count 100 --output customers.csv` |

## Output Format

Person:
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "phone": "555-123-4567",
  "username": "johndoe123",
  "birthday": "1990-05-15",
  "address": {
    "street": "123 Main St",
    "city": "Springfield",
    "state": "IL",
    "zip": "62704",
    "country": "USA"
  }
}
```

Company:
```json
{
  "name": "Acme Corporation",
  "catchPhrase": "Innovative solutions for modern problems",
  "industry": "Technology",
  "website": "acmecorp.com",
  "email": "contact@acmecorp.com",
  "phone": "555-987-6543"
}
```

## Supported Data Types

| Type | Includes |
|------|----------|
| person | name, email, phone, address |
| company | name, slogan, industry, contact |
| address | street, city, state, zip, country |
| internet | domain, url, ip, username, password |
| lorem | paragraphs, sentences, words |
| product | name, description, price, category |

## Notes

- Data is randomly generated each run
- Email addresses are realistic but not actual
- Phone numbers are valid format but fake
- Use for testing and development only
- Generated data is deterministic per run (random each time)
