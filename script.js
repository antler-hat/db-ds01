let audioContext;
const voices = [
    { pitch: 100, modShape: 'sine', modAmount: 0, modSpeed: 1, attack: 0, decay: 30, sustain: 5, release: 100 },
    { pitch: 200, modShape: 'square', modAmount: 50, modSpeed: 1, attack: 0, decay: 50, sustain: 20, release: 200 },
    { pitch: 350, modShape: 'sawtooth', modAmount: 0, modSpeed: 1, attack: 50, decay: 10, sustain: 20, release: 200 },
    { pitch: 600, modShape: 'sine', modAmount: 50, modSpeed: 10, attack: 1, decay: 50, sustain: 0, release: 580 }
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
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(voice.pitch, now);
    
    // Create gain node for amplitude envelope
    const gainNode = audioContext.createGain();
    gainNode.gain.setValueAtTime(0, now);
    
    // Connect nodes
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Start oscillator
    oscillator.start(now);
    
    // Apply ADSR envelope
    const attackTime = voice.attack / 1000; // Convert to seconds
    const decayTime = voice.decay / 1000;
    const sustainLevel = voice.sustain / 100;
    const releaseTime = voice.release / 1000;
    
    // Attack
    gainNode.gain.linearRampToValueAtTime(1, now + attackTime);
    
    // Decay
    gainNode.gain.linearRampToValueAtTime(sustainLevel, now + attackTime + decayTime);
    
    // Release
    gainNode.gain.linearRampToValueAtTime(0, now + attackTime + decayTime + releaseTime);
    
    // Stop oscillator after envelope completes
    oscillator.stop(now + attackTime + decayTime + releaseTime);
    
    // Apply modulation if amount is greater than 0
    if (voice.modAmount > 0) {
        // Create modulator oscillator
        const modulator = audioContext.createOscillator();
        
        // Set modulator frequency based on mod speed
        const modFreq = voice.modSpeed;
        modulator.frequency.setValueAtTime(modFreq, now);
        
        // Set modulator type based on mod shape
        if (voice.modShape === 'reverseSawtooth') {
            // For reverse sawtooth, we'll use a custom approach
            // Create a gain node to control the modulation amount
            const modGain = audioContext.createGain();
            modGain.gain.setValueAtTime(voice.modAmount, now);
            
            // Connect modulator to gain node
            modulator.connect(modGain);
            
            // Create a custom curve for the reverse sawtooth
            const curve = new Float32Array(100);
            for (let i = 0; i < 100; i++) {
                // Create a reverse sawtooth that only occurs once
                curve[i] = 1 - (i / 100);
            }
            
            // Create a wave shaper to apply the custom curve
            const waveShaper = audioContext.createWaveShaper();
            waveShaper.curve = curve;
            
            // Connect the gain node to the wave shaper
            modGain.connect(waveShaper);
            
            // Connect the wave shaper to the oscillator frequency
            waveShaper.connect(oscillator.frequency);
        } else {
            // For standard waveforms, use the built-in oscillator types
            modulator.type = voice.modShape;
            
            // Create a gain node to control the modulation amount
            const modGain = audioContext.createGain();
            modGain.gain.setValueAtTime(voice.modAmount, now);
            
            // Connect modulator to gain node
            modulator.connect(modGain);
            
            // Connect gain node to oscillator frequency
            modGain.connect(oscillator.frequency);
        }
        
        // Start and stop modulator with the main oscillator
        modulator.start(now);
        modulator.stop(now + attackTime + decayTime + releaseTime);
    }
    
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