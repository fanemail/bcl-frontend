"use strict";

(function () {
  let referenceMemory = createEmptyMemory();

  function createEmptyMemory() {
    return {
      recentTurns: [],
      currentFocus: "",
      relevantPriorExpressions: [],
      modeSwitchContext: ""
    };
  }

  function cloneMemory(memory) {
    return {
      recentTurns: [...memory.recentTurns],
      currentFocus: memory.currentFocus,
      relevantPriorExpressions: [
        ...memory.relevantPriorExpressions
      ],
      modeSwitchContext: memory.modeSwitchContext
    };
  }

  function getReferenceMemory() {
    return cloneMemory(referenceMemory);
  }

  function setReferenceMemory({
    recentTurns = [],
    currentFocus = "",
    relevantPriorExpressions = [],
    modeSwitchContext = ""
  }) {
    if (!Array.isArray(recentTurns)) {
      throw new Error(
        "Reference Memory recentTurns must be an array."
      );
    }

    if (!Array.isArray(relevantPriorExpressions)) {
      throw new Error(
        "Reference Memory relevantPriorExpressions must be an array."
      );
    }

    referenceMemory = {
      recentTurns: [...recentTurns],
      currentFocus: String(currentFocus),
      relevantPriorExpressions: [
        ...relevantPriorExpressions
      ],
      modeSwitchContext: String(modeSwitchContext)
    };

    return getReferenceMemory();
  }

  function updateReferenceMemory(patch) {
    return setReferenceMemory({
      ...referenceMemory,
      ...patch
    });
  }

  function clearReferenceMemory() {
    referenceMemory = createEmptyMemory();
  }

  function buildSelectedContext() {
    const memory = getReferenceMemory();
    const sections = [];

    if (memory.recentTurns.length > 0) {
      sections.push(
        "Recent Turns:\n" +
        memory.recentTurns.join("\n")
      );
    }

    if (memory.currentFocus.trim() !== "") {
      sections.push(
        "Current Focus:\n" +
        memory.currentFocus
      );
    }

    if (
      memory.relevantPriorExpressions.length > 0
    ) {
      sections.push(
        "Relevant Prior Expressions:\n" +
        memory.relevantPriorExpressions.join("\n")
      );
    }

    if (memory.modeSwitchContext.trim() !== "") {
      sections.push(
        "Mode-Switch Context:\n" +
        memory.modeSwitchContext
      );
    }

    return sections.join("\n\n");
  }

  window.BCLReferenceMemory = {
    getReferenceMemory,
    setReferenceMemory,
    updateReferenceMemory,
    clearReferenceMemory,
    buildSelectedContext
  };
})();

