"use strict";

(function () {
  const RUNTIMES = Object.freeze({
    CONVERSATION: "conversation",
    TEACHING: "teaching"
  });

  function normalizeTeachingTrigger(input) {
    const value = typeof input === "string" ? input : "";

    const latinMatch = value.match(/^[tT](?=$|\s|[,，:：;；.!！？?])(?:\s|[,，:：;；.!！？?])*/);

    if (latinMatch) {
      return {
        triggered: true,
        trigger: value.charAt(0),
        content: value.slice(latinMatch[0].length).trim()
      };
    }

    const chineseMatch = value.match(/^(?:請教|请教)(?:\s|[,，:：;；.!！？?])*/);

    if (chineseMatch) {
      return {
        triggered: true,
        trigger: chineseMatch[0].replace(/[\s,，:：;；.!！？?]+$/g, ""),
        content: value.slice(chineseMatch[0].length).trim()
      };
    }

    return {
      triggered: false,
      trigger: null,
      content: value
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
