"use strict";

(function () {
  const SEGMENT_TYPES = new Set([
    "response",
    "word",
    "phrase",
    "sentence",
    "corrected",
    "natural",
    "example"
  ]);

  const USER_STATES = new Set([
    "OK",
    "INPUT_UNCLEAR",
    "RUNTIME_AMBIGUOUS",
    "TECHNICAL_FAILURE"
  ]);

  const MODE_HINTS = new Set([
    "teaching_possible"
  ]);

  function validMode(mode) {
    return (
      mode === "conversation" ||
      mode === "teaching"
    );
  }

  function normalizeSpeechSegments(segments) {
    if (!Array.isArray(segments)) {
      return [];
    }

    return segments
      .filter((segment) => (
        segment &&
        typeof segment === "object" &&
        SEGMENT_TYPES.has(segment.type) &&
        typeof segment.text === "string" &&
        segment.text.trim().length > 0
      ))
      .map((segment) => ({
        type: segment.type,
        text: segment.text.trim()
      }));
  }

  function normalizeUserState(value) {
    return USER_STATES.has(value)
      ? value
      : "OK";
  }

  function normalizeModeHint(value) {
    return MODE_HINTS.has(value)
      ? value
      : null;
  }

  function parseGatewayResponse(gatewayResponse, expectedMode) {
    if (
      !gatewayResponse ||
      typeof gatewayResponse !== "object" ||
      !validMode(expectedMode)
    ) {
      throw new Error("Gateway response could not be normalized.");
    }

    const structuredResponse = gatewayResponse.structuredResponse;

    if (
      structuredResponse &&
      typeof structuredResponse === "object" &&
      structuredResponse.mode === expectedMode &&
      typeof structuredResponse.displayContent === "string" &&
      structuredResponse.displayContent.trim().length > 0
    ) {
      return {
        mode: expectedMode,
        displayContent: structuredResponse.displayContent,
        speechSegments: normalizeSpeechSegments(
          structuredResponse.speechSegments
        ),
        userState: normalizeUserState(
          structuredResponse.userState
        ),
        modeHint: normalizeModeHint(
          structuredResponse.modeHint
        )
      };
    }

    if (
      typeof gatewayResponse.content === "string" &&
      gatewayResponse.content.trim().length > 0
    ) {
      return {
        mode: expectedMode,
        displayContent: gatewayResponse.content,
        speechSegments: [],
        userState: normalizeUserState(
          gatewayResponse.userState
        ),
        modeHint: normalizeModeHint(
          gatewayResponse.modeHint
        )
      };
    }

    throw new Error("Gateway returned no display content.");
  }

  window.BCLResponseParser = {
    parseGatewayResponse
  };
})();
