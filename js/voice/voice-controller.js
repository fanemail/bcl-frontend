"use strict";

(function () {
  const AI_TYPES = new Set([
    "response",
    "phrase",
    "sentence",
    "corrected",
    "natural",
    "example"
  ]);

  function normalizeMode(mode) {
    if (typeof mode !== "string") {
      return "";
    }

    return mode.trim().toLowerCase();
  }

  function normalizeTargetLanguage(targetLanguage) {
    return typeof targetLanguage === "string"
      ? targetLanguage.trim().toLowerCase()
      : "";
  }

  function createVoicePlan({
    mode,
    targetLanguage,
    speechSegments
  }) {
    const normalizedMode = normalizeMode(mode);
    const normalizedTargetLanguage =
      normalizeTargetLanguage(targetLanguage);

    if (
      normalizedMode !== "conversation" &&
      normalizedMode !== "teaching"
    ) {
      return [];
    }

    if (!Array.isArray(speechSegments)) {
      return [];
    }

    const items = [];

    for (let index = 0; index < speechSegments.length; index += 1) {
      const segment = speechSegments[index];

      if (
        !segment ||
        typeof segment !== "object" ||
        typeof segment.type !== "string" ||
        typeof segment.text !== "string" ||
        segment.text.trim() === ""
      ) {
        continue;
      }

      const type = segment.type.trim().toLowerCase();
      const text = segment.text.trim();

      if (normalizedMode === "conversation") {
        if (type !== "response") {
          continue;
        }

        items.push({
          id: "speech-" + index,
          type,
          text,
          targetLanguage: normalizedTargetLanguage,
          renderer: "ai",
          playbackUnit: "response"
        });

        break;
      }

      if (type === "word") {
        items.push({
          id: "speech-" + index,
          type,
          text,
          targetLanguage: normalizedTargetLanguage,
          renderer: "local",
          playbackUnit: "item"
        });

        continue;
      }

      if (AI_TYPES.has(type) && type !== "response") {
        items.push({
          id: "speech-" + index,
          type,
          text,
          targetLanguage: normalizedTargetLanguage,
          renderer: "ai",
          playbackUnit: "item"
        });
      }
    }

    return items;
  }

  function createInitialPlaybackState() {
    return {
      status: "idle",
      activeItemId: null,
      speed: 1,
      requestVersion: 0,
      error: null
    };
  }

  window.BCLVoiceController = {
    createVoicePlan,
    createInitialPlaybackState
  };
})();
