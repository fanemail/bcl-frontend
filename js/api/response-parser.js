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
        speechSegments: []
      };
    }

    throw new Error("Gateway returned no display content.");
  }

  window.BCLResponseParser = {
    parseGatewayResponse
  };
})();
