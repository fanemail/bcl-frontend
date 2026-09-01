"use strict";

(function () {
  let initialized = false;
  let initializedApi = null;

  function initialize({
    input,
    hint,
    getProfile,
    isEnabled
  }) {
    if (initialized) {
      return initializedApi;
    }

    const { detectCompletedSegment, TRIGGER_PUNCTUATION } =
      window.BCLTypingSegmentDetector;
    const { requestTypingTranslation } =
      window.BCLTypingTranslationClient;

    const consumed = new Set();
    let composing = false;
    let lastBeforeInput = null;
    let hideTimer = null;

    function clearHint() {
      if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }
      hint.hidden = true;
      hint.textContent = "";
    }

    function showStatus(text, className) {
      if (hideTimer) clearTimeout(hideTimer);
      hint.className =
        "typing-translation-hint " + (className || "");
      hint.textContent = text;
      hint.hidden = false;
    }

    function showItems(items) {
      if (!items.length) {
        clearHint();
        return;
      }

      hint.className = "typing-translation-hint";
      hint.textContent = "";

      const label = document.createElement("span");
      label.className = "typing-translation-label";
      label.textContent = "Typing Translation";
      hint.appendChild(label);

      const list = document.createElement("span");
      list.className = "typing-translation-items";

      items.forEach((item) => {
        if (
          !item ||
          typeof item.translation !== "string"
        ) {
          return;
        }

        const chip = document.createElement("span");
        chip.className = "typing-translation-chip";

        const source =
          typeof item.source === "string"
            ? item.source.trim()
            : "";

        chip.textContent = source
          ? source + " → " + item.translation.trim()
          : item.translation.trim();

        list.appendChild(chip);
      });

      hint.appendChild(list);
      hint.hidden = false;
      hideTimer = setTimeout(clearHint, 9000);
    }

    function isSourceLanguageTyping(text, profile) {
      if (
        !profile ||
        profile.sourceLanguage !== "zh"
      ) {
        return false;
      }

      const hasHan = /[\u3400-\u9fff]/u.test(text);
      const hasJapaneseKana =
        /[\u3040-\u30ff]/u.test(text);

      return hasHan && !hasJapaneseKana;
    }

    async function processSegment(segment) {
      if (
        !segment ||
        consumed.has(segment.identity)
      ) {
        return;
      }

      consumed.add(segment.identity);

      let profile;
      try {
        profile = getProfile();
      } catch (error) {
        return;
      }

      if (
        !isSourceLanguageTyping(
          segment.text,
          profile
        )
      ) {
        return;
      }

      showStatus(
        "Typing Translation…",
        "is-loading"
      );

      try {
        const items =
          await requestTypingTranslation({
            segment,
            sourceLanguage:
              profile.sourceLanguage,
            targetLanguage:
              profile.targetLanguage,
            levelSystem:
              profile.learningLevelSystem,
            level:
              profile.learningLevel
          });

        showItems(items);
      } catch (error) {
        showStatus(
          error && error.code
            ? "Typing Translation unavailable · " +
                error.code
            : "Typing Translation unavailable",
          "is-error"
        );

        hideTimer =
          setTimeout(clearHint, 5000);
      }
    }

    function detectAtCurrentCaret() {
      const caretIndex = input.selectionStart;

      if (
        !Number.isInteger(caretIndex) ||
        caretIndex <= 0
      ) {
        return null;
      }

      const insertedText =
        input.value[caretIndex - 1];

      if (
        !TRIGGER_PUNCTUATION.has(
          insertedText
        )
      ) {
        return null;
      }

      return detectCompletedSegment({
        value: input.value,
        caretIndex,
        insertedText
      });
    }

    function processCurrentCaretIfCompleted() {
      if (!isEnabled()) return;

      const segment = detectAtCurrentCaret();
      if (segment) {
        processSegment(segment);
      }
    }

    input.addEventListener(
      "compositionstart",
      () => {
        composing = true;
      }
    );

    input.addEventListener(
      "compositionend",
      () => {
        composing = false;
        lastBeforeInput = null;

        queueMicrotask(
          processCurrentCaretIfCompleted
        );
      }
    );

    input.addEventListener(
      "beforeinput",
      (event) => {
        lastBeforeInput = {
          inputType: event.inputType,
          data:
            typeof event.data === "string"
              ? event.data
              : ""
        };
      }
    );

    input.addEventListener("paste", () => {
      lastBeforeInput = {
        inputType: "insertFromPaste",
        data: ""
      };
    });

    input.addEventListener("drop", () => {
      lastBeforeInput = {
        inputType: "insertFromDrop",
        data: ""
      };
    });

    input.addEventListener("input", () => {
      if (composing || !isEnabled()) {
        return;
      }

      const eventInfo = lastBeforeInput;
      lastBeforeInput = null;

      if (
        !eventInfo ||
        eventInfo.inputType !== "insertText"
      ) {
        return;
      }

      const segment = detectCompletedSegment({
        value: input.value,
        caretIndex: input.selectionStart,
        insertedText: eventInfo.data
      });

      if (segment) {
        processSegment(segment);
      }
    });

    input.addEventListener(
      "keydown",
      (event) => {
        if (
          event.key === "Enter" &&
          !event.shiftKey
        ) {
          clearHint();
        }
      }
    );

    document.addEventListener(
      "bcl:typing-translation-preference-changed",
      (event) => {
        if (
          !event.detail ||
          event.detail.enabled !== true
        ) {
          clearHint();
        }
      }
    );

    initialized = true;
    initializedApi = { clearHint };
    return initializedApi;
  }

  window.BCLTypingTranslationController = {
    initialize
  };

  document.addEventListener("DOMContentLoaded", () => {
    try {
      const input = document.getElementById("messageInput");
      const hint = document.getElementById("typingTranslationHint");

      if (
        !input ||
        !hint ||
        !window.BCLLearningProfile ||
        !window.BCLSettingsController
      ) {
        return;
      }

      initialize({
        input,
        hint,
        getProfile: window.BCLLearningProfile.getActiveLearningProfile,
        isEnabled: window.BCLSettingsController.getTypingTranslationEnabled
      });
    } catch (error) {
      console.error(
        "Typing Translation self-initialization failed:",
        error
      );
    }
  });
})();
