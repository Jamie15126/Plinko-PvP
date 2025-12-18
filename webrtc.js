// WebRTC configuration using public STUN servers
const rtcConfig = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
    ]
};

let peerConnection = null;
let dataChannel = null;
let isHost = false;
let isConnected = false;
let gameMode = 'local'; // 'local', 'host', 'join'
let myTeam = null;
let opponentTeam = null;

// Game state synchronization
let gameStateQueue = [];
let isProcessingState = false;

// Initialize connection modal on page load
window.addEventListener('load', () => {
    const selectedMode = sessionStorage.getItem('gameMode');

    if (selectedMode === 'local') {
        // Start local game immediately
        startLocalGame();
    } else if (selectedMode === 'host') {
        // Open modal with host interface
        showConnectionModal();
        document.querySelector('.connection-mode').style.display = 'none';
        document.getElementById('hostInterface').style.display = 'block';
        startHosting();
    } else if (selectedMode === 'join') {
        // Open modal with join interface
        showConnectionModal();
        document.querySelector('.connection-mode').style.display = 'none';
        document.getElementById('joinInterface').style.display = 'block';
    } else {
        // Fallback - show mode selection (shouldn't happen normally)
        showConnectionModal();
    }

    // Clear the mode from sessionStorage
    sessionStorage.removeItem('gameMode');
});

function showConnectionModal() {
    document.getElementById('connectionModal').style.display = 'flex';
}

function hideConnectionModal() {
    document.getElementById('connectionModal').style.display = 'none';
}

function startLocalGame() {
    gameMode = 'local';
    hideConnectionModal();
    initLocalGame();
}

function initLocalGame() {
    // Both players can control their respective teams
    myTeam = null; // null means both teams are local
    updatePlayerIndicators();
}

async function startHosting() {
    gameMode = 'host';
    isHost = true;

    document.querySelector('.connection-mode').style.display = 'none';
    document.getElementById('hostInterface').style.display = 'block';
    document.getElementById('hostStatus').textContent = 'Generating connection offer...';

    try {
        peerConnection = new RTCPeerConnection(rtcConfig);

        // Create data channel
        dataChannel = peerConnection.createDataChannel('game');
        setupDataChannel();

        // Set up ICE candidate handling
        const iceCandidates = [];
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                iceCandidates.push(event.candidate);
            }
        };

        // Wait for ICE gathering to complete
        peerConnection.onicegatheringstatechange = () => {
            if (peerConnection.iceGatheringState === 'complete') {
                const offer = peerConnection.localDescription;
                const offerData = {
                    type: offer.type,
                    sdp: offer.sdp
                };

                document.getElementById('hostOffer').value = btoa(JSON.stringify(offerData));
                document.getElementById('hostStatus').textContent = '✓ Offer generated! Share it with Player 2.';
                document.getElementById('hostAnswerBox').style.display = 'block';
            }
        };

        // Create offer
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);

    } catch (error) {
        console.error('Error starting host:', error);
        document.getElementById('hostStatus').textContent = '❌ Error: ' + error.message;
    }
}

function showJoinInterface() {
    gameMode = 'join';
    isHost = false;

    document.querySelector('.connection-mode').style.display = 'none';
    document.getElementById('joinInterface').style.display = 'block';
}

async function submitOffer() {
    const offerText = document.getElementById('joinOffer').value.trim();

    if (!offerText) {
        alert('Please paste the host\'s offer first!');
        return;
    }

    try {
        document.getElementById('joinStatus').textContent = 'Processing offer...';

        const offerData = JSON.parse(atob(offerText));

        peerConnection = new RTCPeerConnection(rtcConfig);

        // Set up data channel handler
        peerConnection.ondatachannel = (event) => {
            dataChannel = event.channel;
            setupDataChannel();
        };

        // Set up ICE candidate handling
        const iceCandidates = [];
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                iceCandidates.push(event.candidate);
            }
        };

        // Wait for ICE gathering to complete
        peerConnection.onicegatheringstatechange = async () => {
            if (peerConnection.iceGatheringState === 'complete') {
                const answer = peerConnection.localDescription;
                const answerData = {
                    type: answer.type,
                    sdp: answer.sdp
                };

                document.getElementById('joinAnswer').value = btoa(JSON.stringify(answerData));
                document.getElementById('joinStatus').textContent = '✓ Answer generated!';
                document.getElementById('joinAnswerBox').style.display = 'block';
            }
        };

        // Set remote description and create answer
        await peerConnection.setRemoteDescription(new RTCSessionDescription(offerData));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

    } catch (error) {
        console.error('Error processing offer:', error);
        document.getElementById('joinStatus').textContent = '❌ Error: ' + error.message;
    }
}

async function submitAnswer() {
    const answerText = document.getElementById('hostAnswer').value.trim();

    if (!answerText) {
        alert('Please paste Player 2\'s answer first!');
        return;
    }

    try {
        document.getElementById('hostStatus').textContent = 'Connecting...';

        const answerData = JSON.parse(atob(answerText));
        await peerConnection.setRemoteDescription(new RTCSessionDescription(answerData));

        document.getElementById('hostStatus').textContent = '🎮 Connection established!';
        document.getElementById('hostTeamSelection').style.display = 'block';

    } catch (error) {
        console.error('Error processing answer:', error);
        document.getElementById('hostStatus').textContent = '❌ Error: ' + error.message;
    }
}

