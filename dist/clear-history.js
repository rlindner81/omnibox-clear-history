// https://developer.chrome.com/docs/extensions/reference/api/history
"use strict";

const MILLIS_PER_DAY = 1000 * 60 * 60 * 24;
const DEFAULT_DOMAINS = ["google.com"];

// NOTE: worker can be suspended and woken up arbitrarily, so we need to always get domains first

const getActiveDomains = async () => {
  try {
    const { domains } = await chrome.storage.sync.get({
      domains: DEFAULT_DOMAINS,
    });
    return domains;
  } catch (error) {
    console.error("Failed to get active domains from storage:", error);
    return DEFAULT_DOMAINS;
  }
};

let activeDomainsPromise = getActiveDomains();

const clearHistoryItem = async (item) => {
  try {
    let { hostname, pathname, search } = new URL(item.url);
    // NOTE: ignore root URL
    if (pathname === "/" && search === "") {
      return;
    }
    const target = hostname.replace(/^www\./, "");
    const activeDomains = await activeDomainsPromise;
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
  await clearCurrentHistory();
};

// Event Listeners

chrome.history.onVisited.addListener(clearHistoryItem);

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "sync" && changes.domains?.newValue) {
    activeDomainsPromise = Promise.resolve(changes.domains.newValue);
    console.log("Active domains updated:", changes.domains.newValue);
  }
});

chrome.action.onClicked.addListener(async () => {
  await chrome.runtime.openOptionsPage();
});

// NOTE: chrome needs a handler here to not pause the worker
chrome.alarms.onAlarm.addListener(() => {});

chrome.runtime.onInstalled.addListener(bootstrap);

chrome.runtime.onStartup.addListener(bootstrap);
