# ws-relay# ws-relay 📡

A lightweight, native Node.js WebSocket relay server designed for simplicity and performance. It handles WebSocket handshakes and relays messages between connected clients without external dependencies like `ws`.

## Features

- **Native Implementation**: Uses only built-in Node.js modules (`http`, `crypto`).
- **Handshake Handling**: Implements the WebSocket opening handshake manually.
- **Message Relaying**: Efficiently broadcasts messages to all connected clients.
- **Lightweight**: Minimal memory and CPU footprint.

## Usage

The core logic is contained in `relay.js`. You can instantiate the `NativeWSRelay` class with a specified port:

```javascript
const NativeWSRelay = require('./relay.js');
const relay = new NativeWSRelay(8080);
```

The server will start listening for WebSocket connections on the provided port and automatically relay incoming messages to all other active connections.

## How it Works

1. **HTTP Server**: Listens for incoming HTTP requests.
2. **Upgrade Handling**: Intercepts the `upgrade` event to handle WebSocket connection requests.
3. **Security Handshake**: Generates the `Sec-WebSocket-Accept` header using the client's `Sec-WebSocket-Key` and the standard WebSocket GUID.
4. **Socket Management**: Maintains a set of active sockets and handles data framing and broadcasting.
