import { setupCounter } from './counter.ts'
import './style.css'

document.querySelector('#app')!.innerHTML = `
  <div>
    <h1>YTM Equalizer</h1>
    <div class="card">
      <button id="eq-toggle-btn" type="button">Equalizer</button>
    </div>
    <p class="read-the-docs">
      Click on the CRXJS logo to learn more
    </p>
  </div>
`

const eqBtn = document.querySelector<HTMLButtonElement>('#eq-toggle-btn')!;
let eqOn = false;

function updateBtn() {
  eqBtn.classList.toggle('on', eqOn);
  eqBtn.textContent = eqOn ? 'Equalizer ON' : 'Equalizer OFF';
}

chrome.storage.local.get(['eqOn'], (result) => {
  eqOn = !!result.eqOn;
  updateBtn();
});

eqBtn.onclick = () => {
  eqOn = !eqOn;
  chrome.storage.local.set({ eqOn }, () => {
    updateBtn();
  });
};

setupCounter(document.querySelector('#counter')!)
