browser.runtime.onMessage.addListener(async (message) => {
  if (message.action === "save") {
    const tabs = await browser.tabs.query({currentWindow: true});
    const tabGroups = await browser.tabGroups.query({windowId: browser.windows.WINDOW_ID_CURRENT});
    await browser.storage.local.set({session: {tabs, tabGroups}});
    console.log("Session saved");
  } else if (message.action === "restore") {
    const result = await browser.storage.local.get("session");
    if (result.session) {
      const session = result.session;

      // Create all tabs first
      const createPromises = session.tabs.map(tab => 
        browser.tabs.create({
          url: tab.url, 
          active: false, 
          cookieStoreId: tab.cookieStoreId
        })
      );
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
            await browser.tabGroups.update(newGroup.id, {
              title: oldGroup.title,
              color: oldGroup.color
            });
          }
        }
      }
      console.log("Session restored");
    }
  }
});