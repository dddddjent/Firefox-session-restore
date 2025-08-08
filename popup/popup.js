document.addEventListener('DOMContentLoaded', async () => {
    const sessionDisplay = document.getElementById('session-display');

    // Load and display the saved session
    const result = await browser.storage.local.get("session");
    if (result.session && result.session.tabs && result.session.tabs.length > 0) {
        const { tabs, tabGroups } = result.session;
        
        const groupContainers = {};

        // Create containers for each group
        if (tabGroups && tabGroups.length > 0) {
            for (const group of tabGroups) {
                const groupDiv = document.createElement('div');
                groupDiv.className = 'group';
                groupDiv.style.borderColor = group.color;
                // Use a data attribute to identify the group container
                groupDiv.dataset.groupId = group.id;

                const groupTitle = document.createElement('div');
                groupTitle.className = 'group-title';
                groupTitle.textContent = group.title || 'Unnamed Group';
                groupDiv.appendChild(groupTitle);

                sessionDisplay.appendChild(groupDiv);
                groupContainers[group.id] = groupDiv;
            }
        }

        // Create a container for ungrouped tabs
        const ungroupedContainer = document.createElement('div');
        ungroupedContainer.className = 'group';
        const ungroupedTitle = document.createElement('div');
        ungroupedTitle.className = 'group-title';
        ungroupedTitle.textContent = 'Ungrouped Tabs';
        ungroupedContainer.appendChild(ungroupedTitle);
        let hasUngrouped = false;

        // Place tabs in their respective containers
        for (const tab of tabs) {
            const tabDiv = document.createElement('div');
            tabDiv.className = 'tab';

            const favIcon = document.createElement('img');
            favIcon.src = tab.favIconUrl || 'default-favicon.png';
            tabDiv.appendChild(favIcon);

            const tabTitle = document.createElement('span');
            tabTitle.textContent = tab.title;
            tabDiv.appendChild(tabTitle);

            if (tab.groupId && groupContainers[tab.groupId]) {
                groupContainers[tab.groupId].appendChild(tabDiv);
            } else {
                ungroupedContainer.appendChild(tabDiv);
                hasUngrouped = true;
            }
        }

        if (hasUngrouped) {
            sessionDisplay.appendChild(ungroupedContainer);
        }

    } else {
        sessionDisplay.textContent = 'No session saved.';
    }
});

document.getElementById('save-button').addEventListener('click', () => {
    browser.runtime.sendMessage({action: "save"});
    window.location.reload(); // Refresh to show the new saved state
});

document.getElementById('restore-button').addEventListener('click', () => {
    browser.runtime.sendMessage({action: "restore"});
    window.close();
});

document.getElementById('clear-button').addEventListener('click', async () => {
    await browser.storage.local.remove("session");
    document.getElementById('session-display').textContent = 'No session saved.';
    window.location.reload(); // Refresh popup to show cleared state
});

document.getElementById('export-button').addEventListener('click', async () => {
    try {
        const result = await browser.runtime.sendMessage({ action: 'export' });
        if (!result || result.ok !== true) {
            if (result && result.reason === 'no-session') {
                alert('No session saved.');
                return;
            }
            // Fallback: export from popup via Blob + anchor
            try {
                const stored = await browser.storage.local.get('session');
                if (!stored.session) {
                    alert('No session saved.');
                    return;
                }
                const jsonString = JSON.stringify(stored.session, null, 2);
                const blob = new Blob([jsonString], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const filename = `session-${timestamp}.json`;
                const anchor = document.createElement('a');
                anchor.href = url;
                anchor.download = filename;
                document.body.appendChild(anchor);
                anchor.click();
                anchor.remove();
                setTimeout(() => URL.revokeObjectURL(url), 5000);
            } catch (fallbackError) {
                console.error('Fallback export failed:', fallbackError);
                alert('Failed to export session.');
            }
        }
    } catch (error) {
        console.error('Failed to export session:', error);
        // Last-chance fallback
        try {
            const stored = await browser.storage.local.get('session');
            if (!stored.session) {
                alert('No session saved.');
                return;
            }
            const jsonString = JSON.stringify(stored.session, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `session-${timestamp}.json`;
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = filename;
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            setTimeout(() => URL.revokeObjectURL(url), 5000);
        } catch (finalErr) {
            console.error('Final fallback export failed:', finalErr);
            alert('Failed to export session. Check console for details.');
        }
    }
});

document.getElementById('import-button').addEventListener('click', () => {
    browser.tabs.create({url: "import.html"});
    window.close(); // Close the popup
});