function setupDataChannel() {
    dataChannel.onopen = () => {
        console.log('Data channel opened');
        isConnected = true;

        if (isHost) {
            // Host waits for team selection
        } else {
            // Joiner waits for host to select team
            document.getElementById('joinStatus').textContent = '✓ Connected! Waiting for host to select teams...';
        }
    };

    dataChannel.onclose = () => {
        console.log('Data channel closed');
        handleDisconnect();
    };

    dataChannel.onerror = (error) => {
        console.error('Data channel error:', error);
    };

    dataChannel.onmessage = (event) => {
        handleMessage(JSON.parse(event.data));
    };
}

function selectTeam(team) {
    myTeam = team;
    opponentTeam = team === 'red' ? 'blue' : 'red';

    // Send team selection to opponent
    sendMessage({
        type: 'teamSelection',
        hostTeam: myTeam,
        joinTeam: opponentTeam
    });

    hideConnectionModal();
    showConnectionStatus();
    updatePlayerIndicators();
}

function handleMessage(message) {
    switch (message.type) {
        case 'teamSelection':
            if (!isHost) {
                myTeam = message.joinTeam;
                opponentTeam = message.hostTeam;
                hideConnectionModal();
                showConnectionStatus();
                updatePlayerIndicators();
            }
            break;

        case 'ballDrop':
            // Only non-host processes ball drops from host
            if (!isHost) {
                handleRemoteBallDrop(message.data);
            }
            break;

        case 'boost':
            // Process boost from opponent
            handleRemoteBoost(message.data);
            break;

        case 'gameState':
            // Sync game state
            handleGameStateSync(message.data);
            break;

        case 'reset':
            handleRemoteReset();
            break;

        case 'disconnect':
            handleDisconnect();
            break;
    }
}

function sendMessage(message) {
    if (dataChannel && dataChannel.readyState === 'open') {
        dataChannel.send(JSON.stringify(message));
    }
}

function showConnectionStatus() {
    const statusBar = document.getElementById('connectionStatus');
    const statusText = document.getElementById('statusText');
    const playerRole = document.getElementById('playerRole');

    statusBar.style.display = 'flex';
    statusText.textContent = '✓ Connected';
    playerRole.textContent = `${isHost ? 'Host' : 'Join'} • ${myTeam === 'red' ? '🔴 Red' : '🔵 Blue'} Team`;
}

function updatePlayerIndicators() {
    const redIndicator = document.getElementById('redPlayerIndicator');
    const blueIndicator = document.getElementById('bluePlayerIndicator');

    if (gameMode === 'local') {
        redIndicator.textContent = '👤 You';
        blueIndicator.textContent = '👤 You';
    } else {
        if (myTeam === 'red') {
            redIndicator.textContent = '👤 You';
            blueIndicator.textContent = '🌐 Opponent';
        } else if (myTeam === 'blue') {
            redIndicator.textContent = '🌐 Opponent';
            blueIndicator.textContent = '👤 You';
        }
    }
}

function cancelConnection() {
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    if (dataChannel) {
        dataChannel.close();
        dataChannel = null;
    }

    isConnected = false;
    gameMode = 'local';

    // Reset UI
    document.querySelector('.connection-mode').style.display = 'flex';
    document.getElementById('hostInterface').style.display = 'none';
    document.getElementById('joinInterface').style.display = 'none';
}

function disconnect() {
    if (isConnected) {
        sendMessage({ type: 'disconnect' });
    }

    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    if (dataChannel) {
        dataChannel.close();
        dataChannel = null;
    }

    isConnected = false;
    myTeam = null;
    opponentTeam = null;

    document.getElementById('connectionStatus').style.display = 'none';
    showConnectionModal();
    updatePlayerIndicators();
}

function handleDisconnect() {
    isConnected = false;

    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    if (dataChannel) {
        dataChannel.close();
        dataChannel = null;
    }

    alert('Connection lost. Returning to connection screen.');
    document.getElementById('connectionStatus').style.display = 'none';
    showConnectionModal();
}

function copyOffer() {
    const offerText = document.getElementById('hostOffer');
    offerText.select();
    offerText.setSelectionRange(0, 99999); // For mobile
    document.execCommand('copy');

    const btn = event.target;
    const originalText = btn.textContent;
    btn.textContent = '✓ Copied!';
    setTimeout(() => {
        btn.textContent = originalText;
    }, 2000);
}

function copyAnswer() {
    const answerText = document.getElementById('joinAnswer');
    answerText.select();
    answerText.setSelectionRange(0, 99999); // For mobile
    document.execCommand('copy');

    const btn = event.target;
    const originalText = btn.textContent;
    btn.textContent = '✓ Copied!';
    setTimeout(() => {
        btn.textContent = originalText;
    }, 2000);
}

// Export functions for game.js to use
window.isMultiplayer = () => gameMode !== 'local';
window.isMyTeam = (team) => gameMode === 'local' || team === myTeam;
window.sendGameMessage = sendMessage;
window.isGameHost = () => isHost;