"use strict";

(function () {
  const RUNTIMES = Object.freeze({
    CONVERSATION: "conversation",
    TEACHING: "teaching"
  });

  function normalizeTeachingTrigger(input) {
    const match = input.match(/^[tT](?:\s+|$)/);

    if (!match) {
      return {
        triggered: false,
        trigger: null,
        content: input
      };
    }

    return {
      triggered: true,
      trigger: input.charAt(0),
      content: input.slice(match[0].length).trim()
    };
  }

  function dispatchRuntime(state) {
    const normalized = normalizeTeachingTrigger(state.normalizedInput);

    if (normalized.triggered) {
      return {
        ...state,
        normalizedInput: normalized.content,
        runtime: RUNTIMES.TEACHING,
        trigger: normalized.trigger,
        phase: "runtime-selected"
      };
    }

    return {
      ...state,
      runtime: RUNTIMES.CONVERSATION,
      trigger: null,
      phase: "runtime-selected"
    };
  }

  window.BCLDispatcher = {
    RUNTIMES,
    dispatchRuntime
  };
})();
