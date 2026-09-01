"use strict";

(function () {
  let initialized = false;
  let dismissed = false;

  function initialize() {
    if (initialized) return;

    const sample = document.getElementById("startupSample");
    const list = document.getElementById("messageList");
    const input = document.getElementById("messageInput");

    if (!sample || !list || !input) return;

    function hasRuntimeMessages() {
      return Boolean(list.querySelector(".message"));
    }

    function hideSample() {
      dismissed = true;
      sample.hidden = true;
    }

    function syncSample() {
      if (dismissed || hasRuntimeMessages()) {
        sample.hidden = true;
        return;
      }

      sample.hidden = false;
    }

    /* Any real runtime message permanently dismisses the startup sample
       for this page session. */
    new MutationObserver(() => {
      if (hasRuntimeMessages()) {
        hideSample();
      }
    }).observe(list, { childList: true });

    /* Hide as soon as the user starts composing, not after Send.
       beforeinput gives immediate feedback; input/compositionstart are
       fallbacks for IME/programmatic editing behavior. */
    input.addEventListener("beforeinput", (event) => {
      if (
        typeof event.inputType === "string" &&
        event.inputType.startsWith("insert")
      ) {
        hideSample();
      }
    });

    input.addEventListener("compositionstart", hideSample);

    input.addEventListener("input", () => {
      if (input.value.length > 0) {
        hideSample();
      }
    });

    const send = document.getElementById("sendButton");
    if (send) {
      send.addEventListener("click", () => {
        if (input.value.trim()) {
          hideSample();
        }
      });
    }

    input.addEventListener("keydown", (event) => {
      if (
        event.key === "Enter" &&
        !event.shiftKey &&
        input.value.trim()
      ) {
        hideSample();
      }
    });

    syncSample();
    initialized = true;
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initialize,
      { once: true }
    );
  } else {
    initialize();
  }

  window.BCLStartupSample = {
    initialize
  };
})();
