"use strict";

const FILTER_URL_DOMAINS = [
  "google.com",
  "youtube.com",
  "markt.de",
];
const MILLIS_PER_DAY = 1000 * 60 * 60 * 24;

const clearHistoryItem = (domains) => async (item) => {
  if (!domains.some((domain) => item.url.contains(domain))) {
    return;
  }
  console.log("clearing %s", item.url);
  await chrome.history.deleteUrl({ url: item.url });
};

const clearHistoryItems = (prefixes) => async (items) => {
  await Promise.all(items.map(clearHistoryItem(prefixes)));
};

const clearCurrentHistory = async () => {
  for (const domain of FILTER_URL_DOMAINS) {
    chrome.history.search(
      {
        text: domain,
        startTime: Date.now() - 30 * MILLIS_PER_DAY,
        maxResults: 5000,
      },
      clearHistoryItems([domain]),
    );
  }
};

chrome.history.onVisited.addListener(clearHistoryItem(FILTER_URL_DOMAINS));
chrome.runtime.onInstalled.addListener(clearCurrentHistory);
chrome.runtime.onStartup.addListener(clearCurrentHistory);
