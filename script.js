let audioContext;
const voices = [
    {
        key: 'a',
        pitch: 100,
        modShape: 'sine',
        modAmount: 0,
        modSpeed: 1,
        attack: 0,
        decay: 30,
        sustain: 5,
        release: 100,
        delayLevel: 0,
        delayFeedback: 0
    },
    {
        key: 's',
        pitch: 200,
        modShape: 'square',
        modAmount: 50,
        modSpeed: 1,
        attack: 0,
        decay: 50,
        sustain: 20,
        release: 200,
        delayLevel: 0,
        delayFeedback: 0
    },
    {
        key: 'd',
        pitch: 350,
        modShape: 'sawtooth',
        modAmount: 0,
        modSpeed: 1,
        attack: 50,
        decay: 10,
        sustain: 20,
        release: 200,
        delayLevel: 0,
        delayFeedback: 0
    },
    {
        key: 'f',
        pitch: 600,
        modShape: 'sine',
        modAmount: 50,
        modSpeed: 10,
        attack: 1,
        decay: 50,
        sustain: 0,
        release: 580,
        delayLevel: 0,
        delayFeedback: 0
    }
];

// Map keys to voices
const keyMap = {
    'a': 0,
    's': 1,
    'd': 2,
    'f': 3
};

// Track which keys are currently pressed
const pressedKeys = new Set();

// Initialize audio context on first user interaction
function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
}

// Update parameter values and display
function updateParameter(voiceIndex, param, value) {
    voices[voiceIndex][param] = value;
    
    // Update display value
    const displayElement = document.getElementById(`${param}-val-${voiceIndex}`);
    if (displayElement) {
        displayElement.textContent = value;
    }
}

// Create and play drum sound
function triggerDrum(voiceIndex) {
    initAudio();
    
    const voice = voices[voiceIndex];
    const now = audioContext.currentTime;
    
    // Create oscillator
    const oscillator = audioContext.createOscillator();
    oscillator.type = voice.modShape;
    oscillator.frequency.setValueAtTime(voice.pitch, now);
    
    // Create gain node for envelope
    const gainNode = audioContext.createGain();
    gainNode.gain.setValueAtTime(0, now);
    
    // Apply ADSR envelope
    gainNode.gain.linearRampToValueAtTime(1, now + voice.attack / 1000);
    gainNode.gain.linearRampToValueAtTime(voice.sustain / 100, now + (voice.attack + voice.decay) / 1000);
    gainNode.gain.linearRampToValueAtTime(0, now + (voice.attack + voice.decay + voice.release) / 1000);
    
    // Create modulation oscillator
    const modOsc = audioContext.createOscillator();
    modOsc.type = voice.modShape;
    modOsc.frequency.setValueAtTime(voice.modSpeed, now);
    
    // Create modulation gain
    const modGain = audioContext.createGain();
    modGain.gain.setValueAtTime(voice.modAmount / 100, now);
    
    // Connect modulation
    modOsc.connect(modGain);
    modGain.connect(oscillator.frequency);
    
    // Create a master gain node for the direct signal
    const masterGain = audioContext.createGain();
    
    // Create delay nodes for this voice
    const delay = audioContext.createDelay(5.0); // Max 5 second delay
    const feedback = audioContext.createGain();
    const delayGain = audioContext.createGain();
    
    // Set up delay routing
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(delayGain);
    
    // Set fixed delay time to 0.5 seconds
    delay.delayTime.setValueAtTime(0.5, now);
    
    // Update delay parameters
    feedback.gain.setValueAtTime(voice.delayFeedback / 100, now);
    delayGain.gain.setValueAtTime(voice.delayLevel / 100, now);
    
    // Connect audio path
    oscillator.connect(gainNode);
    
    // Split the signal: one path goes directly to master gain, one goes to delay
    gainNode.connect(masterGain);
    gainNode.connect(delay);
    
    // Connect both paths to destination
    masterGain.connect(audioContext.destination);
    delayGain.connect(audioContext.destination);
    
    // Start oscillators
    oscillator.start(now);
    modOsc.start(now);
    
    // Stop oscillators after envelope is complete
    const stopTime = now + (voice.attack + voice.decay + voice.release) / 1000;
    oscillator.stop(stopTime);
    modOsc.stop(stopTime);
    
    // Visual feedback
    const voiceElement = document.getElementById(`voice-${voiceIndex}`);
    voiceElement.classList.add('playing');
    
    // Remove playing class after animation completes
    setTimeout(() => {
        voiceElement.classList.remove('playing');
    }, 200);
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Initialize sliders and selects
    document.querySelectorAll('input[type="range"], select').forEach(element => {
        element.addEventListener('input', (e) => {
            const voiceIndex = parseInt(e.target.dataset.voice);
            const param = e.target.dataset.param;
            const value = parseFloat(e.target.value);
            
            updateParameter(voiceIndex, param, value);
        });
    });
    
    // Initialize keyboard controls
    document.addEventListener('keydown', (e) => {
        // Only trigger if no modifier keys are pressed (to allow browser shortcuts)
        if (!e.ctrlKey && !e.altKey && !e.shiftKey && !e.metaKey) {
            const key = e.key.toLowerCase();
            const voiceIndex = keyMap[key];
            
            // Only trigger if the key is mapped and not already pressed
            if (voiceIndex !== undefined && !pressedKeys.has(key)) {
                pressedKeys.add(key);
                triggerDrum(voiceIndex);
            }
        }
    });
    
    // Handle key up events to reset the pressed state
    document.addEventListener('keyup', (e) => {
        const key = e.key.toLowerCase();
        pressedKeys.delete(key);
    });
    
    // Initialize click controls
    document.querySelectorAll('.voice').forEach((voiceElement, index) => {
        voiceElement.addEventListener('click', () => {
            triggerDrum(index);
        });
    });
    
    console.log('Drum machine initialized. Press A, S, D, F to play drums.');
});

// Update value displays for all parameters
document.querySelectorAll('input[type="range"]').forEach(input => {
    const voiceIndex = input.dataset.voice;
    const param = input.dataset.param;
    const valueDisplay = document.getElementById(`${param}-val-${voiceIndex}`);
    
    // Update display on input change
    input.addEventListener('input', () => {
        const value = input.value;
        valueDisplay.textContent = value;
        voices[voiceIndex][param] = parseFloat(value);
    });
    
    // Set initial display value
    valueDisplay.textContent = input.value;
}); 