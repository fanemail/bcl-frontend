"use strict";

(function () {
  function isSupported() {
    return (
      "speechSynthesis" in window &&
      "SpeechSynthesisUtterance" in window
    );
  }

  function resolveLanguage(targetLanguage) {
    const language =
      typeof targetLanguage === "string"
        ? targetLanguage.trim().toLowerCase()
        : "";

    if (language === "en" || language.startsWith("en-")) {
      return "en-US";
    }

    if (language === "ja" || language.startsWith("ja-")) {
      return "ja-JP";
    }

    return language;
  }

  function stop() {
    if (isSupported()) {
      window.speechSynthesis.cancel();
    }
  }

  function speak({
    text,
    targetLanguage,
    speed = 1,
    onStart,
    onEnd,
    onError
  }) {
    if (!isSupported()) {
      throw new Error("Local speech synthesis is not supported.");
    }

    if (typeof text !== "string" || text.trim() === "") {
      throw new Error("Local speech text is empty.");
    }

    stop();

    const utterance =
      new SpeechSynthesisUtterance(text.trim());

    const language = resolveLanguage(targetLanguage);
    if (language) utterance.lang = language;

    utterance.rate =
      Number.isFinite(speed) && speed > 0 ? speed : 1;

    if (typeof onStart === "function") utterance.onstart = onStart;
    if (typeof onEnd === "function") utterance.onend = onEnd;
    if (typeof onError === "function") utterance.onerror = onError;

    window.speechSynthesis.speak(utterance);
    return utterance;
  }

  window.BCLLocalTTS = {
    isSupported,
    resolveLanguage,
    speak,
    stop
  };
})();
