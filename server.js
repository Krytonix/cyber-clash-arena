const WebSocket = require('ws');
const http = require('http');

const PORT = 8080;
const rooms = new Map();
const players = new Map();

function generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

class GameRoom {
    constructor(roomCode, hostId) {
        this.roomCode = roomCode;
        this.players = new Map();
        this.hostId = hostId;
    }
    
    addPlayer(playerId, ws) {
        if (this.players.size >= 2) throw new Error('Room is full');
        this.players.set(playerId, { ws, character: null, ready: false, id: playerId });
        this.broadcastPlayerList();
    }
    
    removePlayer(playerId) {
        this.players.delete(playerId);
        if (this.players.size === 0) rooms.delete(this.roomCode);
        else this.broadcastPlayerList();
    }
    
    broadcast(data) {
        const message = JSON.stringify(data);
        this.players.forEach(p => p.ws.send(message));
    }
    
    broadcastPlayerList() {
        const list = Array.from(this.players.values()).map(p => ({ id: p.id, ready: p.ready }));
        this.broadcast({ type: 'playerList', players: list });
    }
}

const server = http.createServer();
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
    const playerId = Math.random().toString(36).substring(2, 11);
    players.set(playerId, { ws, room: null });
    
    ws.on('message', (data) => {
        try {
            const msg = JSON.parse(data);
            handleMessage(playerId, msg);
        } catch (e) {
            console.error('Error:', e);
        }
    });
    
    ws.on('close', () => handleDisconnect(playerId));
});

function handleMessage(playerId, msg) {
    const player = players.get(playerId);
    if (!player) return;
    
    switch (msg.type) {
        case 'host':
            const code = generateRoomCode();
            const room = new GameRoom(code, playerId);
            room.addPlayer(playerId, player.ws);
            player.room = room;
            rooms.set(code, room);
            player.ws.send(JSON.stringify({ type: 'joined', roomCode: code, playerId, isHost: true }));
            break;
        case 'join':
            const target = rooms.get(msg.data.roomCode);
            if (!target) return player.ws.send(JSON.stringify({ type: 'error', message: 'Room not found' }));
            try {
                target.addPlayer(playerId, player.ws);
                player.room = target;
                player.ws.send(JSON.stringify({ type: 'joined', roomCode: msg.data.roomCode, playerId, isHost: false }));
            } catch (e) {
                player.ws.send(JSON.stringify({ type: 'error', message: e.message }));
            }
            break;
        case 'startGame':
            if (player.room && player.room.hostId === playerId) {
                player.room.broadcast({ type: 'gameStart', character: msg.data.character });
            }
            break;
        case 'input':
            if (player.room) {
                player.room.players.forEach((p, id) => {
                    if (id !== playerId) p.ws.send(JSON.stringify({ type: 'opponentInput', input: msg.data }));
                });
            }
            break;
    }
}

function handleDisconnect(playerId) {
    const player = players.get(playerId);
    if (player && player.room) player.room.removePlayer(playerId);
    players.delete(playerId);
}

server.listen(PORT, () => console.log(`Server running on ws://localhost:${PORT}`));