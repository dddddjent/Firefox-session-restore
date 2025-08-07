browser.runtime.onMessage.addListener(async (message) => {
  if (message.action === "save") {
    // Filter out privileged URLs
    let allTabs = await browser.tabs.query({currentWindow: true});
    const tabs = allTabs.filter(tab => tab.url && !tab.url.startsWith("about:") && !tab.url.startsWith("moz-extension:") && !tab.url.startsWith("file:"));
    
    const tabGroups = await browser.tabGroups.query({windowId: browser.windows.WINDOW_ID_CURRENT});
    await browser.storage.local.set({session: {tabs, tabGroups}});
    console.log("Session saved");
  } else if (message.action === "restore") {
    const result = await browser.storage.local.get("session");
    if (result.session) {
      const session = result.session;

      // Create all tabs first
      const createPromises = session.tabs.map(async tab => {
        const createOptions = {
          url: tab.url, 
          active: false
        };

        // Only set cookieStoreId if it's valid and not the default
        if (tab.cookieStoreId && tab.cookieStoreId !== 'firefox-default') {
          try {
            // Verify the container exists
            await browser.contextualIdentities.get(tab.cookieStoreId);
            createOptions.cookieStoreId = tab.cookieStoreId;
          } catch (error) {
            console.warn(`Container ${tab.cookieStoreId} not found, using default`);
          }
        }

        return browser.tabs.create(createOptions);
      });
      const newTabs = await Promise.all(createPromises);

      // Group tabs
      if (session.tabGroups && session.tabGroups.length > 0) {
        const oldGroupIdToNewTabs = {};

        for (let i = 0; i < session.tabs.length; i++) {
          const oldTab = session.tabs[i];
          if (oldTab.groupId) {
            if (!oldGroupIdToNewTabs[oldTab.groupId]) {
              oldGroupIdToNewTabs[oldTab.groupId] = [];
            }
            oldGroupIdToNewTabs[oldTab.groupId].push(newTabs[i].id);
          }
        }

        for (const oldGroup of session.tabGroups) {
          const newTabIds = oldGroupIdToNewTabs[oldGroup.id];
          if (newTabIds && newTabIds.length > 0) {
            const newGroup = await browser.tabs.group({ tabIds: newTabIds });
            const updateProperties = {};
            if (oldGroup.title) {
              updateProperties.title = oldGroup.title;
            }
            if (oldGroup.color) {
              updateProperties.color = oldGroup.color;
            }
            if (Object.keys(updateProperties).length > 0) {
                            console.log(updateProperties);
                await browser.tabGroups.update(newGroup.id, updateProperties);
            }
          }
        }
      }
      console.log("Session restored");
    }
  }
});
