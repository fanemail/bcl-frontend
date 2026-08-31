"use strict";

(function () {
  let provider = null;

  function createError(message, code) {
    const error = new Error(message);
    error.code = code;
    return error;
  }

  function setProvider(nextProvider) {
    if (
      !nextProvider ||
      typeof nextProvider.transcribe !== "function"
    ) {
      throw createError(
        "STT provider must expose a transcribe function.",
        "STT_PROVIDER_INVALID"
      );
    }

    provider = nextProvider;
  }

  function clearProvider() {
    provider = null;
  }

  function hasProvider() {
    return Boolean(provider);
  }

  async function transcribe(audio, context = {}) {
    if (!provider) {
      throw createError(
        "Speech-to-text provider is not configured yet.",
        "STT_PROVIDER_UNAVAILABLE"
      );
    }

    const result = await provider.transcribe(audio, context);

    if (typeof result === "string") {
      return result;
    }

    if (
      result &&
      typeof result.text === "string"
    ) {
      return result.text;
    }

    throw createError(
      "STT provider returned an invalid transcript.",
      "STT_RESULT_INVALID"
    );
  }

  window.BCLSpeechToText = {
    setProvider,
    clearProvider,
    hasProvider,
    transcribe
  };
})();
