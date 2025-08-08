browser.runtime.onMessage.addListener(async (message) => {
  if (message.action === "save") {
    // Filter out privileged URLs
    let allTabs = await browser.tabs.query({currentWindow: true});
    const tabs = allTabs.filter(tab => tab.url && !tab.url.startsWith("about:") && !tab.url.startsWith("moz-extension:") && !tab.url.startsWith("file:"));
    
    const tabGroups = await browser.tabGroups.query({windowId: browser.windows.WINDOW_ID_CURRENT});
    
    console.log("Saving session:", {tabs, tabGroups});

    await browser.storage.local.set({session: {tabs, tabGroups}});
    console.log("Session saved");

  } else if (message.action === "restore") {
    const result = await browser.storage.local.get("session");
    if (result.session) {
      const session = result.session;
      console.log("Restoring session:", session);

      // Create all tabs first, but discarded for lazy loading
      const createPromises = session.tabs.map(async tab => {
        const createOptions = {
          url: tab.url, 
          active: false, // Create them inactive first
          discarded: true, // Lazy load the tab
          title: tab.title, // Preserve the title
          pinned: tab.pinned // Preserve pinned status
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

      // Group tabs using your proven logic
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
                // Correctly pass the groupId directly, as you said.
                await browser.tabGroups.update(newGroup, updateProperties);
            }
          }
        }
      }

      // Activate the originally active tab
      const activeTabIndex = session.tabs.findIndex(tab => tab.active);
      if (activeTabIndex !== -1) {
        await browser.tabs.update(newTabs[activeTabIndex].id, { active: true });
      }

      console.log("Session restored with lazy loading");
    }
  } else if (message.action === "export") {
    try {
      const result = await browser.storage.local.get("session");
      if (!result.session) {
        return { ok: false, reason: "no-session" };
      }
      const session = result.session;
      const jsonString = JSON.stringify(session, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const objectUrl = URL.createObjectURL(blob);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `session-${timestamp}.json`;

      await browser.downloads.download({
        url: objectUrl,
        filename,
        saveAs: true
      });

      // Revoke after a small delay to ensure download starts
      setTimeout(() => URL.revokeObjectURL(objectUrl), 5000);
      return { ok: true };
    } catch (error) {
      console.error("Failed to export session:", error);
      return { ok: false, error: String(error) };
    }
  }
});