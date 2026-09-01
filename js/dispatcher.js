"use strict";

(function () {
  const RUNTIMES = Object.freeze({
    CONVERSATION: "conversation",
    TEACHING: "teaching"
  });

  function isLetterOrNumber(char) {
    return /[\p{L}\p{N}]/u.test(char);
  }

  function consumeLeadingSeparators(value, startIndex) {
    let index = startIndex;
    while (index < value.length && !isLetterOrNumber(value[index])) {
      index += 1;
    }
    return index;
  }

  function normalizeTeachingTrigger(input) {
    const value = typeof input === "string" ? input.trimStart() : "";

    if (value.startsWith("請教") || value.startsWith("请教")) {
      const trigger = value.slice(0, 2);
      const contentStart = consumeLeadingSeparators(value, 2);
      return {
        triggered: true,
        trigger,
        content: value.slice(contentStart).trim()
      };
    }

    if (value.length > 0 && (value[0] === "t" || value[0] === "T")) {
      if (value.length === 1) {
        return { triggered: true, trigger: value[0], content: "" };
      }

      if (!isLetterOrNumber(value[1])) {
        const contentStart = consumeLeadingSeparators(value, 1);
        return {
          triggered: true,
          trigger: value[0],
          content: value.slice(contentStart).trim()
        };
      }
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
      normalizedInput: normalized.content,
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
