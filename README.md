# Chalksniffer

## Prerequisites

- Node.js 20+
- MongoDB (local instance)

## Setup

### 1. Install MongoDB

```bash
sudo apt-get install -y gnupg curl
curl -fsSL https://www.mongodb.org/static/pgp/server-8.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-8.0.gpg --dearmor
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] https://repo.mongodb.org/apt/ubuntu noble/mongodb-org/8.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-8.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
```

### 2. Install dependencies

```bash
cd api
npm install
```

### 3. Configure environment

Create a `.env` file in the `api/` directory:

```
MONGODB_URI=mongodb://localhost:27017/chalksniffer
PORT=3000
```

### 4. Run the server

```bash
cd api
npm start
```

## Development

```bash
cd api
npm run dev
```

## Testing

```bash
cd api
npm test
```

## Linting

```bash
cd api
npm run lint

# Auto-fix
npm run lint-fix
```

## Project Structure

```
api/
  src/
    index.ts       # Entry point
    app.ts         # Express app setup
    db.ts          # MongoDB connection
    models/        # Mongoose schemas
    controllers/   # Route handlers
    routes/        # Express route definitions
  tests/
    setup.ts       # Jest/MongoDB test setup
```
