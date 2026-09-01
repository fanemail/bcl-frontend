"use strict";

(function () {
  const STORAGE_KEY = "bcl.learningHistory";
  const VERSION = 1;
  const MAX_ENTRIES = 300;

  function readStore() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { version: VERSION, entries: [] };
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.version !== VERSION || !Array.isArray(parsed.entries)) {
        return { version: VERSION, entries: [] };
      }
      return { version: VERSION, entries: parsed.entries };
    } catch (error) {
      console.warn("Learning History could not be read.", error);
      return { version: VERSION, entries: [] };
    }
  }

  function writeStore(store) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
      return true;
    } catch (error) {
      console.warn("Learning History could not be saved.", error);
      return false;
    }
  }

  function createId() {
    return "lh-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 9);
  }

  function addEntry(entry) {
    if (!entry || typeof entry !== "object") return null;
    const record = {
      id: createId(),
      createdAt: new Date().toISOString(),
      sourceLanguage: entry.sourceLanguage || "",
      targetLanguage: entry.targetLanguage || "",
      levelSystem: entry.levelSystem || "",
      level: entry.level || "",
      teachingInput: entry.teachingInput || "",
      sourceContext: entry.sourceContext || "",
      displayContent: entry.displayContent || "",
      learningItems: Array.isArray(entry.learningItems) ? entry.learningItems : []
    };
    const store = readStore();
    store.entries.unshift(record);
    store.entries = store.entries.slice(0, MAX_ENTRIES);
    writeStore(store);
    return record;
  }

  function getEntries() {
    return readStore().entries.slice();
  }

  function getEntry(id) {
    return getEntries().find((entry) => entry.id === id) || null;
  }

  window.BCLLearningHistory = {
    addEntry,
    getEntries,
    getEntry,
    STORAGE_KEY,
    VERSION,
    MAX_ENTRIES
  };
})();
