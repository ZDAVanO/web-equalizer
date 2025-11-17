

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "open_popup") {
    chrome.action.openPopup();
  }
});





