"use strict";

(function () {
  async function requestTypingTranslation({
    segment,
    sourceLanguage,
    targetLanguage,
    levelSystem,
    level
  }) {
    const { getGatewayUrl, getAccessToken } = window.BCLGatewayClient;
    const gatewayUrl = getGatewayUrl();

    if (!gatewayUrl) {
      throw new Error("Gateway URL is not configured.");
    }

    const headers = {
      "Content-Type": "application/json"
    };

    const accessToken = getAccessToken();
    if (accessToken) {
      headers["X-BCL-Access-Token"] = accessToken;
    }

    const response = await fetch(
      gatewayUrl.replace(/\/$/, "") + "/typing-translation",
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          sourceLanguage,
          targetLanguage,
          levelSystem,
          level,
          text: segment.text,
          forcedItems: segment.forcedItems
        })
      }
    );

    let data;
    try {
      data = await response.json();
    } catch (error) {
      throw new Error("Typing Translation returned an invalid response.");
    }

    if (!response.ok || !data || data.ok !== true) {
      const error = new Error(
        data && typeof data.error === "string"
          ? data.error
          : "Typing Translation request failed."
      );
      if (data && typeof data.errorCode === "string") {
        error.code = data.errorCode;
      }
      throw error;
    }

    return Array.isArray(data.items) ? data.items : [];
  }

  window.BCLTypingTranslationClient = {
    requestTypingTranslation
  };
})();
