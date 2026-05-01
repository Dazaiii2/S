const statusEl = document.getElementById('status');
const roomLinkEl = document.getElementById('roomLink');
const startBtn = document.getElementById('startBtn');

// 1. Determine Room ID from URL or create one
const urlParams = new URLSearchParams(window.location.search);
let roomId = urlParams.get('room');
if (!roomId) {
    roomId = Math.random().toString(36).substring(2, 9);
    window.history.pushState({}, '', `?room=${roomId}`);
}
roomLinkEl.innerText = window.location.href;

const peer = new Peer(`band-${roomId}-${Math.floor(Math.random() * 1000)}`);
let localStream;

// 2. The "Sound Stabilizer" Logic
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function processIncomingAudio(stream) {
    const source = audioCtx.createMediaStreamSource(stream);
    
    // Compressor: Normalizes volume so instruments don't peak
    const compressor = audioCtx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-20, audioCtx.currentTime);
    compressor.knee.setValueAtTime(30, audioCtx.currentTime);
    compressor.ratio.setValueAtTime(10, audioCtx.currentTime);
    
    // Simple Gain to boost the signal slightly
    const gainNode = audioCtx.createGain();
    gainNode.gain.value = 1.2;

    source.connect(compressor);
    compressor.connect(gainNode);
    gainNode.connect(audioCtx.destination);
}

// 3. PeerJS Connection Handling
startBtn.onclick = async () => {
    try {
        // Request MIC access with LOW LATENCY settings
        localStream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: false, // Essential for music quality
                noiseSuppression: false,
                autoGainControl: false,
                latency: 0
            }
        });
        
        statusEl.innerText = "Mic Active. Waiting for bandmates...";
        audioCtx.resume();

        // Listen for incoming calls
        peer.on('call', (call) => {
            call.answer(localStream);
            call.on('stream', (remoteStream) => {
                processIncomingAudio(remoteStream);
            });
        });

        // Automatically connect to others in the same "room" 
        // Note: In a production app, you'd use a backend to list peers.
        // For this demo, we assume the shared link is the "discovery" mechanism.
        console.log("Peer ID:", peer.id);
    } catch (err) {
        console.error("Mic access denied", err);
        statusEl.innerText = "Error: Mic access denied.";
    }
};

peer.on('open', (id) => {
    statusEl.innerText = "Connected! Click button to start.";
});

