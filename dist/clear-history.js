"use strict";

const FILTER_URL_PREFIX = "https://www.google.";
const MILLIS_PER_DAY = 1000 * 60 * 60 * 24;

const clearHistoryItem = async (item) => {
  if (!item.url.startsWith(FILTER_URL_PREFIX)) {
    return;
  }
  console.log("clearing %s", item.url);
  await chrome.history.deleteUrl({ url: item.url });
};

const clearHistoryItems = async (items) => {
  await Promise.all(items.map(clearHistoryItem));
};

const clearCurrentHistory = async () => {
  chrome.history.search(
    {
      text: FILTER_URL_PREFIX,
      startTime: Date.now() - 30 * MILLIS_PER_DAY,
      maxResults: 5000,
    },
    clearHistoryItems,
  );
};

chrome.history.onVisited.addListener(clearHistoryItem);
chrome.runtime.onInstalled.addListener(clearCurrentHistory);
chrome.runtime.onStartup.addListener(clearCurrentHistory);
