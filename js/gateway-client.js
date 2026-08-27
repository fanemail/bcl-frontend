"use strict";

(function () {
  let gatewayUrl = "";

  const ACCESS_TOKEN_STORAGE_KEY =
    "bcl.accessToken";

  function setAccessToken(token) {
    if (typeof token !== "string") {
      throw new Error("BCL access token must be a string.");
    }

    const normalizedToken = token.trim();

    if (!normalizedToken) {
      throw new Error("BCL access token is required.");
    }

    localStorage.setItem(
      ACCESS_TOKEN_STORAGE_KEY,
      normalizedToken
    );
  }

  function getAccessToken() {
    const token =
      localStorage.getItem(
        ACCESS_TOKEN_STORAGE_KEY
      );

    return typeof token === "string"
      ? token.trim()
      : "";
  }

  function clearAccessToken() {
    localStorage.removeItem(
      ACCESS_TOKEN_STORAGE_KEY
    );
  }

  function setGatewayUrl(url) {
    if (typeof url !== "string") {
      throw new Error("Gateway URL must be a string.");
    }

    gatewayUrl = url.trim();
  }

  function getGatewayUrl() {
    return gatewayUrl;
  }

  async function sendRuntimeRequest(runtimeRequest) {
    if (!gatewayUrl) {
      throw new Error(
        "Gateway URL is not configured."
      );
    }

    const accessToken = getAccessToken();

    const headers = {
      "Content-Type": "application/json"
    };

    if (accessToken) {
      headers["X-BCL-Access-Token"] = accessToken;
    }

    const response = await fetch(
      gatewayUrl,
      {
        method: "POST",
        headers,
        body: JSON.stringify(runtimeRequest)
      }
    );

    let responseData;

    try {
      responseData = await response.json();
    } catch (error) {
      throw new Error(
        "Gateway returned an invalid response."
      );
    }

    if (
      !response.ok ||
      !responseData ||
      responseData.ok !== true
    ) {
      throw new Error(
        responseData &&
        typeof responseData.error === "string"
          ? responseData.error
          : "Gateway request failed."
      );
    }

    if (
      typeof responseData.content !== "string" ||
      responseData.content.trim() === ""
    ) {
      throw new Error(
        "Gateway returned no content."
      );
    }

    return responseData;
  }

  window.BCLGatewayClient = {
    setGatewayUrl,
    getGatewayUrl,
    setAccessToken,
    getAccessToken,
    clearAccessToken,
    sendRuntimeRequest
  };
})();
