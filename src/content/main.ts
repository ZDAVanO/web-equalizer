import './style.css'

import eq_icon from '@/assets/equalizer-svgrepo-com.svg'

console.log('[CRXJS] Hello world from content script!')
console.log('YTM Equalizer Extension loaded');


import defaultPresets, { FilterPreset } from './defaultPresets';

const validFilterTypes: BiquadFilterType[] = [
    "lowpass", "highpass", "bandpass", "lowshelf", "highshelf", "peaking", "notch", "allpass"
];


let eqEnabled = false;
let eqToggleBtn: HTMLButtonElement | null = null;
let eqPreset = defaultPresets[0];

const audioContext = new AudioContext();
const mediaElementSources = new WeakMap<HTMLMediaElement, MediaElementAudioSourceNode>();
let previousAudioSource: MediaElementAudioSourceNode | null = null;
let lastPlayedElement: HTMLMediaElement | null = null;

const FILTER_COUNT = 10;
const equalizerFilters: BiquadFilterNode[] = Array.from({ length: FILTER_COUNT }, () => audioContext.createBiquadFilter());

let appliedFilters: BiquadFilterNode[] = [];

let userPresets: FilterPreset[] = [];


// MARK: waitForElem
function waitForElem(selector: string, cb: (el: Element) => void) {
    const el = document.querySelector(selector);
    if (el) {
        console.log(`[waitForElem] Found element: ${selector}`);
        return cb(el);
    }
    const obs = new MutationObserver(() => {
        const el = document.querySelector(selector);
        if (el) {
            obs.disconnect();
            console.log(`[waitForElem] Found element via MutationObserver: ${selector}`);
            cb(el);
        }
    });
    obs.observe(document.body, { childList: true, subtree: true });
}

// MARK: onEQEnabled
function onEQEnabled() {
    console.log('EQ enabled');
}

// MARK: onEQDisabled
function onEQDisabled() {
    console.log('EQ disabled');
}

// MARK: createFilters
// Більше не створюємо нові фільтри, а лише оновлюємо параметри існуючих
function updateFiltersFromPreset(cf_preset: FilterPreset) {
    cf_preset.filters.forEach((band, i) => {
        const filter = equalizerFilters[i];
        if (filter) {
            filter.type = validFilterTypes.includes(band.type) ? band.type : 'peaking';
            filter.frequency.value = band.freq || 0;
            filter.Q.value = band.Q || 1;
            filter.gain.value = band.gain || 0;
        }
    });
}


// MARK: applyEqualizer
function applyEqualizer(ae_audioElement: HTMLMediaElement) {
    console.log('applyEqualizer');

    let audioSource: MediaElementAudioSourceNode;

    if (mediaElementSources.has(ae_audioElement)) {
        console.log('MediaElementSourceNode already connected');
        audioSource = mediaElementSources.get(ae_audioElement)!;

    } else {
        console.log('MediaElementSourceNode not found, creating new one');
        audioSource = audioContext.createMediaElementSource(ae_audioElement);
        mediaElementSources.set(ae_audioElement, audioSource); // Зберігаємо джерело
    }

    console.log('previousAudioSource', previousAudioSource);
    if (previousAudioSource) {
        previousAudioSource.disconnect();
    }

    console.log('mediaElementSources', mediaElementSources);


    appliedFilters.forEach((filter) => filter.disconnect());
    appliedFilters = [];


    let currentNode: AudioNode = audioSource;
    for (const filter of equalizerFilters) {
        // console.log('Connecting filter', filter);
        currentNode.connect(filter);
        appliedFilters.push(filter);
        currentNode = filter;
    }
    console.log('appliedFilters', appliedFilters);
    currentNode.connect(audioContext.destination);

    console.log('Equalizer applied');

    previousAudioSource = audioSource;
}



// MARK: disableEqualizer
function disableEqualizer(audioElement: HTMLMediaElement) {
    console.log('disableEqualizer');
    // Disconnect filters
    appliedFilters.forEach((filter) => filter.disconnect());
    appliedFilters = [];

    if (audioElement && mediaElementSources.has(audioElement)) {
        const sourceNode = mediaElementSources.get(audioElement)!;
        try {
            console.log('[disableEqualizer] Reconnecting sourceNode directly to destination');
            sourceNode.disconnect();
            sourceNode.connect(audioContext.destination);
        } catch (e) {
            console.warn('[disableEqualizer] Error reconnecting sourceNode:', e);
        }
    }
}



