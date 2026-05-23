"use strict";

const DEFAULT_DOMAINS = ["google.com"];

const domainsTextarea = document.getElementById("domains");
const saveButton = document.getElementById("save");
const resetButton = document.getElementById("reset");
const statusDiv = document.getElementById("status");

let statusTimeout;

const showStatus = (message, type = "success") => {
  clearTimeout(statusTimeout);
  statusDiv.textContent = message;
  statusDiv.className = `status-alert ${type}`;

  statusTimeout = setTimeout(() => {
    statusDiv.className = "status-alert hidden";
  }, 2000);
};

// Load settings from storage
const loadSettings = async () => {
  try {
    const result = await chrome.storage.sync.get("domains");
    const domains = result.domains || DEFAULT_DOMAINS;
    domainsTextarea.value = domains.join("\n");
  } catch (error) {
    console.error("Failed to load settings:", error);
    showStatus("Error loading settings", "error");
  }
};

// Save settings to storage
const saveSettings = async () => {
  const rawText = domainsTextarea.value || "";
  const domains = rawText
    .split("\n")
    .map((d) => d.trim().toLowerCase())
    .filter((d) => {
      // Basic domain validation: non-empty, contains at least one dot, doesn't contain spaces
      return d.length > 0 && d.includes(".") && !d.includes(" ");
    });

  try {
    await chrome.storage.sync.set({ domains });
    // Update textarea in case some entries were filtered out
    domainsTextarea.value = domains.join("\n");
    showStatus("Saved!");
  } catch (error) {
    console.error("Failed to save settings:", error);
    showStatus("Save failed", "error");
  }
};

// Reset settings to default
const resetSettings = async () => {
  if (confirm("Reset to default domains?")) {
    try {
      await chrome.storage.sync.set({ domains: DEFAULT_DOMAINS });
      domainsTextarea.value = DEFAULT_DOMAINS.join("\n");
      showStatus("Reset!");
    } catch (error) {
      console.error("Failed to reset settings:", error);
      showStatus("Reset failed", "error");
    }
  }
};

// Event Listeners
document.addEventListener("DOMContentLoaded", loadSettings);
saveButton.addEventListener("click", saveSettings);
resetButton.addEventListener("click", resetSettings);
