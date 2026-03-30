"use strict";

const FILTER_URL_PREFIXES = ["https://www.google.", "https://www.youtube."];
const MILLIS_PER_DAY = 1000 * 60 * 60 * 24;

const clearHistoryItem = (prefixes) => async (item) => {
  if (!prefixes.some(prefix => item.url.startsWith(prefix))) {
    return;
  }
  console.log("clearing %s", item.url);
  await chrome.history.deleteUrl({ url: item.url });
};

const clearHistoryItems = (prefixes) => async (items) => {
  await Promise.all(items.map(clearHistoryItem(prefixes)));
};

const clearCurrentHistory = async () => {
  for (const prefix of FILTER_URL_PREFIXES) {
    chrome.history.search(
      {
        text: prefix,
        startTime: Date.now() - 30 * MILLIS_PER_DAY,
        maxResults: 5000,
      },
      clearHistoryItems([prefix]),
    );
  }
};

chrome.history.onVisited.addListener(clearHistoryItem(FILTER_URL_PREFIXES));
chrome.runtime.onInstalled.addListener(clearCurrentHistory);
chrome.runtime.onStartup.addListener(clearCurrentHistory);
