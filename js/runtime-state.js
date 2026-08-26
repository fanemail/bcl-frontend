"use strict";

window.BCLRuntimeState = {
  createRuntimeState(rawInput) {
    return {
      rawInput,
      normalizedInput: rawInput.trim(),
      runtime: null,
      trigger: null,
      phase: "input-received"
    };
  }
};
