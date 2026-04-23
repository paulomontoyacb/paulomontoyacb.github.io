const context = new AudioContext();

let contatore = 1;
let bpm = 60;
let battitiPerMisura = 4;
let suddivisione = 1;

let battereAttivo = true;
let coloriAttivi = true;
let metronomoAttivo = false;
let avvioCorrente = 0;

let schedulerInterval = null;
let uiTimeouts = [];

let nextNoteTime = 0;
let currentBeatNumber = 1;
let currentSubdivision = 1;

const lookahead = 20;          // ms
const scheduleAheadTime = 0.12; // sec

const metronomeToggleBtn = document.getElementById('metronomeToggleBtn');
const metronomoBox = document.querySelector('.metronomo');
const bpmSlider = document.getElementById('bpmSlider');
const bpmInput = document.getElementById('bpmInput');
const bpmValue = document.getElementById('bpmValue');
const contatoreVisivo = document.getElementById('contatoreVisivo');
const sottoContatoreVisivo = document.getElementById('sottoContatoreVisivo');
const timeSignature = document.getElementById('timeSignature');
const accentoToggle = document.getElementById('accentoToggle');
const coloriToggle = document.getElementById('coloriToggle');
const subdivisionSelect = document.getElementById('subdivisionSelect');

function aggiornaVisualeBpm(nuovoBpm) {
    bpm = Number(nuovoBpm);
    bpmSlider.value = bpm;
    bpmInput.value = bpm;
    bpmValue.textContent = bpm;
}

function aggiornaTempo(nuovoTempo) {
    battitiPerMisura = Number(nuovoTempo);
    timeSignature.value = battitiPerMisura;

    if (contatore > battitiPerMisura) {
        contatore = 1;
    }

    if (currentBeatNumber > battitiPerMisura) {
        currentBeatNumber = 1;
    }

    aggiornaDisplayConteggio();
}

function aggiornaSuddivisione(nuovaSuddivisione) {
    suddivisione = Number(nuovaSuddivisione);
    subdivisionSelect.value = suddivisione;

    if (currentSubdivision > suddivisione) {
        currentSubdivision = 1;
    }

    aggiornaDisplayConteggio();
}

function aggiornaDisplayConteggio() {
    contatoreVisivo.textContent = contatore;
    sottoContatoreVisivo.textContent = suddivisione > 1 ? `${currentSubdivision}/${suddivisione}` : '';
}

function resetUIState() {
    contatoreVisivo.classList.remove('attivo');
    metronomoBox.classList.remove('attivo-battere', 'attivo-tempo');
}

function clearAllUiTimeouts() {
    uiTimeouts.forEach(clearTimeout);
    uiTimeouts = [];
}

function triggerContatoreAnimation() {
    contatoreVisivo.classList.remove('attivo');

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            contatoreVisivo.classList.add('attivo');

            const t = setTimeout(() => {
                contatoreVisivo.classList.remove('attivo');
            }, 120);

            uiTimeouts.push(t);
        });
    });
}

function triggerBoxLight(isFirstBeat) {
    if (!coloriAttivi) {
        metronomoBox.classList.remove('attivo-battere', 'attivo-tempo');
        return;
    }

    metronomoBox.classList.remove('attivo-battere', 'attivo-tempo');

    const className = isFirstBeat ? 'attivo-battere' : 'attivo-tempo';
    const duration = isFirstBeat ? 250 : 150;

    requestAnimationFrame(() => {
        metronomoBox.classList.add(className);

        const t = setTimeout(() => {
            metronomoBox.classList.remove('attivo-battere', 'attivo-tempo');
        }, duration);

        uiTimeouts.push(t);
    });
}

function riproduciColpoSchedulato(frequenza, volumePicco, when) {
    const oscillatore = context.createOscillator();
    const gainNode = context.createGain();

    const durataStep = 60 / (bpm * suddivisione);
    const attack = 0.003;
    const durataSuono = Math.min(0.09, Math.max(0.035, durataStep * 0.45));
    const stopTime = when + durataSuono;

    oscillatore.type = 'sine';
    oscillatore.frequency.setValueAtTime(frequenza, when);

    gainNode.gain.setValueAtTime(0.0001, when);
    gainNode.gain.exponentialRampToValueAtTime(volumePicco, when + attack);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, stopTime);

    oscillatore.connect(gainNode);
    gainNode.connect(context.destination);

    oscillatore.start(when);
    oscillatore.stop(stopTime + 0.01);

    oscillatore.addEventListener('ended', () => {
        oscillatore.disconnect();
        gainNode.disconnect();
    }, { once: true });
}

function aggiornaUiSchedulata(when, beatNumber, subdivisionNumber) {
    const delayMs = Math.max(0, (when - context.currentTime) * 1000);
    const inizioBattito = subdivisionNumber === 1;
    const isFirstBeat = inizioBattito && beatNumber === 1;

    const t = setTimeout(() => {
        if (!metronomoAttivo) return;

        contatore = beatNumber;

        contatoreVisivo.textContent = beatNumber;
        sottoContatoreVisivo.textContent =
            suddivisione > 1 ? `${subdivisionNumber}/${suddivisione}` : '';

        if (inizioBattito) {
            triggerContatoreAnimation();
            triggerBoxLight(isFirstBeat);
        } else if (coloriAttivi) {
            metronomoBox.classList.remove('attivo-battere', 'attivo-tempo');
        }
    }, delayMs);

    uiTimeouts.push(t);
}

