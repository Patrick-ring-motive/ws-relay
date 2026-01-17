const http = require('http');
const crypto = require('crypto');

class NativeWSRelay {
    constructor(port) {
        this.port = port;
        this.server = http.createServer((req, res) => {
            res.writeHead(200);
            res.end('Relay is active.');
        });

        this.server.on('upgrade', (req, socket, head) => this.handleUpgrade(req, socket));
    }

    handleUpgrade(req, socket) {
        // 1. Handshake
        const key = req.headers['sec-websocket-key'];
        const hash = crypto.createHash('sha1')
            .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
            .digest('base64');

        socket.write(
            'HTTP/1.1 101 Switching Protocols\r\n' +
            'Upgrade: websocket\r\n' +
            'Connection: Upgrade\r\n' +
            `Sec-WebSocket-Accept: ${hash}\r\n\r\n`
        );

        console.log('Client connected.');

        // 2. Keep-Alive (Ping every 30s)
        const pingInterval = setInterval(() => {
            if (socket.writable) {
                socket.write(this.buildFrame(null, 0x9)); // OpCode 0x9 = Ping
            } else {
                clearInterval(pingInterval);
            }
        }, 30000);

        // 3. Data Handling
        socket.on('data', (buffer) => {
            const result = this.parseFrame(buffer);
            
            if (result.type === 'text') {
                console.log('Browser says:', result.data);
                
                // Example: Forwarding/Echoing back
                const response = this.buildFrame(`Relay Echo: ${result.data}`);
                socket.write(response);
            } else if (result.type === 'pong') {
                console.log('Heartbeat: Pong received');
            }
        });

        socket.on('end', () => clearInterval(pingInterval));
        socket.on('error', () => clearInterval(pingInterval));
    }

    parseFrame(buffer) {
        const firstByte = buffer.readUInt8(0);
        const opCode = firstByte & 0x0F;

        if (opCode === 0x8) return { type: 'close' };
        if (opCode === 0xA) return { type: 'pong' };
        if (opCode !== 0x1) return { type: 'other' }; // Only handling text for this relay

        const secondByte = buffer.readUInt8(1);
        const isMasked = (secondByte >>> 7) & 0x1;
        let length = secondByte & 0x7F;
        let offset = 2;

        if (length === 126) {
            length = buffer.readUInt16BE(2);
            offset = 4;
        } else if (length === 127) {
            return { type: 'error', data: 'Message too large' };
        }

        if (isMasked) {
            const mask = buffer.slice(offset, offset + 4);
            offset += 4;
            const payload = buffer.slice(offset, offset + length);
            const unmasked = Buffer.alloc(length);
            for (let i = 0; i < length; i++) {
                unmasked[i] = payload[i] ^ mask[i % 4];
            }
            return { type: 'text', data: unmasked.toString() };
        }

        return { type: 'text', data: buffer.slice(offset, offset + length).toString() };
    }

    buildFrame(data, opCode = 0x1) {
        const payload = data ? Buffer.from(data) : Buffer.alloc(0);
        const length = payload.length;
        let frame;

        if (length <= 125) {
            frame = Buffer.alloc(2 + length);
            frame.writeUInt8(0x80 | opCode, 0);
            frame.writeUInt8(length, 1);
            payload.copy(frame, 2);
        } else {
            // Basic support for medium-sized frames
            frame = Buffer.alloc(4 + length);
            frame.writeUInt8(0x80 | opCode, 0);
            frame.writeUInt8(126, 1);
            frame.writeUInt16BE(length, 2);
            payload.copy(frame, 4);
        }
        return frame;
    }

    start() {
        this.server.listen(this.port, () => {
            console.log(`Relay running on ws://localhost:${this.port}`);
        });
    }
}

// Execution
const myRelay = new NativeWSRelay(3000);
myRelay.start();
