// https://developer.chrome.com/docs/extensions/reference/api/history
"use strict";

const MILLIS_PER_DAY = 1000 * 60 * 60 * 24;
const DEFAULT_DOMAINS = ["google.com"];
const FALLBACK_DOMAINS = [];

let activeDomainsPromise = Promise.resolve(FALLBACK_DOMAINS);

const getActiveDomains = async () => {
  try {
    const { domains } = await chrome.storage.sync.get({
      domains: DEFAULT_DOMAINS,
    });
    return domains;
  } catch (error) {
    console.error("Failed to get active domains from storage:", error);
    return FALLBACK_DOMAINS;
  }
};

const matchesDomain = (hostname, pattern) => {
  if (pattern.startsWith("*.")) {
    return hostname.endsWith("." + pattern.slice(2));
  }
  return hostname.replace(/^www\./, "") === pattern;
};

const clearHistoryItem = async (item) => {
  try {
    let { hostname, pathname, search } = new URL(item.url);
    const [basedomain] = /\w+\.\w+$/gi.exec(hostname) ?? [];
    // NOTE: ignore root URL
    if (
      pathname === "/" &&
      search === "" &&
      basedomain === hostname.replace(/^www\./, "")
    ) {
      return;
    }
    const activeDomains = await activeDomainsPromise;
    if (!activeDomains.some((pattern) => matchesDomain(hostname, pattern))) {
      return;
    }
    console.log("clearing %s", item.url);
    await chrome.history.deleteUrl({ url: item.url });
  } catch (error) {
    // NOTE: ignore invalid URLs
  }
};

const clearCurrentHistory = () =>
  new Promise((resolve) => {
    chrome.history.search(
      {
        text: "",
        startTime: Date.now() - 14 * MILLIS_PER_DAY,
        maxResults: 5000,
      },
      async (items) => {
        await Promise.all(items.map(clearHistoryItem));
        resolve();
      },
    );
  });

// NOTE: worker can be suspended and woken up arbitrarily, and there is no general wake up hook so we always bootstrap
(async () => {
  activeDomainsPromise = getActiveDomains();
  await clearCurrentHistory();
})();

// Event Listeners

chrome.history.onVisited.addListener(clearHistoryItem);

chrome.storage.onChanged.addListener(async (changes, areaName) => {
  if (areaName === "sync" && changes.domains?.newValue) {
    activeDomainsPromise = Promise.resolve(changes.domains.newValue);
    console.log("Active domains updated:", changes.domains.newValue);
    await clearCurrentHistory();
  }
});

chrome.action.onClicked.addListener(async () => {
  await chrome.runtime.openOptionsPage();
});
