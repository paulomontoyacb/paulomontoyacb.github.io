const tunerToggleBtn = document.getElementById('tunerToggleBtn');
const tunerNoteEl = document.getElementById('tunerNote');
const tunerFreqEl = document.getElementById('tunerFreq');
const tunerCentsEl = document.getElementById('tunerCents');
const tunerStatusEl = document.getElementById('tunerStatus');
const tunerNeedleEl = document.getElementById('tunerNeedle');
const tunerTargetNoteEl = document.getElementById('tunerTargetNote');
const tunerTargetFreqEl = document.getElementById('tunerTargetFreq');
const tunerClarityEl = document.getElementById('tunerClarity');
const tunerLevelEl = document.getElementById('tunerLevel');
const tunerRangeEl = document.getElementById('tunerRange');
const tunerLockStateEl = document.getElementById('tunerLockState');
const tuningReference = document.getElementById('tuningReference');

const NOTE_NAMES = ['Do', 'Do#', 'Re', 'Re#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'];
const MAX_HISTORY = 7;
const MAX_STABILITY_HISTORY = 5;

let tunerAudioContext = null;
let tunerMediaStream = null;
let tunerSourceNode = null;
let tunerWorkletNode = null;

const recentFrequencies = [];
const recentCents = [];
const pitchStabilityHistory = [];

let displayedNote = '--';
let displayedTargetFreq = null;
let consecutiveSameNote = 0;
let lastCandidateNote = null;
let frameCounter = 0;
let lastDisplayedFrequency = null;
let attackHoldFrames = 0;
let tuningA4 = 440;

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function frequencyToMidi(freq) {
    return 69 + 12 * Math.log2(freq / tuningA4);
}

function midiToFrequency(midi) {
    return tuningA4 * Math.pow(2, (midi - 69) / 12);
}

function frequencyToNote(freq) {
    const midi = Math.round(frequencyToMidi(freq));
    const name = NOTE_NAMES[((midi % 12) + 12) % 12];
    const octave = Math.floor(midi / 12) - 1;
    const label = `${name}${octave}`;
    const targetFreq = midiToFrequency(midi);
    const cents = 1200 * Math.log2(freq / targetFreq);

    return {
        midi,
        name,
        octave,
        label,
        targetFreq,
        cents
    };
}

function median(values) {
    if (!values.length) {
        return null;
    }

    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);

    return sorted.length % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2
        : sorted[mid];
}

function pushLimited(arr, value, maxLength) {
    arr.push(value);

    while (arr.length > maxLength) {
        arr.shift();
    }
}

function averageAbsoluteDeviation(values) {
    if (!values.length) {
        return 0;
    }

    const med = median(values);
    let sum = 0;

    for (const value of values) {
        sum += Math.abs(value - med);
    }

    return sum / values.length;
}

function clearArray(arr) {
    arr.length = 0;
}

function getAutoRange(freq) {
    if (freq < 180) {
        return {
            name: 'grave',
            minConfidence: 0.4,
            minRms: 0.0009,
            uiUpdateEvery: 2
        };
    }

    if (freq < 1200) {
        return {
            name: 'medio',
            minConfidence: 0.55,
            minRms: 0.0008,
            uiUpdateEvery: 1
        };
    }

    return {
        name: 'acuto',
        minConfidence: 0.62,
        minRms: 0.0005,
        uiUpdateEvery: 1
    };
}

function getLockRequirement(freq) {
    if (freq < 180) {
        return 3;
    }

    if (freq < 250) {
        return 2;
    }

    return 2;
}

function updateNeedle(cents) {
    const clamped = clamp(cents, -50, 50);
    const left = ((clamped + 50) / 100) * 100;
    tunerNeedleEl.style.left = `${left}%`;
}

function aggiornaBottoneMicrofono() {
    tunerToggleBtn.textContent = tunerAudioContext ? 'Disattiva microfono' : 'Attiva microfono';
}

function resetMeta() {
    tunerTargetNoteEl.textContent = '--';
    tunerTargetFreqEl.textContent = '--';
    tunerClarityEl.textContent = '--';
    tunerLevelEl.textContent = '--';
    tunerRangeEl.textContent = '--';
    tunerLockStateEl.textContent = '--';
}

function resetTunerState() {
    clearArray(recentFrequencies);
    clearArray(recentCents);
    clearArray(pitchStabilityHistory);
    displayedNote = '--';
    displayedTargetFreq = null;
    consecutiveSameNote = 0;
    lastCandidateNote = null;
    frameCounter = 0;
    lastDisplayedFrequency = null;
    attackHoldFrames = 0;
    tunerNoteEl.textContent = '--';
    tunerFreqEl.textContent = '0.00 Hz';
    tunerCentsEl.textContent = '0.0 cent';
    updateNeedle(0);
    resetMeta();
}

