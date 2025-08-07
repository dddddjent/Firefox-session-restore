document.addEventListener('DOMContentLoaded', async () => {
    const sessionDisplay = document.getElementById('session-display');

    // Load and display the saved session
    const result = await browser.storage.local.get("session");
    if (result.session) {
        const { tabs, tabGroups } = result.session;

        if (tabGroups && tabGroups.length > 0) {
            const groupMap = new Map(tabGroups.map(g => [g.id, g]));

            for (const group of tabGroups) {
                const groupDiv = document.createElement('div');
                groupDiv.className = 'group';
                groupDiv.style.borderColor = group.color;

                const groupTitle = document.createElement('div');
                groupTitle.className = 'group-title';
                groupTitle.textContent = group.title || 'Unnamed Group';
                groupDiv.appendChild(groupTitle);

                sessionDisplay.appendChild(groupDiv);
            }
        }

        for (const tab of tabs) {
            const tabDiv = document.createElement('div');
            tabDiv.className = 'tab';

            const favIcon = document.createElement('img');
            favIcon.src = tab.favIconUrl || 'default-favicon.png'; // Use a default if none
            tabDiv.appendChild(favIcon);

            const tabTitle = document.createElement('span');
            tabTitle.textContent = tab.title;
            tabDiv.appendChild(tabTitle);

            if (tab.groupId) {
                const groupDiv = sessionDisplay.querySelector(`[data-group-id="${tab.groupId}"]`);
                if (groupDiv) {
                    groupDiv.appendChild(tabDiv);
                } else {
                    // Append to a default container if group not found
                    sessionDisplay.appendChild(tabDiv);
                }
            } else {
                sessionDisplay.appendChild(tabDiv);
            }
        }

    } else {
        sessionDisplay.textContent = 'No session saved.';
    }
});

document.getElementById('save-button').addEventListener('click', () => {
    browser.runtime.sendMessage({action: "save"});
    window.close(); // Close popup after action
});

document.getElementById('restore-button').addEventListener('click', () => {
    browser.runtime.sendMessage({action: "restore"});
    window.close();
});

document.getElementById('clear-button').addEventListener('click', async () => {
    await browser.storage.local.remove("session");
    document.getElementById('session-display').textContent = 'No session saved.';
});