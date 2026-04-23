MetroTuner

Italiano

MetroTuner e un'app web musicale pensata per studiare tempo, intonazione e riferimento armonico in un'unica pagina.  
Unisce metronomo, accordatore e drone in una sola interfaccia, cosi da poter lavorare su esercizi tecnici, scale, arpeggi e studio di brani senza dover usare strumenti separati.

Obiettivo

L'obiettivo del progetto e offrire uno strumento pratico e immediato per musicisti che vogliono:

- studiare con un metronomo preciso
- controllare l'intonazione in tempo reale
- usare un drone continuo come riferimento
- avere tutto disponibile contemporaneamente nella stessa schermata

Funzioni principali

Metronomo

Il metronomo include:

- selezione BPM con slider e input numerico
- firme ritmiche da "2/4" a "7/4"
- suddivisioni:
  - quarti
  - ottavi
  - terzina
  - sedicesimi
  - quintine
  - sestine
  - settimine
- accento del primo battere attivabile/disattivabile
- colori visivi attivabili/disattivabili
- slider volume dedicato
- sincronizzazione visiva migliorata rispetto al suono


Accordatore  

L'accordatore funziona tramite microfono e offre:

- rilevamento della nota suonata
- frequenza rilevata
- scostamento in cent
- indicatore visuale a lancetta
- modalita:
  - "Standard"
  - "Bassi"
- riferimento di accordatura:
  - "La = 440 Hz"
  - "La = 442 Hz"

Il valore di default e 442 Hz.

Perche ci sono 2 modalita nell'accordatore 

L'accordatore include due modalita perche gli strumenti e le diverse altezze sonore non si comportano allo stesso modo.

- la modalita "Standard" e pensata per registri medi e acuti, dove il rilevamento del pitch e in genere piu rapido e stabile
- la modalita "Bassi" e ottimizzata per frequenze piu gravi, dove il rilevamento del pitch e naturalmente piu difficile e richiede piu tolleranza, piu stabilizzazione e un comportamento leggermente diverso nel tracciamento

Questo rende l'accordatore piu affidabile sia per strumenti standard sia per strumenti o note piu gravi.


Drone

Il drone e stato progettato come supporto per intonazione, scale e studio melodico.

Caratteristiche:

- nota base selezionabile
- ottava selezionabile
- volume dedicato
- suono continuo caldo basato su **triangle wave**
- accordatura coerente con quella dell'accordatore
- pulsante "Cancella" per azzerare rapidamente le note aggiuntive

Default del drone:

- nota base: "Do"
- ottava: "2"
- scala: "Maggiore"

Scale disponibili nel drone

- Maggiore
- Minore naturale
- Minore armonica
- Minore melodica
- Pentatonica maggiore
- Pentatonica minore
- Blues
- Ionia
- Dorica
- Frigia
- Lidia
- Misolidia
- Eolia
- Locria

Note aggiuntive della scala

Per ogni scala e possibile aggiungere note derivate dalla tonalita scelta.

Funzioni disponibili:

- selezione delle note aggiuntive
- etichette adattive in base alla scala ("2a", "b3", "#4", "b7", ecc.)
- possibilita di aggiungere per ogni nota:
  - ottava base
  - "8va"
  - "15ma"
- "8va" e "15ma" possono anche essere attivate insieme
- visualizzazione compatta di tutte le note aggiuntive su una sola linea
- visualizzazione del solo nome della nota, senza numero di ottava

Interfaccia

L'interfaccia e organizzata in tre pannelli affiancati:

- Metronomo
- Accordatore
- Drone

I tre pannelli hanno la stessa larghezza nel layout desktop, per una disposizione piu uniforme e pulita.  
Sono stati anche ridotti gli spazi inutili per rendere la pagina piu compatta e leggibile.

Tecnologie usate

- "HTML"
- "CSS"
- "JavaScript vanilla"
- "Web Audio API"
- "AudioContext"
- "AudioWorklet"

File principali:

- "index.html" -> struttura dell'interfaccia
- "style.css" -> stile e layout
- "metro2.js" -> logica del metronomo
- "accordatore.js" -> logica dell'accordatore
- "pitch-worklet.js" -> analisi del pitch
- "drone.js" -> logica del drone

Migliorie implementate

Durante lo sviluppo sono state introdotte varie ottimizzazioni:

- pulizia di codice e stili non piu usati
- migliore coerenza tra HTML, CSS e JavaScript
- miglioramento del sync visivo del metronomo
- aggiunta del drone come modulo separato
- volumi indipendenti per metronomo e drone
- default musicali piu pratici
- semplificazione dell'interfaccia
- layout piu bilanciato per uso reale nello studio