function resetUI(message = 'Nessun pitch affidabile.') {
    tunerNoteEl.textContent = displayedNote !== '--' ? displayedNote : '--';

    if (lastDisplayedFrequency != null) {
        tunerFreqEl.textContent = `${lastDisplayedFrequency.toFixed(2)} Hz`;
    } else {
        tunerFreqEl.textContent = '0.00 Hz';
    }

    tunerCentsEl.textContent = '0.0 cent';
    updateNeedle(0);
    tunerStatusEl.textContent = message;
}

function commitDisplay(freq, noteInfo, clarity, rms, rangeName, lockState, displayedCents) {
    displayedNote = noteInfo.label;
    displayedTargetFreq = noteInfo.targetFreq;
    lastDisplayedFrequency = freq;

    tunerNoteEl.textContent = displayedNote;
    tunerFreqEl.textContent = `${freq.toFixed(2)} Hz`;
    tunerCentsEl.textContent = `${displayedCents >= 0 ? '+' : ''}${displayedCents.toFixed(1)} cent`;
    updateNeedle(displayedCents);

    tunerTargetNoteEl.textContent = displayedNote;
    tunerTargetFreqEl.textContent = `${displayedTargetFreq.toFixed(2)} Hz`;
    tunerClarityEl.textContent = clarity.toFixed(3);
    tunerLevelEl.textContent = rms.toFixed(4);
    tunerRangeEl.textContent = rangeName;
    tunerLockStateEl.textContent = lockState;

    if (Math.abs(displayedCents) <= 5) {
        tunerStatusEl.textContent = 'Intonazione stabile.';
    } else if (displayedCents < 0) {
        tunerStatusEl.textContent = 'Sei calante.';
    } else {
        tunerStatusEl.textContent = 'Sei crescente.';
    }
}

function isPitchStable(freq) {
    pushLimited(pitchStabilityHistory, freq, MAX_STABILITY_HISTORY);

    if (pitchStabilityHistory.length < 3) {
        return false;
    }

    const dev = averageAbsoluteDeviation(pitchStabilityHistory);
    const med = median(pitchStabilityHistory);

    if (med < 180) {
        return dev < 4.2;
    }

    if (med < 300) {
        return dev < 4.8;
    }

    return dev < 6.0;
}

function processPitchEstimate(pitch, clarity, rms, isAttack = false) {
    if (!pitch || !Number.isFinite(pitch)) {
        resetUI('Pitch non valido.');
        return;
    }

    if (pitch < 25 || pitch > 6000) {
        resetUI('Pitch fuori range.');
        return;
    }

    const autoRange = getAutoRange(pitch);

    if (clarity < autoRange.minConfidence) {
        resetUI(`Pitch incerto (${clarity.toFixed(3)}).`);
        return;
    }

    if (rms < autoRange.minRms) {
        resetUI('Segnale troppo debole.');
        return;
    }

    if (isAttack) {
        attackHoldFrames = pitch < 180 ? 2 : 1;
    }

    if (attackHoldFrames > 0) {
        attackHoldFrames--;
        tunerStatusEl.textContent = 'Attacco rilevato, attendo stabilizzazione...';
        tunerClarityEl.textContent = clarity.toFixed(3);
        tunerLevelEl.textContent = rms.toFixed(4);
        tunerRangeEl.textContent = autoRange.name;
        tunerLockStateEl.textContent = 'attack hold';
        return;
    }

    pushLimited(recentFrequencies, pitch, MAX_HISTORY);
    const stableFreq = median(recentFrequencies);

    if (!stableFreq) {
        resetUI('In attesa di stabilizzazione.');
        return;
    }

    const noteInfo = frequencyToNote(stableFreq);
    pushLimited(recentCents, noteInfo.cents, MAX_HISTORY);
    const stableCents = median(recentCents) ?? noteInfo.cents;

    if (displayedNote === '--' && recentFrequencies.length >= 2) {
        commitDisplay(stableFreq, noteInfo, clarity, rms, autoRange.name, 'aggancio', stableCents);
        return;
    }

    if (!isPitchStable(stableFreq)) {
        tunerStatusEl.textContent = 'Segnale presente, pitch ancora instabile...';
        tunerClarityEl.textContent = clarity.toFixed(3);
        tunerLevelEl.textContent = rms.toFixed(4);
        tunerRangeEl.textContent = autoRange.name;
        tunerLockStateEl.textContent = 'verifica stabilita';
        return;
    }

    if (lastCandidateNote === noteInfo.label) {
        consecutiveSameNote += 1;
    } else {
        lastCandidateNote = noteInfo.label;
        consecutiveSameNote = 1;
    }

    const requiredLocks = getLockRequirement(stableFreq);
    const isLocked = consecutiveSameNote >= requiredLocks;

    frameCounter += 1;
    const canRefreshUI = frameCounter % autoRange.uiUpdateEvery === 0;

    if (displayedNote === '--') {
        commitDisplay(stableFreq, noteInfo, clarity, rms, autoRange.name, 'acquisizione', stableCents);
        return;
    }

    if (noteInfo.label !== displayedNote && !isLocked) {
        tunerTargetNoteEl.textContent = noteInfo.label;
        tunerTargetFreqEl.textContent = `${noteInfo.targetFreq.toFixed(2)} Hz`;
        tunerClarityEl.textContent = clarity.toFixed(3);
        tunerLevelEl.textContent = rms.toFixed(4);
        tunerRangeEl.textContent = autoRange.name;
        tunerLockStateEl.textContent = `attesa ${consecutiveSameNote}/${requiredLocks}`;
        tunerStatusEl.textContent = 'Cambio nota in verifica...';
        return;
    }

    if (canRefreshUI) {
        commitDisplay(
            stableFreq,
            noteInfo,
            clarity,
            rms,
            autoRange.name,
            isLocked ? 'bloccata' : 'acquisizione',
            stableCents
        );
    }
}

