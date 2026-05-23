// https://developer.chrome.com/docs/extensions/reference/api/history
"use strict";

const MILLIS_PER_DAY = 1000 * 60 * 60 * 24;
const DEFAULT_DOMAINS = ["google.com"];

let activeDomains = [...DEFAULT_DOMAINS];

const loadActiveDomains = async () => {
  try {
    const result = await chrome.storage.sync.get("domains");
    if (result.domains) {
      activeDomains = result.domains;
    }
  } catch (error) {
    console.error("Failed to load active domains from storage:", error);
  }
};

const clearHistoryItem = (domains) => async (item) => {
  const urlDomain = item.url.match(/\w+\.\w+(?=[:\/]|$)/i)?.[0];
  if (!domains.includes(urlDomain)) {
    return;
  }
  console.log("clearing %s", item.url);
  await chrome.history.deleteUrl({ url: item.url });
};

const clearCurrentHistory = async () => {
  for (const domain of activeDomains) {
    chrome.history.search(
      {
        text: "",
        startTime: Date.now() - 14 * MILLIS_PER_DAY,
        maxResults: 5000,
      },
      async (items) => {
        await Promise.all(items.map(clearHistoryItem([domain])));
      },
    );
  }
};

// Event Listeners

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "sync" && changes.domains) {
    activeDomains = changes.domains.newValue ?? [...DEFAULT_DOMAINS];
    console.log("Service worker active domains updated:", activeDomains);
  }
});

chrome.history.onVisited.addListener(async (item) => {
  await clearHistoryItem(activeDomains)(item);
});

chrome.runtime.onInstalled.addListener(async () => {
  await loadActiveDomains();
  await clearCurrentHistory();
});

chrome.runtime.onStartup.addListener(async () => {
  await loadActiveDomains();
  await clearCurrentHistory();
});
