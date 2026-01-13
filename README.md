# LogTap

A lightweight, secure HTTP logging server with MongoDB or NeDB persistence.

LogTap provides a simple way to collect logs from any application via HTTP GET requests. All logs are stored with token-based authentication. Choose between MongoDB for production deployments or NeDB for lightweight, file-based storage.

## Features

- **Simple HTTP API**: Log events via GET requests with query parameters
- **Flexible Schema**: No predefined log structure - send any fields you need
- **Token Authentication**: Secure access with configurable tokens
- **Dual Database Support**: MongoDB or NeDB (file-based, no setup required)
- **Web Log Viewer**: Built-in UI to view and filter logs with daisyUI
- **Rate Limiting**: Optional protection against abuse
- **CLI Interface**: Full management via command line
- **Bun Compatible**: Compile to standalone binary

## Quick Start

### Installation

```bash
# Clone the repository
git clone https://https://github.com/antoine-marchal/logtap
cd logtap

# Install dependencies
npm install

# Initialize configuration (uses NeDB by default)
node src/index.js config init

# Generate an authentication token
node src/index.js token generate

# Start the server
node src/index.js start
```

### Global Installation

```bash
npm install -g logtap
logtap config init
logtap token generate
logtap start
```

## Database Options

### NeDB (Default)

NeDB is a lightweight, embedded database that stores data in a local file. No setup required.

```json
{
  "database": {
    "type": "nedb",
    "nedb": {
      "path": "./data/logs.db"
    }
  }
}
```

### MongoDB

For production deployments, MongoDB provides better performance and scalability.

```json
{
  "database": {
    "type": "mongodb",
    "mongodb": {
      "uri": "mongodb://localhost:27017",
      "database": "logtap",
      "collection": "logs"
    }
  }
}
```

To switch databases, edit `config/logtap.config.json` and change `database.type`.

## Usage

### Sending Logs

```bash
# Basic log entry
curl "http://localhost:3000/log?token=YOUR_TOKEN&message=Hello&level=info"

# With custom fields
curl "http://localhost:3000/log?token=YOUR_TOKEN&user=antoine&action=login&status=success&ip=192.168.1.1"

# Error logging
curl "http://localhost:3000/log?token=YOUR_TOKEN&level=error&app=frontend&message=Failed_to_load&stack=Error_at_line_42"
```

### Web Log Viewer

Access the built-in log viewer at:
```
http://localhost:3000/YOUR_TOKEN
```

Features:
- Real-time log viewing with auto-refresh
- Search and filter by field
- Date range filtering
- Pagination
- Dark/light theme support
- Copy log details to clipboard

### Log Document Structure

Each log is stored with the following structure:

```json
{
  "_id": "unique-id",
  "_receivedAt": "2026-01-13T23:22:00.000Z",
  "_ip": "192.168.1.1",
  "_userAgent": "curl/7.68.0",
  "message": "Hello",
  "level": "info"
}
```

Fields prefixed with `_` are automatically added by LogTap.

## CLI Commands

### Server Management

```bash
# Start server
logtap start
logtap start --port 8080
logtap start --verbose
logtap start --daemon       # Run in background

# Check status
logtap status

# Stop daemon
logtap stop
```

### Token Management

```bash
# Generate new token
logtap token generate
logtap token generate --name "production"
logtap token generate --length 64

# List tokens (masked)
logtap token list

# Remove token
logtap token remove <identifier>
```

### Configuration

```bash
# Initialize config file
logtap config init

# Validate configuration
logtap config validate

# Show current config (secrets masked)
logtap config show

# Update config values
logtap config set server.port 8080
logtap config set database.type mongodb
```

### Database

```bash
# Test database connection
logtap db test

# Show statistics
logtap db stats

# Clear all logs
logtap db clear
logtap db clear --yes          # Skip confirmation
logtap db clear --before 2026-01-01  # Clear old logs
```

## Configuration

Configuration is stored in `config/logtap.config.json`:

```json
{
  "server": {
    "port": 3000,
    "host": "0.0.0.0"
  },
  "database": {
    "type": "nedb",
    "nedb": {
      "path": "./data/logs.db"
    },
    "mongodb": {
      "uri": "mongodb://localhost:27017",
      "database": "logtap",
      "collection": "logs"
    }
  },
  "auth": {
    "tokens": []
  },
  "logging": {
    "level": "info",
    "enableConsole": true
  },
  "rateLimit": {
    "enabled": false,
    "windowMs": 60000,
    "maxRequests": 100
  },
  "cors": {
    "enabled": true,
    "origin": "*"
  }
}
```

## API Endpoints

### GET /log

Store a log entry.

**Parameters:**
- `token` (required): Authentication token
- Any other parameters: Saved as log fields

**Response:**
```json
{
  "success": true,
  "id": "507f1f77bcf86cd799439011",
  "receivedAt": "2026-01-13T23:22:00.000Z"
}
```

### GET /:token

Web-based log viewer interface.

### GET /api/logs

Query logs with filtering (requires authentication).

**Parameters:**
- `token`: Authentication token
- `limit`: Number of results (default: 50)
- `skip`: Offset for pagination
- `search`: Search term
- `field`: Field to search in
- `startDate`: Filter from date
- `endDate`: Filter to date

### GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "uptime": 12345,
  "uptimeFormatted": "3h 25m 45s",
  "database": "connected",
  "databaseType": "nedb",
  "timestamp": "2026-01-13T23:22:00.000Z"
}
```

### GET /ping

Simple ping endpoint.

### GET /stats

Get logging statistics (requires authentication).

## Error Responses

```json
{
  "error": true,
  "message": "Invalid token",
  "code": "INVALID_TOKEN",
  "timestamp": "2026-01-13T23:22:00.000Z"
}
```

**Error Codes:**
- `MISSING_TOKEN`: No token provided
- `INVALID_TOKEN`: Token not recognized
- `VALIDATION_ERROR`: Invalid request parameters
- `DATABASE_ERROR`: Database operation failed
- `RATE_LIMITED`: Too many requests

## Building

### Compile with Bun

```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash

# Build for current platform
bun run build

# Build for specific platforms
bun run build:linux
bun run build:mac
bun run build:windows
```

## Use Cases

### Web Application Error Logging

```javascript
// In your frontend application
function logError(error) {
  const params = new URLSearchParams({
    token: 'YOUR_TOKEN',
    level: 'error',
    app: 'frontend',
    message: error.message,
    stack: error.stack,
    url: window.location.href
  });
  fetch(`http://logtap.example.com/log?${params}`);
}
```

### IoT Device Monitoring

```bash
# Sensor reports status
curl "http://server.com/log?token=xyz&device=sensor-01&temp=22.5&humidity=65&battery=87"
```

### Authentication Tracking

```bash
# Log login attempts
curl "http://localhost:3000/log?token=abc&user=antoine&action=login&status=failed&ip=192.168.1.1"
```

## Security

- All log requests require a valid token
- Tokens are stored in the config file (not in the database)
- Input is sanitized to prevent injection attacks
- Optional rate limiting to prevent abuse
- CORS and Helmet configured by default

## License

MIT License - see LICENSE file for details.
