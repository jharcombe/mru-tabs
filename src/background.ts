'use strict';

import { startHeartbeat } from './heartbeat';

enum Key {
  windows = 'mru-tabs_windows',
}

let windows: any = {};

let done_setup = false;
async function setup() {
  if (done_setup) return;
  done_setup = true;

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
  setup();
});
chrome.runtime.onInstalled.addListener(() => {
  setup();
});

startHeartbeat();

// shortcuts

chrome.commands.onCommand.addListener(async (command, tab) => {
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

// tabs

chrome.tabs.onCreated.addListener((tab) => windows[tab.windowId].push(tab.id));

chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  const tabs = windows[removeInfo.windowId];
  tabs.splice(tabs.indexOf(tabId), 1);
});

chrome.tabs.onActivated.addListener((tab) => {
  const tabs = windows[tab.windowId];
  tabs.splice(tabs.indexOf(tab.tabId), 1);
  tabs.unshift(tab.tabId);
});

chrome.tabs.onAttached.addListener((tabId, attachInfo) =>
  windows[attachInfo.newWindowId].push(tabId)
);

chrome.tabs.onDetached.addListener((tabId, detachInfo) => {
  const tabs = windows[detachInfo.oldWindowId];
  tabs.splice(tabs.indexOf(tabId), 1);
});

chrome.tabs.onReplaced.addListener((addedTabId, removedTabId) => {
  for (const [_window, tabs] of windows.entries()) {
    const index = tabs.indexOf(removedTabId);
    if (index != -1) {
      tabs[index] = addedTabId;
      break;
    }
  }
});

// chrome.tabs.onUpdated.addListener((tab) => console.log('Updated', tab));

// windows

chrome.windows.onCreated.addListener((win) => (windows[win.id] = []));

chrome.windows.onRemoved.addListener((winId) => delete windows[winId]);
