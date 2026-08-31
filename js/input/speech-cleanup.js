"use strict";

(function () {
  function cleanTranscript(value) {
    if (typeof value !== "string") {
      return "";
    }

    /*
      IS08 requires cleanup to preserve meaning.
      Foundation cleanup is therefore deliberately conservative:
      trim outer whitespace and collapse repeated whitespace only.
      No vocabulary, grammar, punctuation, or semantic rewriting occurs.
    */
    return value
      .trim()
      .replace(/\s+/g, " ");
  }

  window.BCLSpeechCleanup = {
    cleanTranscript
  };
})();
