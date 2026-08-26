"use strict";

(function () {
  let gatewayUrl = "";

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

    const response = await fetch(
      gatewayUrl,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
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
    sendRuntimeRequest
  };
})();
