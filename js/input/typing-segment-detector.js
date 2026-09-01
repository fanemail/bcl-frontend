"use strict";

(function () {
  const TRIGGER_PUNCTUATION = new Set([
    "，", ",", "。", ".", "；", ";", "！", "!", "？", "?", "：", ":"
  ]);

  function simpleFingerprint(value) {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i += 1) {
      hash ^= value.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16);
  }

  function getPreviousBoundary(value, punctuationIndex) {
    for (let i = punctuationIndex - 1; i >= 0; i -= 1) {
      if (TRIGGER_PUNCTUATION.has(value[i])) {
        return i + 1;
      }
    }
    return 0;
  }

  function extractQuotedItems(text) {
    const items = [];
    const patterns = [/"([^"\n]+)"/g, /“([^”\n]+)”/g];
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const value = match[1].trim();
        if (value && !items.includes(value)) {
          items.push(value);
        }
      }
    }
    return items;
  }

  function detectCompletedSegment({ value, caretIndex, insertedText }) {
    if (typeof value !== "string" || typeof insertedText !== "string") {
      return null;
    }

    if (insertedText.length !== 1 || !TRIGGER_PUNCTUATION.has(insertedText)) {
      return null;
    }

    const end = Number.isInteger(caretIndex) ? caretIndex : value.length;
    const punctuationIndex = end - 1;

    if (
      punctuationIndex < 0 ||
      punctuationIndex >= value.length ||
      value[punctuationIndex] !== insertedText
    ) {
      return null;
    }

    const start = getPreviousBoundary(value, punctuationIndex);
    const rawText = value.slice(start, punctuationIndex).trim();

    if (!rawText) {
      return null;
    }

    const fingerprint = simpleFingerprint(rawText);

    return {
      start,
      end,
      text: rawText,
      punctuation: insertedText,
      forcedItems: extractQuotedItems(rawText),
      identity: start + ":" + end + ":" + fingerprint
    };
  }

  window.BCLTypingSegmentDetector = {
    TRIGGER_PUNCTUATION,
    detectCompletedSegment,
    extractQuotedItems
  };
})();