async function startTuner() {
    if (tunerAudioContext) {
        return;
    }

    try {
        tunerStatusEl.textContent = 'Richiedo accesso al microfono...';

        tunerMediaStream = await navigator.mediaDevices.getUserMedia({
            audio: {
                channelCount: 1,
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false
            },
            video: false
        });

        tunerAudioContext = new AudioContext({
            latencyHint: 'interactive',
            sampleRate: 44100
        });

        await tunerAudioContext.audioWorklet.addModule('./pitch-worklet.js');

        tunerSourceNode = tunerAudioContext.createMediaStreamSource(tunerMediaStream);
        tunerWorkletNode = new AudioWorkletNode(tunerAudioContext, 'pitch-processor', {
            processorOptions: {
                sampleRate: tunerAudioContext.sampleRate
            }
        });

        tunerWorkletNode.port.onmessage = (event) => {
            const { pitch, clarity, rms, isAttack } = event.data;
            processPitchEstimate(pitch, clarity, rms, isAttack);
        };

        tunerSourceNode.connect(tunerWorkletNode);

        const silentGain = tunerAudioContext.createGain();
        silentGain.gain.value = 0;
        tunerWorkletNode.connect(silentGain).connect(tunerAudioContext.destination);

        aggiornaBottoneMicrofono();
        tunerStatusEl.textContent = 'Ascolto in corso...';
    } catch (error) {
        console.error(error);
        tunerStatusEl.textContent = 'Errore nell\'avvio del microfono.';
        await stopTuner(false);
    }
}

async function stopTuner(resetMessage = true) {
    if (tunerWorkletNode) {
        try {
            tunerWorkletNode.disconnect();
        } catch (error) {
            console.error(error);
        }
    }

    if (tunerSourceNode) {
        try {
            tunerSourceNode.disconnect();
        } catch (error) {
            console.error(error);
        }
    }

    if (tunerMediaStream) {
        tunerMediaStream.getTracks().forEach((track) => track.stop());
    }

    if (tunerAudioContext && tunerAudioContext.state !== 'closed') {
        try {
            await tunerAudioContext.close();
        } catch (error) {
            console.error(error);
        }
    }

    tunerWorkletNode = null;
    tunerSourceNode = null;
    tunerMediaStream = null;
    tunerAudioContext = null;

    resetTunerState();
    aggiornaBottoneMicrofono();

    if (resetMessage) {
        tunerStatusEl.textContent = 'Microfono disattivato.';
    }
}

resetTunerState();
tunerStatusEl.textContent = 'Premi "Attiva microfono".';
aggiornaBottoneMicrofono();

tunerToggleBtn.addEventListener('click', () => {
    if (tunerAudioContext) {
        stopTuner();
        return;
    }

    startTuner();
});

tuningReference.addEventListener('change', () => {
    tuningA4 = Number(tuningReference.value);

    if (lastDisplayedFrequency != null) {
        const noteInfo = frequencyToNote(lastDisplayedFrequency);
        const displayedCents = 1200 * Math.log2(lastDisplayedFrequency / noteInfo.targetFreq);
        commitDisplay(
            lastDisplayedFrequency,
            noteInfo,
            Number(tunerClarityEl.textContent) || 0,
            Number(tunerLevelEl.textContent) || 0,
            tunerRangeEl.textContent === '--' ? 'medio' : tunerRangeEl.textContent,
            tunerLockStateEl.textContent === '--' ? 'acquisizione' : tunerLockStateEl.textContent,
            displayedCents
        );
    }
});
