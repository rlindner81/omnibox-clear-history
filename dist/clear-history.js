// https://developer.chrome.com/docs/extensions/reference/api/history
"use strict";

const CLEAR_HISTORY_DAYS = 14;
const HISTORY_CHUNK_SIZE = 1000;
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

const matchesDomain = (normalizedHostname, pattern) => {
  if (pattern.startsWith("*.")) {
    const patternBasedomain = pattern.slice(2);
    return (
      normalizedHostname === patternBasedomain ||
      normalizedHostname.endsWith(`.${patternBasedomain}`)
    );
  }
  return normalizedHostname === pattern;
};

const clearHistoryItem = async (item) => {
  try {
    let { hostname, pathname, search } = new URL(item.url);
    const [basedomain] = /\w+\.\w+$/gi.exec(hostname) ?? [];
    const normalizedHostname = hostname.replace(/^www\./, "");
    // NOTE: keep history entry only for basedomain
    if (
      pathname === "/" &&
      search === "" &&
      normalizedHostname === basedomain
    ) {
      return;
    }
    const activeDomains = await activeDomainsPromise;
    if (
      !activeDomains.some((pattern) =>
        matchesDomain(normalizedHostname, pattern),
      )
    ) {
      return;
    }
    console.log("clearing %s", item.url);
    await chrome.history.deleteUrl({ url: item.url });
  } catch (error) {
    // NOTE: ignore invalid URLs
  }
};

const collectHistory = async (startTime) => {
  const result = {};
  let endTime = Date.now();
  while (true) {
    const items = await chrome.history.search({
      text: "",
      startTime,
      endTime,
      maxResults: HISTORY_CHUNK_SIZE,
    });

    for (const item of items) {
      result[item.id] = item;
    }
    if (items.length < HISTORY_CHUNK_SIZE) {
      break;
    }
    endTime = items[items.length - 1].lastVisitTime;
  }
  return Object.values(result);
};

const clearCurrentHistory = async () => {
  const items = await collectHistory(
    Date.now() - CLEAR_HISTORY_DAYS * MILLIS_PER_DAY,
  );
  // we could process some fixed chunk in parallel here
  for (const item of items) {
    await clearHistoryItem(item);
  }
};

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
