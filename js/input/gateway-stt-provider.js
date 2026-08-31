"use strict";

(function () {
  const {
    setProvider
  } = window.BCLSpeechToText;

  const {
    getGatewayUrl,
    getAccessToken
  } = window.BCLGatewayClient;

  function createError(message, code) {
    const error = new Error(message);
    error.code = code;
    return error;
  }

  function getFileExtension(mimeType) {
    const normalized =
      typeof mimeType === "string"
        ? mimeType.toLowerCase()
        : "";

    if (normalized.includes("ogg")) {
      return "ogg";
    }

    if (normalized.includes("mp4")) {
      return "mp4";
    }

    if (normalized.includes("mpeg") ||
        normalized.includes("mp3")) {
      return "mp3";
    }

    if (normalized.includes("wav")) {
      return "wav";
    }

    return "webm";
  }

  async function transcribe(audio) {
    if (
      !audio ||
      !(audio.blob instanceof Blob) ||
      audio.blob.size === 0
    ) {
      throw createError(
        "No recorded audio is available for transcription.",
        "STT_AUDIO_INVALID"
      );
    }

    const gatewayUrl = getGatewayUrl();

    if (!gatewayUrl) {
      throw createError(
        "Gateway URL is not configured.",
        "STT_GATEWAY_UNAVAILABLE"
      );
    }

    const accessToken = getAccessToken();

    if (!accessToken) {
      throw createError(
        "BCL access token is required.",
        "STT_UNAUTHORIZED"
      );
    }

    const formData = new FormData();

    const mimeType =
      typeof audio.mimeType === "string" &&
      audio.mimeType.trim() !== ""
        ? audio.mimeType
        : audio.blob.type;

    const extension =
      getFileExtension(mimeType);

    formData.append(
      "audio",
      audio.blob,
      "bcl-recording." + extension
    );

    const response = await fetch(
      gatewayUrl.replace(/\/+$/, "") + "/stt",
      {
        method: "POST",
        headers: {
          "X-BCL-Access-Token": accessToken
        },
        body: formData
      }
    );

    let responseData;

    try {
      responseData = await response.json();
    } catch (error) {
      throw createError(
        "Speech-to-text gateway returned an invalid response.",
        "STT_GATEWAY_INVALID_RESPONSE"
      );
    }

    if (
      !response.ok ||
      !responseData ||
      responseData.ok !== true
    ) {
      throw createError(
        responseData &&
        typeof responseData.error === "string"
          ? responseData.error
          : "Speech-to-text request failed.",
        "STT_REQUEST_FAILED"
      );
    }

    if (
      typeof responseData.text !== "string" ||
      responseData.text.trim() === ""
    ) {
      throw createError(
        "Speech-to-text returned an empty transcript.",
        "STT_RESULT_EMPTY"
      );
    }

    return responseData.text;
  }

  setProvider({
    id: "bcl-gateway-openai-stt",
    transcribe
  });
})();