function applyEQIfPlaying() {
    console.log('applyEQIfPlaying');
    const audios = document.querySelectorAll<HTMLMediaElement>('audio, video');
    audios.forEach(audio => {
        if (!audio.paused && !audio.ended && audio.readyState > 2) {
            lastPlayedElement = audio;
            if (eqEnabled) {
                console.log('[applyEQIfPlaying] Applying EQ to currently playing element');
                applyEqualizer(audio);
            }
        }
    });
}




// When page loads — read state, preset, and userPresets
chrome.storage.local.get(["eqEnabled", "selectedPreset", "userPresets"], data => {
    eqEnabled = !!data.eqEnabled;
    console.log('[EQ] eqEnabled state on load:', eqEnabled);

    // Load userPresets from storage
    if (Array.isArray(data.userPresets)) {
        userPresets = data.userPresets;
        console.log('[EQ] Loaded userPresets from storage:', userPresets);
    }

    // Find preset by name in both defaultPresets and userPresets
    if (data.selectedPreset) {
        const foundPreset = [...defaultPresets, ...userPresets].find(preset => preset.name === data.selectedPreset);
        if (foundPreset) {
            eqPreset = foundPreset;
            updateFiltersFromPreset(eqPreset);
            console.log('[EQ] Loaded preset from storage:', eqPreset.name);
        }
    }

    eqEnabled ? onEQEnabled() : onEQDisabled();

    updateEQBtnVisual();

    applyEQIfPlaying();
});












// React to storage changes (all tabs update EQ automatically)
chrome.storage.onChanged.addListener((changes, area) => {
    console.log('[EQ] storage.onChanged detected:', changes, area);

    if (changes.userPresets) {
        // Update userPresets variable when changed
        userPresets = Array.isArray(changes.userPresets.newValue) ? changes.userPresets.newValue : [];
        console.log('[EQ] userPresets updated:', userPresets);
    }

    if (changes.eqEnabled) {
        eqEnabled = !!changes.eqEnabled.newValue;

        console.log('[EQ] eqEnabled changed:', eqEnabled);

        eqEnabled ? onEQEnabled() : onEQDisabled();
        updateEQBtnVisual();

        if (lastPlayedElement) {
            if (eqEnabled) {
                applyEqualizer(lastPlayedElement);
            } else {
                disableEqualizer(lastPlayedElement);
            }
        }
    }

    if (changes.selectedPreset) {
        const newPresetName = changes.selectedPreset.newValue;
        console.log('[EQ] selectedPreset changed:', newPresetName);

        // Search for preset in both defaultPresets and userPresets
        const foundPreset = [...defaultPresets, ...userPresets].find(preset => preset.name === newPresetName);
        if (foundPreset) {
            eqPreset = foundPreset;
            console.log('updating to preset:', eqPreset);
            updateFiltersFromPreset(eqPreset);
            // if (eqEnabled && lastPlayedElement) {
            //     disableEqualizer(lastPlayedElement);
            //     applyEqualizer(lastPlayedElement);
            // }
        }
    }


    if (changes.currentFilters) {
        console.log('[EQ] currentFilters changed:', changes.currentFilters.newValue);
        const newFilters = changes.currentFilters.newValue;
        if (Array.isArray(newFilters) && newFilters.length === equalizerFilters.length) {
            // Оновити параметри фільтрів
            newFilters.forEach((band, i) => {
                const filter = equalizerFilters[i];
                if (filter) {
                    filter.type = validFilterTypes.includes(band.type) ? band.type : 'peaking';
                    filter.frequency.value = band.freq || 0;
                    filter.Q.value = band.Q || 1;
                    filter.gain.value = band.gain || 0;
                }
            });
        }
    }


    
});







waitForElem('#right-content.right-content.style-scope.ytmusic-nav-bar', (panel) => {
    const btn = document.createElement("button");
    btn.className = "eq-toggle-btn";
    btn.innerHTML = `<img src="${eq_icon}" alt="EQ Icon">`;
    // btn.style.order = '-1';

    btn.onclick = () => {
        // eqOn = toggleEQ(eqOn, btn);
        chrome.runtime.sendMessage({ action: "open_popup" });
    };

    eqToggleBtn = btn;
    panel.insertBefore(btn, panel.firstChild);

});



// MARK: updateEQBtnVisual
function updateEQBtnVisual() {
    if (eqToggleBtn) {
        eqToggleBtn.classList.toggle('on', eqEnabled);
    }
}


document.addEventListener('play', function (e) {
    lastPlayedElement = e.target as HTMLMediaElement;
    if (eqEnabled) {
        if (lastPlayedElement === e.target && appliedFilters.length > 0) {
            // Already applied
            console.log('Equalizer already applied to this element');
        } else {
            applyEqualizer(e.target as HTMLMediaElement);
        }
    }
}, true);