Utilizzo

1. Apri il progetto in un browser moderno.
2. Attiva il microfono se vuoi usare l'accordatore.
3. Imposta BPM e suddivisione del metronomo.
4. Scegli nota, ottava e scala del drone.
5. Aggiungi le note della scala che vuoi sentire come riferimento.
6. Suona o canta sopra il drone controllando l'intonazione.

Nota tecnica
Per usare correttamente microfono e AudioWorklet e consigliato avviare il progetto tramite un piccolo server locale.

Autore

Creato da Paulo Montoya

---

MetroTuner

English

MetroTuner is a music web app designed to practice rhythm, intonation, and harmonic reference on a single page.  
It combines metronome, tuner, and drone into one interface, allowing musicians to work on technical exercises, scales, arpeggios, and repertoire study without needing separate tools.

Goal

The goal of the project is to provide a practical and immediate tool for musicians who want to:

- practice with a precise metronome
- monitor intonation in real time
- use a continuous drone as a reference
- keep everything available at the same time on the same screen

Main features

Metronome

The metronome includes:

- BPM selection with slider and numeric input
- time signatures from "2/4" to "7/4"
- subdivisions:
  - quarter notes
  - eighth notes
  - triplets
  - sixteenth notes
  - quintuplets
  - sextuplets
  - septuplets
- optional first-beat accent
- optional visual color feedback
- dedicated volume slider
- improved visual synchronization compared to the sound

Tuner

The tuner works through the microphone and provides:

- played note detection
- detected frequency
- cents deviation
- needle-style visual indicator
- modes:
  - "Standard"
  - "Bass"
- tuning reference:
  - "A = 440 Hz"
  - "A = 442 Hz"

The default value is 442 Hz.

Why there are 2 tuner modes
The tuner includes two modes because instruments and sound ranges do not behave the same way.

- "Standard" mode is designed for normal mid and high ranges, where pitch detection is usually faster and more stable
- "Bass" mode is optimized for lower frequencies, where pitch detection is naturally harder and needs more tolerance, more stabilization, and slightly different tracking behavior

This makes the tuner more reliable both for standard instruments and for lower-pitched instruments or notes.

Drone

The drone was designed as a support tool for intonation, scales, and melodic practice.

Features:

- selectable root note
- selectable octave
- dedicated volume
- warm continuous sound based on **triangle wave**
- tuning reference consistent with the tuner
- "Cancella" button to quickly clear added notes

Drone defaults:

- root note: "C"
- octave: "2"
- scale: "Major"

Available drone scales

- Major
- Natural minor
- Harmonic minor
- Melodic minor
- Major pentatonic
- Minor pentatonic
- Blues
- Ionian
- Dorian
- Phrygian
- Lydian
- Mixolydian
- Aeolian
- Locrian

Additional scale notes

For each scale it is possible to add notes derived from the selected tonal center.

Available functions:

- selection of additional notes
- adaptive labels depending on the scale ("2", "b3", "#4", "b7", etc.)
- possibility to add for each note:
  - base octave
  - "8va"
  - "15ma"
- "8va" and "15ma" can also be activated together
- compact display of all additional notes on a single line
- display of note name only, without octave number

Interface

The interface is organized into three side-by-side panels:

- Metronome
- Tuner
- Drone

The three panels have the same width in the desktop layout, for a cleaner and more balanced arrangement.  
Unnecessary spacing was also reduced to make the page more compact and readable.

Technologies used

- "HTML"
- "CSS"
- "Vanilla JavaScript"
- "Web Audio API"
- "AudioContext"
- "AudioWorklet"

Main files:

- "index.html" -> interface structure
- "style.css" -> style and layout
- "metro2.js" -> metronome logic
- "accordatore.js" -> tuner logic
- "pitch-worklet.js" -> pitch analysis
- "drone.js" -> drone logic

Implemented improvements

During development, several optimizations were introduced:

- cleanup of unused code and styles
- better consistency between HTML, CSS, and JavaScript
- improved visual sync of the metronome
- addition of the drone as a separate module
- independent volume controls for metronome and drone
- more practical musical defaults
- simplified interface
- more balanced layout for real study use

Usage

1. Open the project in a modern browser.
2. Enable the microphone if you want to use the tuner.
3. Set BPM and subdivision on the metronome.
4. Choose root note, octave, and scale on the drone.
5. Add the scale notes you want to hear as reference.
6. Play or sing over the drone while checking intonation.

Technical note

To properly use microphone access and AudioWorklet, it is recommended to run the project through a small local server.


---

Author

Created by Paulo Montoya.
