const context = new AudioContext();

let contatore = 1;
let intervallo;
let timeoutAnimazione;
let timeoutIlluminazione;
let bpm = 60;
let battitiPerMisura = 4;
let suddivisione = 1;
let indiceSuddivisione = 1;
let battereAttivo = true;
let coloriAttivi = true;
let metronomoAttivo = false;
let avvioCorrente = 0;

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

    aggiornaDisplayConteggio();
}

function aggiornaSuddivisione(nuovaSuddivisione) {
    suddivisione = Number(nuovaSuddivisione);
    subdivisionSelect.value = suddivisione;

    if (indiceSuddivisione > suddivisione) {
        indiceSuddivisione = 1;
    }

    aggiornaDisplayConteggio();
}

function aggiornaDisplayConteggio() {
    contatoreVisivo.textContent = contatore;
    sottoContatoreVisivo.textContent = '';
}

function aggiornaContatoreVisivo(inizioBattito) {
    aggiornaDisplayConteggio();

    if (!inizioBattito) {
        return;
    }

    contatoreVisivo.classList.remove('attivo');
    void contatoreVisivo.offsetWidth;
    contatoreVisivo.classList.add('attivo');

    clearTimeout(timeoutAnimazione);
    timeoutAnimazione = setTimeout(() => {
        contatoreVisivo.classList.remove('attivo');
    }, 120);
}

function illuminaRiquadro(inizioBattito) {
    if (!coloriAttivi) {
        metronomoBox.classList.remove('attivo-battere', 'attivo-tempo');
        return;
    }

    let classeAttiva = '';
    let durataIlluminazione = 0;

    if (inizioBattito && contatore === 1) {
        classeAttiva = 'attivo-battere';
        durataIlluminazione = 250;
    } else if (inizioBattito) {
        classeAttiva = 'attivo-tempo';
        durataIlluminazione = 150;
    }

    metronomoBox.classList.remove('attivo-battere', 'attivo-tempo');

    if (!classeAttiva) {
        return;
    }

    void metronomoBox.offsetWidth;
    metronomoBox.classList.add(classeAttiva);

    clearTimeout(timeoutIlluminazione);
    timeoutIlluminazione = setTimeout(() => {
        metronomoBox.classList.remove('attivo-battere', 'attivo-tempo');
    }, durataIlluminazione);
}

function riproduciColpo(frequenza, volumePicco) {
    const oscillatore = context.createOscillator();
    const gainNode = context.createGain();
    const adesso = context.currentTime;
    const durataStep = 60 / (bpm * suddivisione);
    const attack = 0.004;
    const durataSuono = Math.min(0.11, Math.max(0.045, durataStep * 0.55));
    const stopTime = adesso + durataSuono;

    oscillatore.type = 'sine';
    oscillatore.frequency.setValueAtTime(frequenza, adesso);

    gainNode.gain.setValueAtTime(0.0001, adesso);
    gainNode.gain.exponentialRampToValueAtTime(volumePicco, adesso + attack);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, stopTime);

    oscillatore.connect(gainNode).connect(context.destination);
    oscillatore.start(adesso);
    oscillatore.stop(stopTime + 0.01);

    oscillatore.addEventListener('ended', () => {
        oscillatore.disconnect();
        gainNode.disconnect();
    }, { once: true });
}

function eseguiBattito() {
    const inizioBattito = indiceSuddivisione === 1;

    aggiornaContatoreVisivo(inizioBattito);
    illuminaRiquadro(inizioBattito);

    if (inizioBattito && battereAttivo && contatore === 1) {
        riproduciColpo(880, 0.22);
    } else if (inizioBattito) {
        riproduciColpo(440, 0.18);
    } else {
        riproduciColpo(330, 0.12);
    }

    console.log(`Battito ${contatore}, suddivisione ${indiceSuddivisione}/${suddivisione}`);

    if (indiceSuddivisione === suddivisione) {
        indiceSuddivisione = 1;
        contatore = (contatore % battitiPerMisura) + 1;
    } else {
        indiceSuddivisione++;
    }
}