function scheduleBeat(when, beatNumber, subdivisionNumber) {
    const inizioBattito = subdivisionNumber === 1;

    if (inizioBattito && battereAttivo && beatNumber === 1) {
        riproduciColpoSchedulato(1760, 0.88, when);
    } else if (inizioBattito) {
        riproduciColpoSchedulato(880, 0.72, when);
    } else {
        riproduciColpoSchedulato(660, 0.44, when);
    }

    aggiornaUiSchedulata(when, beatNumber, subdivisionNumber);
}

function advanceNote() {
    const secondsPerStep = 60 / (bpm * suddivisione);
    nextNoteTime += secondsPerStep;

    if (currentSubdivision === suddivisione) {
        currentSubdivision = 1;
        currentBeatNumber = (currentBeatNumber % battitiPerMisura) + 1;
    } else {
        currentSubdivision++;
    }
}

function scheduler() {
    while (nextNoteTime < context.currentTime + scheduleAheadTime) {
        scheduleBeat(nextNoteTime, currentBeatNumber, currentSubdivision);
        advanceNote();
    }
}

function fermaScheduler() {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
}

function aggiornaBottoneMetronomo() {
    metronomeToggleBtn.value = metronomoAttivo ? 'Spegni metronomo' : 'Accendi metronomo';
}

function riallineaClock() {
    nextNoteTime = context.currentTime + 0.06;
}

async function avviaMetronomo() {
    const idAvvio = ++avvioCorrente;

    metronomoAttivo = true;
    aggiornaBottoneMetronomo();
    fermaScheduler();
    clearAllUiTimeouts();
    resetUIState();

    await context.resume();

    if (!metronomoAttivo || idAvvio !== avvioCorrente) return;

    currentBeatNumber = contatore;
    currentSubdivision = 1;
    riallineaClock();

    scheduler();
    schedulerInterval = setInterval(scheduler, lookahead);
}

function fermaMetronomo() {
    metronomoAttivo = false;
    avvioCorrente++;

    fermaScheduler();
    clearAllUiTimeouts();

    contatore = 1;
    currentBeatNumber = 1;
    currentSubdivision = 1;

    aggiornaDisplayConteggio();
    resetUIState();
    aggiornaBottoneMetronomo();
}

function clampBpm(valore) {
    let nuovoBpm = Math.round(Number(valore));

    if (Number.isNaN(nuovoBpm)) return bpm;
    if (nuovoBpm < 30) nuovoBpm = 30;
    if (nuovoBpm > 250) nuovoBpm = 250;

    return nuovoBpm;
}

function applicaBpmDaInput() {
    const valoreInserito = bpmInput.value.trim();

    if (valoreInserito === '') {
        bpmInput.value = bpm;
        bpmValue.textContent = bpm;
        return;
    }

    const nuovoBpm = clampBpm(valoreInserito);
    aggiornaVisualeBpm(nuovoBpm);

    if (metronomoAttivo) {
        riallineaClock();
    }
}

bpmSlider.addEventListener('input', () => {
    aggiornaVisualeBpm(clampBpm(bpmSlider.value));

    if (metronomoAttivo) {
        riallineaClock();
    }
});

bpmInput.addEventListener('input', () => {
    const soloCifre = bpmInput.value.replace(/\D/g, '');

    if (bpmInput.value !== soloCifre) {
        bpmInput.value = soloCifre;
    }

    if (soloCifre === '') return;

    bpmValue.textContent = clampBpm(soloCifre);
});

bpmInput.addEventListener('focus', () => {
    bpmInput.select();
});

bpmInput.addEventListener('change', applicaBpmDaInput);
bpmInput.addEventListener('blur', applicaBpmDaInput);

bpmInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        applicaBpmDaInput();
        bpmInput.blur();
    }
});

timeSignature.addEventListener('change', () => {
    aggiornaTempo(timeSignature.value);

    if (metronomoAttivo) {
        riallineaClock();
    }
});

accentoToggle.addEventListener('change', () => {
    battereAttivo = accentoToggle.checked;
});

coloriToggle.addEventListener('change', () => {
    coloriAttivi = coloriToggle.checked;
    resetUIState();
});

subdivisionSelect.addEventListener('change', () => {
    aggiornaSuddivisione(subdivisionSelect.value);

    if (metronomoAttivo) {
        currentSubdivision = 1;
        riallineaClock();
    }
});

metronomeToggleBtn.addEventListener('click', () => {
    if (metronomoAttivo) {
        fermaMetronomo();
    } else {
        avviaMetronomo();
    }
});

aggiornaVisualeBpm(bpm);
aggiornaTempo(battitiPerMisura);
aggiornaSuddivisione(suddivisione);
aggiornaBottoneMetronomo();