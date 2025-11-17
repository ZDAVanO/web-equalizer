import './style.css'
import defaultPresets from '../content/defaultPresets'

// Set up the main HTML structure for the popup
document.querySelector('#app')!.innerHTML = `
  <div>

    <h1>YTM Equalizer</h1>

    <div class="card">
      <button id="eq-toggle-btn" type="button">Equalizer</button>
    </div>

    <div class="presets-list">
      <h2>Presets</h2>
      <select id="presets-select"></select>
    </div>

  </div>
`





// MARK: Toggle
// Get reference to the Equalizer toggle button
const eqToggle = document.querySelector<HTMLButtonElement>('#eq-toggle-btn')!;

// Update the button appearance and text based on enabled state
function updateEqToggle(enabled: boolean) {
  eqToggle.classList.toggle('on', enabled);
  eqToggle.textContent = enabled ? "Equalizer ON" : "Equalizer OFF";
}

// Initialize button state from chrome.storage
chrome.storage.local.get("eqEnabled", data => {
  const enabled = Boolean(data.eqEnabled);
  updateEqToggle(enabled);
});

// Handle button click: toggle state and update storage
eqToggle.addEventListener("click", () => {
  chrome.storage.local.get("eqEnabled", data => {
    const newState = !data.eqEnabled;
    chrome.storage.local.set({ eqEnabled: newState });
    updateEqToggle(newState);
  });
});






// MARK: Presets
// Render presets selector
const presetsSelect = document.querySelector<HTMLSelectElement>('#presets-select')!
presetsSelect.innerHTML = defaultPresets.map((preset) =>
  `<option value="${preset.name}">${preset.name}</option>`
).join('')

// Load selected preset from storage and set selector
chrome.storage.local.get("selectedPreset", data => {
  const name = typeof data.selectedPreset === "string" ? data.selectedPreset : defaultPresets[0].name;
  presetsSelect.value = name;
});

// Save selected preset to storage on change
presetsSelect.addEventListener("change", () => {
  chrome.storage.local.set({ selectedPreset: presetsSelect.value });
});


