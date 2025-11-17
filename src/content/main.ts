import './style.css'

import eq_icon from '@/assets/equalizer-svgrepo-com.svg'

console.log('[CRXJS] Hello world from content script!')



import defaultPresets, { FilterPreset } from './defaultPresets';

const validFilterTypes: BiquadFilterType[] = [
    "lowpass", "highpass", "bandpass", "lowshelf", "highshelf", "peaking", "notch", "allpass"
];

const audioContext = new AudioContext();
const mediaElementSources = new WeakMap<HTMLMediaElement, MediaElementAudioSourceNode>();
let previousAudioSource: MediaElementAudioSourceNode | null = null;
let lastPlayedElement: HTMLMediaElement | null = null;

const specifiedPreset = defaultPresets.find(preset => preset.name === "bassBoosterPlus")!;
const presetFilters = createFilters(specifiedPreset);
let appliedFilters: BiquadFilterNode[] = [];

// MARK: waitForElem
function waitForElem(selector: string, cb: (el: Element) => void) {
    const el = document.querySelector(selector);
    if (el) return cb(el);
    const obs = new MutationObserver(() => {
        const el = document.querySelector(selector);
        if (el) {
            obs.disconnect();
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
function createFilters(cf_preset: FilterPreset): BiquadFilterNode[] {
    return cf_preset.filters.map((band) => {
        const filter = audioContext.createBiquadFilter();
        filter.type = validFilterTypes.includes(band.type) ? band.type : 'peaking';
        filter.frequency.value = band.freq || 0;
        filter.Q.value = band.Q || 1;
        filter.gain.value = band.gain || 0;
        return filter;
    });
}

// MARK: applyEqualizer
function applyEqualizer(ae_audioElement: HTMLMediaElement) {
    let audioSource: MediaElementAudioSourceNode;
    if (mediaElementSources.has(ae_audioElement)) {
        audioSource = mediaElementSources.get(ae_audioElement)!;
    } else {
        audioSource = audioContext.createMediaElementSource(ae_audioElement);
        mediaElementSources.set(ae_audioElement, audioSource);
    }
    if (previousAudioSource) previousAudioSource.disconnect();
    appliedFilters.forEach((filter) => filter.disconnect());
    appliedFilters = [];
    let currentNode: AudioNode = audioSource;
    for (const filter of presetFilters) {
        currentNode.connect(filter);
        appliedFilters.push(filter);
        currentNode = filter;
    }
    currentNode.connect(audioContext.destination);
    previousAudioSource = audioSource;
}

// MARK: clearEqualizer
function clearEqualizer(audioElement: HTMLMediaElement) {
    appliedFilters.forEach((filter) => filter.disconnect());
    appliedFilters = [];
    if (audioElement && mediaElementSources.has(audioElement)) {
        const sourceNode = mediaElementSources.get(audioElement)!;
        try {
            sourceNode.disconnect();
            sourceNode.connect(audioContext.destination);
        } catch (e) {
            console.warn('Error reconnecting sourceNode:', e);
        }
    }
}

// Storage helpers (replace GM_getValue/GM_setValue)
function getEQState(): Promise<boolean> {
    return new Promise((resolve) => {
        chrome.storage.local.get(['eqOn'], (result) => {
            resolve(!!result.eqOn);
        });
    });
}
function setEQState(eqOn: boolean): Promise<void> {
    return new Promise((resolve) => {
        chrome.storage.local.set({ eqOn }, () => resolve());
    });
}




(async function () {
    'use strict';

    console.log('YTM Equalizer Extension loaded');

    let eqOn = await getEQState();
    eqOn ? onEQEnabled() : onEQDisabled();
    
    
    waitForElem('#right-content.right-content.style-scope.ytmusic-nav-bar', (panel) => {
        const btn = document.createElement("button");
        btn.className = "eq-toggle-btn" + (eqOn ? " on" : "");
        btn.innerHTML = `<img src="${eq_icon}" alt="EQ Icon">`;

        btn.style.order = '-1';
        btn.onclick = async () => {
            eqOn = !eqOn;
            await setEQState(eqOn);
            btn.classList.toggle('on', eqOn);
            
            if (eqOn) {
                onEQEnabled();
                if (lastPlayedElement) applyEqualizer(lastPlayedElement);
            } else {
                onEQDisabled();
                if (lastPlayedElement) clearEqualizer(lastPlayedElement);
            }
        };

        // btn.onclick = () => {
        //     chrome.runtime.sendMessage({ action: "open_popup" });
        // };

        panel.insertBefore(btn, panel.firstChild);


        

    });





    document.addEventListener('play', function (e) {
        lastPlayedElement = e.target as HTMLMediaElement;
        if (eqOn) {
            if (lastPlayedElement === e.target && appliedFilters.length > 0) {
                // Already applied
            } else {
                applyEqualizer(e.target as HTMLMediaElement);
            }
        }
    }, true);



})();
