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

const clearHistoryItem = async (item) => {
  try {
    let { hostname, pathname, search } = new URL(item.url);
    // NOTE: ignore root URL
    if (pathname === "/" && search === "") {
      return;
    }
    const target = hostname.replace(/^www\./, "");
    if (!activeDomains.includes(target)) {
      return;
    }
    console.log("clearing %s", item.url);
    await chrome.history.deleteUrl({ url: item.url });
  } catch (error) {
    // NOTE: ignore invalid URLs
  }
};

const clearCurrentHistory = async () => {
  chrome.history.search(
    {
      text: "",
      startTime: Date.now() - 14 * MILLIS_PER_DAY,
      maxResults: 5000,
    },
    async (items) => {
      await Promise.all(items.map(clearHistoryItem));
    },
  );
};

const bootstrap = async () => {
  await chrome.alarms.create("keepAlive", { periodInMinutes: 0.5 });
  await loadActiveDomains();
  await clearCurrentHistory();
};

// Event Listeners

chrome.history.onVisited.addListener(clearHistoryItem);

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "sync" && changes.domains) {
    activeDomains = changes.domains.newValue ?? [...DEFAULT_DOMAINS];
    console.log("Active domains updated:", activeDomains);
  }
});

// NOTE: chrome needs a handler here to not pause the worker
chrome.alarms.onAlarm.addListener(() => {});

chrome.runtime.onInstalled.addListener(bootstrap);

chrome.runtime.onStartup.addListener(bootstrap);
