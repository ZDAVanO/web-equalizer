
import './style.css'

// Set up the main HTML structure for the popup
document.querySelector('#app')!.innerHTML = `
  <div>
    <h1>YTM Equalizer</h1>
    <div class="card">
      <button id="eq-toggle-btn" type="button">Equalizer</button>
    </div>
  </div>
`

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

