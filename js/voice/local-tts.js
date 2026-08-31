"use strict";

(function () {
  let currentUtterance = null;
  let lastOptions = null;
  let speed = 1;

  function isSupported() {
    return "speechSynthesis" in window &&
      "SpeechSynthesisUtterance" in window;
  }

  function resolveLanguage(targetLanguage) {
    const language = typeof targetLanguage === "string"
      ? targetLanguage.trim().toLowerCase()
      : "";
    if (language === "en" || language.startsWith("en-")) return "en-US";
    if (language === "ja" || language.startsWith("ja-")) return "ja-JP";
    return language;
  }

  function stop() {
    if (isSupported()) window.speechSynthesis.cancel();
    currentUtterance = null;
  }

  function setSpeed(value) {
    const next = Number(value);
    speed = Number.isFinite(next) && next > 0 ? next : 1;
    return speed;
  }

  function pause() {
    if (!isSupported() || !window.speechSynthesis.speaking) return false;
    window.speechSynthesis.pause();
    return true;
  }

  function resume() {
    if (!isSupported() || !window.speechSynthesis.paused) return false;
    window.speechSynthesis.resume();
    return true;
  }

  function speak(options) {
    const {text, targetLanguage, onStart, onEnd, onError} = options;
    if (!isSupported()) throw new Error("Local speech synthesis is not supported.");
    if (typeof text !== "string" || text.trim() === "") {
      throw new Error("Local speech text is empty.");
    }
    stop();
    lastOptions = {...options};
    const utterance = new SpeechSynthesisUtterance(text.trim());
    currentUtterance = utterance;
    const language = resolveLanguage(targetLanguage);
    if (language) utterance.lang = language;
    const requested = Number(options.speed);
    utterance.rate = Number.isFinite(requested) && requested > 0 ? requested : speed;
    if (typeof onStart === "function") utterance.onstart = onStart;
    utterance.onend = () => {
      currentUtterance = null;
      if (typeof onEnd === "function") onEnd();
    };
    utterance.onerror = (event) => {
      currentUtterance = null;
      if (typeof onError === "function") onError(event);
    };
    window.speechSynthesis.speak(utterance);
    return utterance;
  }

  function replay() {
    if (!lastOptions) return false;
    speak({...lastOptions, speed});
    return true;
  }

  window.BCLLocalTTS = {
    isSupported, resolveLanguage, speak, stop,
    pause, resume, replay, setSpeed
  };
})();
