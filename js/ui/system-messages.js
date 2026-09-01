"use strict";

(function () {
  const COPY = Object.freeze({
    zh: Object.freeze({
      teachingReady:
        "Teaching mode 已準備好。請輸入單字、句子、段落或學習問題。",
      teachingHint:
        "如果你是在問教學問題，可以輸入 `t` 或「請教」進入 Teaching mode。",
      technicalDefault:
        "BCL 暫時無法完成這次回應，請再試一次。",
      network:
        "暫時無法連線到 BCL 服務，請檢查網路後再試。",
      timeout:
        "BCL 回應逾時了，請再試一次。",
      invalidRequest:
        "這次請求無法處理，請稍作修改後再試。",
      errorCodeLabel:
        "錯誤代碼"
    }),

    en: Object.freeze({
      teachingReady:
        "Teaching mode is ready. Enter a word, sentence, passage, or learning question.",
      teachingHint:
        "If you are asking a learning question, type `t` or the Teaching command to enter Teaching mode.",
      technicalDefault:
        "BCL could not complete this response. Please try again.",
      network:
        "BCL cannot connect right now. Check your connection and try again.",
      timeout:
        "BCL took too long to respond. Please try again.",
      invalidRequest:
        "This request could not be processed. Please revise it and try again.",
      errorCodeLabel:
        "Error code"
    }),

    ja: Object.freeze({
      teachingReady:
        "Teaching mode の準備ができました。単語、文、文章、または学習上の質問を入力してください。",
      teachingHint:
        "学習について質問したい場合は、`t` または Teaching コマンドで Teaching mode に入れます。",
      technicalDefault:
        "BCL は今回の応答を完了できませんでした。もう一度お試しください。",
      network:
        "現在 BCL に接続できません。通信状況を確認して、もう一度お試しください。",
      timeout:
        "BCL の応答がタイムアウトしました。もう一度お試しください。",
      invalidRequest:
        "このリクエストは処理できませんでした。内容を少し修正して、もう一度お試しください。",
      errorCodeLabel:
        "エラーコード"
    })
  });

  const NETWORK_CODES = new Set([
    "GATEWAY_NETWORK_FAILURE",
    "AI_NETWORK_FAILURE"
  ]);

  const TIMEOUT_CODES = new Set([
    "AI_TIMEOUT"
  ]);

  const INVALID_REQUEST_CODES = new Set([
    "RUNTIME_INVALID_REQUEST"
  ]);

  function getCopy(sourceLanguage) {
    if (
      typeof sourceLanguage === "string" &&
      COPY[sourceLanguage]
    ) {
      return COPY[sourceLanguage];
    }

    return COPY.en;
  }

  function getTeachingReadyMessage(sourceLanguage) {
    return getCopy(sourceLanguage).teachingReady;
  }

  function getModeHintMessage(modeHint, sourceLanguage) {
    if (modeHint !== "teaching_possible") {
      return "";
    }

    return getCopy(sourceLanguage).teachingHint;
  }

  function createTechnicalFailureMessage(error, sourceLanguage) {
    const copy = getCopy(sourceLanguage);
    const code =
      error && typeof error.code === "string"
        ? error.code
        : "";

    let message = copy.technicalDefault;

    if (NETWORK_CODES.has(code)) {
      message = copy.network;
    } else if (TIMEOUT_CODES.has(code)) {
      message = copy.timeout;
    } else if (INVALID_REQUEST_CODES.has(code)) {
      message = copy.invalidRequest;
    }

    return {
      userState: "TECHNICAL_FAILURE",
      content:
        message +
        (code
          ? "\n\n" + copy.errorCodeLabel + ": `" + code + "`"
          : ""),
      code
    };
  }

  window.BCLSystemMessages = {
    getTeachingReadyMessage,
    getModeHintMessage,
    createTechnicalFailureMessage
  };
})();
