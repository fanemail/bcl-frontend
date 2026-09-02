"use strict";

(function () {
  let initialized = false;

  const refinementCss = `
    /* Phase 8 UI Refinement Round 2.2 — true edge-reveal chrome */

    .message-list {
      padding-top: 0.55rem;
      padding-bottom: 2.8rem;
    }

    .message {
      margin-bottom: 0.85rem;
    }

    .input-box {
      padding: 0.22rem 0.3rem;
      gap: 0.35rem;
    }

    #messageInput {
      padding: 0.2rem 0.32rem;
      line-height: 1.38;
    }

    .app-header,
    .header-actions,
    .message-meta,
    .voice-region,
    .playback-controls,
    .scroll-latest-button,
    .input-region,
    .input-actions,
    .typing-translation-hint,
    .voice-input-notice,
    .recording-state {
      -webkit-user-select: none;
      user-select: none;
    }

    .message-body,
    .message-body *,
    .speech-item-text,
    pre,
    code {
      -webkit-user-select: text;
      user-select: text;
    }

    .message-body button,
    .message-body select,
    .message-body .voice-region,
    .message-body .voice-region * {
      -webkit-user-select: none;
      user-select: none;
    }

    @media (hover: hover) and (pointer: fine) and (min-width: 601px) {
      .input-region {
        min-height: 2.35rem;
        max-height: 2.35rem;
        padding: 0.12rem 0.65rem 0;
        overflow: hidden;
        cursor: text;
        transition:
          min-height 160ms ease,
          max-height 160ms ease,
          padding 160ms ease,
          box-shadow 160ms ease;
      }

      .input-region > * {
        opacity: 0.72;
        transform: translateY(0.05rem);
        transition:
          opacity 110ms ease,
          transform 160ms ease;
      }

      .input-region:hover,
      .input-region:focus-within,
      .input-region.is-recording {
        min-height: 4.75rem;
        max-height: 12rem;
        padding: 0.32rem 0.65rem 0.36rem;
        box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.04);
      }

      .input-region:hover > *,
      .input-region:focus-within > *,
      .input-region.is-recording > * {
        opacity: 1;
        transform: none;
      }

      .input-region:hover #messageInput,
      .input-region:focus-within #messageInput,
      .input-region.is-recording #messageInput {
        min-height: 4.15rem;
        max-height: 9rem;
      }
    }

    @media (max-width: 600px), (hover: none), (pointer: coarse) {
      .app-header {
        padding-top: 0.5rem;
        padding-bottom: 0.5rem;
      }

      .message-list {
        padding-top: 0.55rem;
        padding-bottom: 2.8rem;
      }

      .input-region {
        padding: 0.38rem 0.5rem 0.45rem;
      }

      .input-box {
        padding: 0.24rem;
      }
    }
  `;

  function installRefinementStyles() {
    if (document.getElementById("bcl-ui-refinement-r2")) return;

    const style = document.createElement("style");
    style.id = "bcl-ui-refinement-r2";
    style.textContent = refinementCss;
    document.head.appendChild(style);
  }

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

  function isPrimaryRuntimeResponse(element) {
    if (!(element instanceof HTMLElement)) return false;
    if (!element.matches("article.message-ai")) return false;

    const mode = element.querySelector(".mode-label")?.textContent?.trim();

    return (
      mode === "Conversation Runtime" ||
      mode === "Teaching Runtime"
    );
  }

  function positionResponseAtReadingStart(messageList, responseElement) {
    window.requestAnimationFrame(() => {
      const listRect = messageList.getBoundingClientRect();
      const responseRect = responseElement.getBoundingClientRect();
      const targetTop =
        messageList.scrollTop +
        responseRect.top -
        listRect.top -
        8;

      messageList.scrollTo({
        top: Math.max(0, targetTop),
        behavior: "smooth"
      });
    });
  }

  function initializeAutoHideChrome(textarea) {
    const inputRegion = textarea?.closest(".input-region");
    const recordingState = document.getElementById("recordingState");
    const sendButton = document.getElementById("sendButton");

    if (!inputRegion || !textarea) return;

    function recordingIsActive() {
      return Boolean(recordingState && !recordingState.hidden);
    }

    function collapseAfterSubmit() {
      window.setTimeout(() => {
        if (recordingIsActive()) return;
        textarea.blur();
      }, 0);
    }

    if (sendButton) {
      sendButton.addEventListener("click", collapseAfterSubmit);
    }

    textarea.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        collapseAfterSubmit();
      }
    });

    if (recordingState) {
      const syncRecordingState = () => {
        inputRegion.classList.toggle("is-recording", recordingIsActive());
      };

      new MutationObserver(syncRecordingState).observe(
        recordingState,
        { attributes: true, attributeFilter: ["hidden"] }
      );

      syncRecordingState();
    }
  }

  function initializeResponsePositioning() {
    const messageList = document.getElementById("messageList");
    if (!messageList || messageList.dataset.responsePositioning === "ready") {
      return;
    }

    const observer = new MutationObserver((mutations) => {
      let newestPrimaryResponse = null;

      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (isPrimaryRuntimeResponse(node)) {
            newestPrimaryResponse = node;
          }
        }
      }

      if (newestPrimaryResponse) {
        positionResponseAtReadingStart(
          messageList,
          newestPrimaryResponse
        );
      }
    });

    observer.observe(messageList, { childList: true });
    messageList.dataset.responsePositioning = "ready";
  }

  function initialize() {
    if (initialized) return;

    installRefinementStyles();

    const textarea = document.getElementById("messageInput");
    if (!textarea) return;

    initializeAutoHideChrome(textarea);

    const resize = () => {
      window.requestAnimationFrame(() => resizeComposer(textarea));
    };

    textarea.addEventListener("input", resize);
    textarea.addEventListener("change", resize);
    textarea.addEventListener("compositionend", resize);

    document.addEventListener("bcl:voice-transcript-updated", resize);
    window.addEventListener("resize", resize);

    initializeResponsePositioning();
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
