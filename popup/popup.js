document.getElementById('save-button').addEventListener('click', () => {
  browser.runtime.sendMessage({action: "save"});
});

document.getElementById('restore-button').addEventListener('click', () => {
  browser.runtime.sendMessage({action: "restore"});
});