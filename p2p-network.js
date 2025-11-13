{class P2PNetwork {
    constructor() {
        this.localConnection = null;
        this.dataChannel = null;
        this.isHost = false;
        this.connected = false;
        this.peerId = Math.random().toString(36).substring(2, 9);
        this.onConnected = () => {};
        this.onMessage = () => {};
        this.onDisconnected = () => {};
    }

    async hostGame() {
        this.isHost = true;
        this.localConnection = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });

        this.dataChannel = this.localConnection.createDataChannel('gameData');
        this.setupDataChannel(this.dataChannel);
        this.setupConnection(this.localConnection);

        const offer = await this.localConnection.createOffer();
        await this.localConnection.setLocalDescription(offer);

        return btoa(JSON.stringify(offer));
    }

    async joinGame(code) {
        const offer = JSON.parse(atob(prompt('Paste host connection code:')));
        this.remoteConnection = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });

        this.remoteConnection.ondatachannel = (event) => {
            this.dataChannel = event.channel;
            this.setupDataChannel(this.dataChannel);
        };

        this.setupConnection(this.remoteConnection);
        await this.remoteConnection.setRemoteDescription(offer);

        const answer = await this.remoteConnection.createAnswer();
        await this.remoteConnection.setLocalDescription(answer);

        prompt('Give this answer to host:', btoa(JSON.stringify(answer)));
        this.connected = true;
        return answer;
    }

    async acceptAnswer(code) {
        const answer = JSON.parse(atob(code));
        await this.localConnection.setRemoteDescription(answer);
    }

    setupConnection(conn) {
        conn.onicecandidate = (event) => {
            if (event.candidate) {
                console.log('ICE candidate:', event.candidate);
            }
        };
        conn.oniceconnectionstatechange = () => {
            console.log('Connection state:', conn.iceConnectionState);
        };
    }

    setupDataChannel(channel) {
        channel.onopen = () => {
            this.connected = true;
            this.onConnected();
        };
        channel.onmessage = (event) => {
            const message = JSON.parse(event.data);
            this.onMessage(message);
        };
        channel.onclose = () => {
            this.connected = false;
            this.onDisconnected();
        };
    }

    send(type, data = {}) {
        if (!this.dataChannel || this.dataChannel.readyState !== 'open') return;
        this.dataChannel.send(JSON.stringify({ type, data, timestamp: Date.now(), peerId: this.peerId }));
    }
}

window.P2PNetwork = P2PNetwork;
}