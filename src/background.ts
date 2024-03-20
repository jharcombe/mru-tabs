'use strict';

const windows: Map<number, number[]> = new Map<number, number[]>();

chrome.tabs.query({}, (tabs) => {
  tabs.forEach((tab) => {
    const tabs = windows.get(tab.windowId) ?? [];
    tabs.push(tab.id);

    // setting in case of entry not existing previously
    windows.set(tab.windowId, tabs);
  });
});

// shortcuts

chrome.commands.onCommand.addListener((command, tab) => {
  const tabs = windows.get(tab.windowId);

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

  if (nextTab !== undefined) {
    chrome.tabs.update(nextTab, { active: true });
  }
});

// tabs

chrome.tabs.onCreated.addListener((tab) =>
  windows.get(tab.windowId).push(tab.id)
);

chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  const tabs = windows.get(removeInfo.windowId);
  tabs.splice(tabs.indexOf(tabId), 1);
});

chrome.tabs.onActivated.addListener((tab) => {
  const tabs = windows.get(tab.windowId);
  tabs.splice(tabs.indexOf(tab.tabId), 1);
  tabs.unshift(tab.tabId);
});

chrome.tabs.onAttached.addListener((tabId, attachInfo) =>
  windows.get(attachInfo.newWindowId).push(tabId)
);

chrome.tabs.onDetached.addListener((tabId, detachInfo) => {
  const tabs = windows.get(detachInfo.oldWindowId);
  tabs.splice(tabs.indexOf(tabId), 1);
});

// chrome.tabs.onMoved.addListener((tab) => console.log('Changed order', tab));

chrome.tabs.onReplaced.addListener((addedTabId, removedTabId) => {
  for (const [_window, tabs] of windows.entries()) {
    const index = tabs.indexOf(removedTabId);
    if (index != -1) {
      tabs[index] = addedTabId;
      console.log('Replaced');
      return;
    }
  }
});

// chrome.tabs.onUpdated.addListener((tab) => console.log('Updated', tab));

// windows

chrome.windows.onCreated.addListener((win) => windows.set(win.id, []));

chrome.windows.onRemoved.addListener((winId) => windows.delete(winId));

// chrome.windows.onFocusChanged.addListener((win) =>
//   console.log('Focusing window', win)
// );
