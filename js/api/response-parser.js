"use strict";

(function () {
  const SEGMENT_TYPES = new Set(["response", "word", "phrase", "sentence", "corrected", "natural", "example"]);
  const LEARNING_ITEM_TYPES = new Set(["word", "phrase", "sentence"]);
  const USER_STATES = new Set(["OK", "INPUT_UNCLEAR", "RUNTIME_AMBIGUOUS", "TECHNICAL_FAILURE"]);
  const MODE_HINTS = new Set(["teaching_possible"]);

  function validMode(mode) { return mode === "conversation" || mode === "teaching"; }
  function normalizeSpeechSegments(segments) {
    if (!Array.isArray(segments)) return [];
    return segments.filter((segment) => segment && typeof segment === "object" && SEGMENT_TYPES.has(segment.type) && typeof segment.text === "string" && segment.text.trim())
      .map((segment) => ({ type: segment.type, text: segment.text.trim() }));
  }
  function normalizeLearningItems(items, mode) {
    if (mode !== "teaching" || !Array.isArray(items)) return [];
    return items.filter((item) => item && typeof item === "object" && LEARNING_ITEM_TYPES.has(item.type) && typeof item.text === "string" && item.text.trim())
      .slice(0, 8)
      .map((item) => ({
        type: item.type,
        text: item.text.trim(),
        translation: typeof item.translation === "string" ? item.translation.trim() : "",
        explanation: typeof item.explanation === "string" ? item.explanation.trim() : ""
      }));
  }
  function normalizeUserState(value) { return USER_STATES.has(value) ? value : "OK"; }
  function normalizeModeHint(value) { return MODE_HINTS.has(value) ? value : null; }

  function parseGatewayResponse(gatewayResponse, expectedMode) {
    if (!gatewayResponse || typeof gatewayResponse !== "object" || !validMode(expectedMode)) throw new Error("Gateway response could not be normalized.");
    const structuredResponse = gatewayResponse.structuredResponse;
    if (structuredResponse && typeof structuredResponse === "object" && structuredResponse.mode === expectedMode && typeof structuredResponse.displayContent === "string" && structuredResponse.displayContent.trim()) {
      return {
        mode: expectedMode,
        displayContent: structuredResponse.displayContent,
        speechSegments: normalizeSpeechSegments(structuredResponse.speechSegments),
        learningItems: normalizeLearningItems(structuredResponse.learningItems, expectedMode),
        userState: normalizeUserState(structuredResponse.userState),
        modeHint: normalizeModeHint(structuredResponse.modeHint)
      };
    }
    if (typeof gatewayResponse.content === "string" && gatewayResponse.content.trim()) {
      return {
        mode: expectedMode,
        displayContent: gatewayResponse.content,
        speechSegments: [],
        learningItems: [],
        userState: normalizeUserState(gatewayResponse.userState),
        modeHint: normalizeModeHint(gatewayResponse.modeHint)
      };
    }
    throw new Error("Gateway returned no display content.");
  }
  window.BCLResponseParser = { parseGatewayResponse };
})();
