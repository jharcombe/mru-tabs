'use strict';

enum Key {
  windows = 'mru-tabs_windows',
}

let done_setup = false;
async function setup() {
  console.log('setup called');
  if (done_setup) return;
  done_setup = true;

  const windows = {};
  chrome.tabs.query({}, async (tabs) => {
    tabs.forEach((tab) => {
      const tabs = windows[tab.windowId] ?? [];
      tabs.push(tab.id);

      // setting in case of entry not existing previously
      windows[tab.windowId] = tabs;
    });

    await chrome.storage.local.set({
      [Key.windows]: windows,
    });
  });
}

chrome.runtime.onStartup.addListener(() => {
  console.log('onStartup');
  setup();
});
chrome.runtime.onInstalled.addListener(() => {
  console.log('onInstalled');
  setup();
});

// shortcuts

chrome.commands.onCommand.addListener(async (command, tab) => {
  chrome.storage.local.get(Key.windows, (windows_) => {
    const windows = windows_[Key.windows];
    const tabs = windows[tab.windowId];

    var nextTab: number;
    switch (command) {
      case 'nextTab':
        nextTab = tabs[1];
        break;
      case 'prevTab':
        // TODO: handle multi key presses
        break;
      default:
        return;
    }

    // nextTab should never be undefined but you never know
    if (typeof nextTab !== 'undefined') {
      chrome.tabs.update(nextTab, { active: true });
    }
  });
});

// tabs

chrome.tabs.onCreated.addListener((tab) =>
  chrome.storage.local.get(Key.windows, (windows_) => {
    const windows = windows_[Key.windows];

    windows[tab.windowId].push(tab.id);

    chrome.storage.local.set(windows_);
  })
);

chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  chrome.storage.local.get(Key.windows, (windows_) => {
    const windows = windows_[Key.windows];

    const tabs = windows[removeInfo.windowId];
    tabs.splice(tabs.indexOf(tabId), 1);

    chrome.storage.local.set(windows_);
  });
});

chrome.tabs.onActivated.addListener((tab) => {
  chrome.storage.local.get(Key.windows, (windows_) => {
    const windows = windows_[Key.windows];

    const tabs = windows[tab.windowId];
    tabs.splice(tabs.indexOf(tab.tabId), 1);
    tabs.unshift(tab.tabId);

    chrome.storage.local.set(windows_);
  });
});

chrome.tabs.onAttached.addListener((tabId, attachInfo) =>
  chrome.storage.local.get(Key.windows, (windows_) => {
    const windows = windows_[Key.windows];

    windows[attachInfo.newWindowId].push(tabId);

    chrome.storage.local.set(windows_);
  })
);

chrome.tabs.onDetached.addListener((tabId, detachInfo) => {
  chrome.storage.local.get(Key.windows, (windows_) => {
    const windows = windows_[Key.windows];

    const tabs = windows[detachInfo.oldWindowId];
    tabs.splice(tabs.indexOf(tabId), 1);

    chrome.storage.local.set(windows_);
  });
});

chrome.tabs.onReplaced.addListener((addedTabId, removedTabId) => {
  chrome.storage.local.get(Key.windows, (windows_) => {
    const windows = windows_[Key.windows];

    for (const [_window, tabs] of windows.entries()) {
      const index = tabs.indexOf(removedTabId);
      if (index != -1) {
        tabs[index] = addedTabId;
        break;
      }
    }

    chrome.storage.local.set(windows_);
  });
});

// chrome.tabs.onUpdated.addListener((tab) => console.log('Updated', tab));

// windows

chrome.windows.onCreated.addListener((win) =>
  chrome.storage.local.get(Key.windows, (windows_) => {
    const windows = windows_[Key.windows];

    windows[win.id] = [];

    chrome.storage.local.set(windows_);
  })
);

chrome.windows.onRemoved.addListener((winId) =>
  chrome.storage.local.get(Key.windows, (windows_) => {
    const windows = windows_[Key.windows];

    windows.delete(winId);

    chrome.storage.local.set(windows_);
  })
);