function fermaIntervallo() {
    clearInterval(intervallo);
    intervallo = undefined;
}

function aggiornaBottoneMetronomo() {
    metronomeToggleBtn.value = metronomoAttivo ? 'Spegni metronomo' : 'Accendi metronomo';
}

async function avviaMetronomo() {
    const idAvvio = ++avvioCorrente;

    metronomoAttivo = true;
    aggiornaBottoneMetronomo();
    fermaIntervallo();
    await context.resume();

    if (!metronomoAttivo || idAvvio !== avvioCorrente) {
        return;
    }

    intervallo = setInterval(eseguiBattito, 60000 / (bpm * suddivisione));
    console.log('Ho Startato');
}

function fermaMetronomo() {
    metronomoAttivo = false;
    avvioCorrente++;
    fermaIntervallo();
    clearTimeout(timeoutAnimazione);
    clearTimeout(timeoutIlluminazione);
    contatore = 1;
    indiceSuddivisione = 1;
    aggiornaDisplayConteggio();
    contatoreVisivo.classList.remove('attivo');
    metronomoBox.classList.remove('attivo-battere', 'attivo-tempo');
    aggiornaBottoneMetronomo();
    console.log('Ho Stoppato');
}

function applicaBpmDaInput() {
    const valoreInserito = bpmInput.value.trim();

    if (valoreInserito === '') {
        bpmInput.value = bpm;
        bpmValue.textContent = bpm;
        return;
    }

    let nuovoBpm = Number(valoreInserito);

    if (Number.isNaN(nuovoBpm)) {
        bpmInput.value = bpm;
        bpmValue.textContent = bpm;
        return;
    }

    nuovoBpm = Math.round(nuovoBpm);

    if (nuovoBpm < 30) {
        nuovoBpm = 30;
    }

    if (nuovoBpm > 250) {
        nuovoBpm = 250;
    }

    aggiornaVisualeBpm(nuovoBpm);

    if (metronomoAttivo) {
        avviaMetronomo();
    }
}

bpmSlider.addEventListener('input', () => {
    aggiornaVisualeBpm(bpmSlider.value);

    if (metronomoAttivo) {
        avviaMetronomo();
    }
});

bpmInput.addEventListener('input', () => {
    const soloCifre = bpmInput.value.replace(/\D/g, '');

    if (bpmInput.value !== soloCifre) {
        bpmInput.value = soloCifre;
    }

    if (soloCifre === '') {
        return;
    }

    const nuovoBpm = Number(soloCifre);

    if (!Number.isNaN(nuovoBpm)) {
        bpmValue.textContent = Math.round(nuovoBpm);
    }
});

bpmInput.addEventListener('focus', () => {
    bpmInput.select();
});

bpmInput.addEventListener('change', () => {
    applicaBpmDaInput();
});

bpmInput.addEventListener('blur', () => {
    applicaBpmDaInput();
});

bpmInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        applicaBpmDaInput();
        bpmInput.blur();
    }
});

timeSignature.addEventListener('change', () => {
    aggiornaTempo(timeSignature.value);

    if (metronomoAttivo) {
        avviaMetronomo();
    }
});

accentoToggle.addEventListener('change', () => {
    battereAttivo = accentoToggle.checked;
});

coloriToggle.addEventListener('change', () => {
    coloriAttivi = coloriToggle.checked;
    clearTimeout(timeoutIlluminazione);
    metronomoBox.classList.remove('attivo-battere', 'attivo-tempo');
});

subdivisionSelect.addEventListener('change', () => {
    aggiornaSuddivisione(subdivisionSelect.value);

    if (metronomoAttivo) {
        avviaMetronomo();
    }
});

metronomeToggleBtn.addEventListener('click', () => {
    if (metronomoAttivo) {
        fermaMetronomo();
        return;
    }

    avviaMetronomo();
});

aggiornaVisualeBpm(bpm);
aggiornaTempo(battitiPerMisura);
aggiornaSuddivisione(suddivisione);
aggiornaBottoneMetronomo();
