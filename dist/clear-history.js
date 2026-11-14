// https://developer.chrome.com/docs/extensions/reference/api/history
"use strict";

const FULL_SWEEP_DAYS = 365;
const QUICK_SWEEP_DAYS = 1;
const HISTORY_CHUNK_SIZE = 1000;
const MILLIS_PER_DAY = 1000 * 60 * 60 * 24;
const DEFAULT_DOMAINS = ["google.com"];
const FALLBACK_DOMAINS = [];
const CHAIN = Symbol("chain");

let activeDomainsPromise = Promise.resolve(FALLBACK_DOMAINS);

const makeExclusiveQueueing = (cb) => {
  const queueingCb = async (...args) => {
    const chain = queueingCb[CHAIN] ?? Promise.resolve();
    const currentPromise = chain.then(() => cb(...args));
    queueingCb[CHAIN] = currentPromise.catch(() => {});
    return await currentPromise;
  };
  return queueingCb;
};

// NOTE: optional "*." prefix is kept, so this works for hostnames and patterns
const stripWww = (value) => value.replace(/^(\*\.)?www\./, "$1");

const getActiveDomains = async () => {
  try {
    const { domains } = await chrome.storage.sync.get({
      domains: DEFAULT_DOMAINS,
    });
    return domains.map(stripWww);
  } catch (error) {
    console.error("Failed to get active domains from storage:", error);
    return FALLBACK_DOMAINS;
  }
};

const matchesDomain = (pattern, normalizedHostname) => {
  if (pattern.startsWith("*.")) {
    const patternHostname = pattern.slice(2);
    return (
      normalizedHostname === patternHostname ||
      normalizedHostname.endsWith(`.${patternHostname}`)
    );
  }
  return normalizedHostname === pattern;
};

const clearHistoryItem = async (item) => {
  try {
    const { hostname, pathname, search } = new URL(item.url);
    // NOTE: always keep history entries for root URLs
    if (pathname === "/" && search === "") {
      return;
    }
    const normalizedHostname = stripWww(hostname);
    const activeDomains = await activeDomainsPromise;
    if (
      !activeDomains.some((pattern) =>
        matchesDomain(pattern, normalizedHostname),
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

    let hasNew = false;
    for (const item of items) {
      hasNew ||= !(item.id in result);
      result[item.id] = item;
    }
    if (items.length < HISTORY_CHUNK_SIZE || !hasNew) {
      break;
    }
    // NOTE: endTime is exclusive, overlap by 1ms so entries sharing the boundary timestamp are not skipped
    endTime = items[items.length - 1].lastVisitTime + 1;
  }
  return Object.values(result);
};

const clearCurrentHistory = makeExclusiveQueueing(async (days) => {
  const items = await collectHistory(Date.now() - days * MILLIS_PER_DAY);
  // we could process some fixed chunk in parallel here
  for (const item of items) {
    await clearHistoryItem(item);
  }
});

// NOTE: worker can be suspended and woken up arbitrarily, and there is no general wake up hook so we always bootstrap
(async () => {
  activeDomainsPromise = getActiveDomains();
  await clearCurrentHistory(QUICK_SWEEP_DAYS);
})();

// Event Listeners

chrome.runtime.onInstalled.addListener(
  async () => await clearCurrentHistory(FULL_SWEEP_DAYS),
);

chrome.runtime.onStartup.addListener(
  async () => await clearCurrentHistory(FULL_SWEEP_DAYS),
);

chrome.history.onVisited.addListener(clearHistoryItem);

chrome.storage.onChanged.addListener(async (changes, areaName) => {
  // NOTE: on key removal, domains is in changes and newValue is undefined, getActiveDomains falls back to defaults
  if (areaName === "sync" && "domains" in changes) {
    activeDomainsPromise = getActiveDomains();
    console.log("Active domains updated:", changes.domains.newValue ?? "using defaults");
    await clearCurrentHistory(FULL_SWEEP_DAYS);
  }
});

chrome.action.onClicked.addListener(async () => {
  await chrome.runtime.openOptionsPage();
});
