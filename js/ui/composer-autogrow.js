"use strict";

(function () {
  let initialized = false;

  function resizeComposer(textarea) {
    if (!textarea) return;

    textarea.style.height = "auto";

    const computed = window.getComputedStyle(textarea);
    const maxHeight = Number.parseFloat(computed.maxHeight);
    const minHeight = Number.parseFloat(computed.minHeight);

    const desired = Math.max(
      Number.isFinite(minHeight) ? minHeight : 0,
      textarea.scrollHeight
    );

    const hasFiniteMax =
      Number.isFinite(maxHeight) && maxHeight > 0;

    const nextHeight = hasFiniteMax
      ? Math.min(desired, maxHeight)
      : desired;

    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY =
      hasFiniteMax && desired > maxHeight
        ? "auto"
        : "hidden";
  }

  function initialize() {
    if (initialized) return;

    const textarea = document.getElementById("messageInput");
    if (!textarea) return;

    const resize = () => {
      window.requestAnimationFrame(() => resizeComposer(textarea));
    };

    textarea.addEventListener("input", resize);
    textarea.addEventListener("change", resize);
    textarea.addEventListener("compositionend", resize);

    document.addEventListener("bcl:voice-transcript-updated", resize);
    window.addEventListener("resize", resize);

    resizeComposer(textarea);
    initialized = true;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }

  window.BCLComposerAutogrow = {
    initialize,
    resize: () => resizeComposer(
      document.getElementById("messageInput")
    )
  };
})();
