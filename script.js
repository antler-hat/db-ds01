let audioCtx = null;
const voices = [{}, {}, {}, {}]; // Array to hold parameters for each voice
const keyMap = { 'A': 0, 'S': 1, 'D': 2, 'F': 3 };

// --- Initialize Audio Context ---
function initAudio() {
    if (!audioCtx) {
        try {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            console.log("AudioContext initialized.");
        } catch (e) {
            console.error("Web Audio API is not supported in this browser", e);
            alert("Web Audio API is not supported in this browser");
        }
    }
}

// --- Update Parameter Function ---
function updateParameter(voiceIndex, param, value) {
    voices[voiceIndex][param] = value;

    // Update display span if it exists
    const displaySpanId = `${param}-val-${voiceIndex}`;
    const displaySpan = document.getElementById(displaySpanId);
    if (displaySpan) {
        let displayValue = value;
        // Format time values (ms to s) and sustain (0-100 to 0.0-1.0)
        if (['attack', 'decay', 'release'].includes(param)) {
            displayValue = (value / 1000).toFixed(3); // Show seconds with 3 decimal places
        } else if (param === 'sustain') {
            displayValue = (value / 100).toFixed(2); // Show level 0.0 to 1.0
        } else if (param === 'pitch' || param === 'modAmount') {
            displayValue = value; // Keep as is
        }
        displaySpan.textContent = displayValue;
    }
    //console.log(`Voice ${voiceIndex} ${param} set to ${value}`);
}

// --- Trigger Drum Sound ---
function triggerDrum(voiceIndex) {
    if (!audioCtx) {
        console.warn("AudioContext not initialized. Trying now.");
        initAudio(); // Try initializing now
        if (!audioCtx) return; // Still failed
    }

    const params = voices[voiceIndex];
    const now = audioCtx.currentTime;

    // --- Create Nodes ---
    const osc = audioCtx.createOscillator(); // Main oscillator
    const ampEnv = audioCtx.createGain();     // Amplitude envelope
    const modOsc = audioCtx.createOscillator(); // Modulation oscillator (LFO)
    const modGain = audioCtx.createGain();     // Modulation amount control

    // --- Configure Main Oscillator ---
    // Base pitch - Use triangle for a slightly softer, vintage-y tone by default
    osc.frequency.setValueAtTime(parseFloat(params.pitch) || 100, now);
    osc.type = 'triangle'; // You could make this another parameter!

    // --- Configure Modulation ---
    modOsc.type = params.modShape || 'sine';
    // LFO frequency - Let's set it relatively low, could be another slider!
    // A common trick is to link LFO speed slightly to pitch.
    const lfoFreq = Math.max(1, Math.min(30, (parseFloat(params.pitch) || 100) / 20));
    modOsc.frequency.setValueAtTime(lfoFreq, now);

    modGain.gain.setValueAtTime(parseFloat(params.modAmount) || 0, now); // Modulation depth

    // --- Connections ---
    modOsc.connect(modGain);
    modGain.connect(osc.frequency); // LFO modulates the main oscillator's frequency
    osc.connect(ampEnv);
    ampEnv.connect(audioCtx.destination);

    // --- Configure Amplitude Envelope (ADSR) ---
    // Convert slider ms values to seconds, ensure minimums
    const attackTime = Math.max(0.001, (params.attack || 10) / 1000);
    const decayTime = Math.max(0.001, (params.decay || 100) / 1000);
    const sustainLevel = Math.max(0.0001, (params.sustain || 0) / 100); // Sustain is a level 0-1
    const releaseTime = Math.max(0.001, (params.release || 100) / 1000);

    // Envelope shaping using AudioParam methods
    ampEnv.gain.setValueAtTime(0, now); // Start silent
    ampEnv.gain.linearRampToValueAtTime(1.0, now + attackTime); // Attack phase
    ampEnv.gain.linearRampToValueAtTime(sustainLevel, now + attackTime + decayTime); // Decay phase to sustain level
    // Release phase starts AFTER attack and decay are complete
    ampEnv.gain.linearRampToValueAtTime(0, now + attackTime + decayTime + releaseTime); // Release phase

    // --- Start and Stop Oscillators ---
    const totalDuration = attackTime + decayTime + releaseTime;
    osc.start(now);
    modOsc.start(now);

    osc.stop(now + totalDuration + 0.1); // Stop slightly after envelope finishes
    modOsc.stop(now + totalDuration + 0.1);

    // Visual Feedback
    const voiceElement = document.getElementById(`voice-${voiceIndex}`);
    if (voiceElement) {
        voiceElement.classList.add('playing');
        // Remove the class after the animation duration
        setTimeout(() => {
            voiceElement.classList.remove('playing');
        }, 200); // Match animation duration in CSS
    }
}

// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
    const sliders = document.querySelectorAll('input[type="range"]');
    const selectors = document.querySelectorAll('select');

    sliders.forEach(slider => {
        const voiceIndex = parseInt(slider.dataset.voice);
        const param = slider.dataset.param;
        // Initialize parameter values on load & update display
        updateParameter(voiceIndex, param, slider.value);

        slider.addEventListener('input', (e) => {
            updateParameter(voiceIndex, param, e.target.value);
        });
    });

    selectors.forEach(select => {
        const voiceIndex = parseInt(select.dataset.voice);
        const param = select.dataset.param;
        // Initialize parameter values on load
        updateParameter(voiceIndex, param, select.value);

        select.addEventListener('change', (e) => {
            updateParameter(voiceIndex, param, e.target.value);
        });
    });

    // Keyboard listener
    window.addEventListener('keydown', (e) => {
        // Try to initialize audio on first keydown if not already done by a click
        initAudio();

        // Check if any modifier keys are pressed (Ctrl, Alt, Shift, Meta)
        const hasModifier = e.ctrlKey || e.altKey || e.shiftKey || e.metaKey;
        
        // Only handle our drum keys if no modifier keys are pressed
        if (!hasModifier) {
            const key = e.key.toUpperCase();
            if (keyMap.hasOwnProperty(key)) {
                const voiceIndex = keyMap[key];
                triggerDrum(voiceIndex);
                e.preventDefault(); // Prevent default browser action for keys like 'S' (Save page)
            }
        }
    });

    // Attempt to initialize audio on first click anywhere
    document.body.addEventListener('click', initAudio, { once: true });
    document.body.addEventListener('touchstart', initAudio, { once: true });

    console.log("Drum synth ready. Press A, S, D, F.");
}); 