"use strict";

const { createRuntimeState } = window.BCLRuntimeState;
const { dispatchRuntime } = window.BCLDispatcher;
const {
  getActiveLearningProfile,
  setActiveLearningProfile
} = window.BCLLearningProfile;
const { buildSelectedContext } = window.BCLReferenceMemory;
const {
  setGatewayUrl,
  sendRuntimeRequest
} = window.BCLGatewayClient;

setGatewayUrl(
  "https://bcl-api-gateway.fanemailyoutoo.workers.dev"
);

document.addEventListener("DOMContentLoaded", () => {
  const messageList = document.getElementById("messageList");
  const scrollLatestButton = document.getElementById("scrollLatestButton");

  const profileSetup =
    document.getElementById("profileSetup");

  const profileTargetLanguage =
    document.getElementById("profileTargetLanguage");

  const profileLearningLevel =
    document.getElementById("profileLearningLevel");

  const profileStartButton =
    document.getElementById("profileStartButton");

  const profileSetupError =
    document.getElementById("profileSetupError");

  const loadingState = document.getElementById("loadingState");
  const errorState = document.getElementById("errorState");
  const recordingState = document.getElementById("recordingState");

  const toggleLoadingButton = document.getElementById("toggleLoadingButton");
  const toggleErrorButton = document.getElementById("toggleErrorButton");
  const toggleRecordingButton = document.getElementById("toggleRecordingButton");

  const microphoneButton = document.getElementById("microphoneButton");
  const sendButton = document.getElementById("sendButton");
  const messageInput = document.getElementById("messageInput");

  let pendingResponses = 0;

  function isNearBottom() {
    const threshold = 80;

    return (
      messageList.scrollHeight -
        messageList.scrollTop -
        messageList.clientHeight <
      threshold
    );
  }

  function scrollToLatest() {
    messageList.scrollTop = messageList.scrollHeight;
  }

  function hideDemoStates() {
    loadingState.hidden = true;
    errorState.hidden = true;
    recordingState.hidden = true;
  }

  function showDemoState(element) {
    const wasNearBottom = isNearBottom();
    const wasVisible = !element.hidden;

    hideDemoStates();

    if (!wasVisible) {
      element.hidden = false;

      if (wasNearBottom) {
        scrollToLatest();
      }
    }
  }

  function escapeHtml(value) {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function renderInlineMarkdown(value) {
    let html = escapeHtml(value);

    html = html.replace(/`([^`\n]+)`/g, "<code>$1</code>");
    html = html.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/\*([^*\n]+)\*/g, "<em>$1</em>");

    return html;
  }

  function renderMarkdown(markdown) {
    const lines = markdown.replace(/\r\n/g, "\n").split("\n");
    const output = [];

    let paragraph = [];
    let codeLines = [];
    let inCodeBlock = false;
    let codeLanguage = "";

    function flushParagraph() {
      if (paragraph.length === 0) {
        return;
      }

      output.push(
        "<p>" +
          paragraph.map(renderInlineMarkdown).join("<br>") +
          "</p>"
      );

      paragraph = [];
    }

    function flushCodeBlock() {
      output.push(
        '<pre class="code-block"><code data-language="' +
          escapeHtml(codeLanguage) +
          '">' +
          escapeHtml(codeLines.join("\n")) +
          "</code></pre>"
      );

      codeLines = [];
      codeLanguage = "";
    }

    for (const line of lines) {
      if (line.startsWith("```")) {
        if (!inCodeBlock) {
          flushParagraph();
          inCodeBlock = true;
          codeLanguage = line.slice(3).trim();
        } else {
          flushCodeBlock();
          inCodeBlock = false;
        }

        continue;
      }

      if (inCodeBlock) {
        codeLines.push(line);
        continue;
      }

      if (line.trim() === "") {
        flushParagraph();
      } else {
        paragraph.push(line);
      }
    }

    if (inCodeBlock) {
      flushCodeBlock();
    }

    flushParagraph();

    return output.join("");
  }

  function createMessageElement({
    speaker,
    type,
    content,
    markdown = false,
    mode = null
  }) {
    const article = document.createElement("article");

    article.className =
      "message " +
      (type === "user" ? "message-user" : "message-ai");

    const meta = document.createElement("div");
    meta.className = "message-meta";

    const speakerLabel = document.createElement("span");
    speakerLabel.className = "speaker-label";
    speakerLabel.textContent = speaker;

    meta.appendChild(speakerLabel);

    if (mode) {
      const modeLabel = document.createElement("span");
      modeLabel.className = "mode-label";
      modeLabel.textContent = mode;
      meta.appendChild(modeLabel);
    }

    const body = document.createElement("div");
    body.className = "message-body";

    if (markdown) {
      body.classList.add("message-markdown");
      body.innerHTML = renderMarkdown(content);
    } else {
      body.classList.add("message-plain");
      body.textContent = content;
    }

    article.appendChild(meta);
    article.appendChild(body);

    return article;
  }

  function appendMessage(message) {
    const shouldScroll = isNearBottom();
    const element = createMessageElement(message);

    messageList.insertBefore(element, loadingState);

    if (shouldScroll) {
      scrollToLatest();
    }
  }

  function updateLoadingState() {
    const shouldScroll = isNearBottom();

    loadingState.hidden = pendingResponses === 0;

    if (!loadingState.hidden && shouldScroll) {
      scrollToLatest();
    }
  }


  function updateProfileLevelOptions() {
    const targetLanguage =
      profileTargetLanguage.value;

    const levels =
      targetLanguage === "ja"
        ? ["N5", "N4", "N3", "N2", "N1"]
        : ["A1", "A2", "B1", "B2", "C1", "C2"];

    profileLearningLevel.innerHTML = "";

    for (const level of levels) {
      const option =
        document.createElement("option");

      option.value = level;
      option.textContent = level;

      profileLearningLevel.appendChild(option);
    }

    profileLearningLevel.value =
      targetLanguage === "ja"
        ? "N3"
        : "B2";
  }

  function showProfileSetup() {
    updateProfileLevelOptions();
    profileSetup.hidden = false;
  }

  function hideProfileSetup() {
    profileSetup.hidden = true;
    profileSetupError.hidden = true;
    profileSetupError.textContent = "";
  }

  function initializeProfileSetup() {
    try {
      getActiveLearningProfile();
      hideProfileSetup();
    } catch (error) {
      showProfileSetup();
    }
  }

  function saveProfileSetup() {
    try {
      const targetLanguage =
        profileTargetLanguage.value;

      const profile =
        targetLanguage === "ja"
          ? {
              sourceLanguage: "zh",
              targetLanguage: "ja",
              learningLevelSystem: "JLPT",
              learningLevel:
                profileLearningLevel.value
            }
          : {
              sourceLanguage: "zh",
              targetLanguage: "en",
              learningLevelSystem: "CEFR",
              learningLevel:
                profileLearningLevel.value
            };

      setActiveLearningProfile(profile);
      hideProfileSetup();
      messageInput.focus();
    } catch (error) {
      profileSetupError.textContent =
        error.message;

      profileSetupError.hidden = false;
    }
  }
  async function submitMessage() {
    const rawValue = messageInput.value;

    if (rawValue.trim() === "") {
      return;
    }

    appendMessage({
      speaker: "You",
      type: "user",
      content: rawValue.trim()
    });

    const state = createRuntimeState(rawValue);
    const runtimeContext = dispatchRuntime(state);

    messageInput.value = "";
    messageInput.focus();

    pendingResponses += 1;
    updateLoadingState();

    try {
      const activeProfile =
        getActiveLearningProfile();

      const runtimeRequest = {
        runtime: runtimeContext.runtime,

        learning: {
          sourceLanguage: activeProfile.sourceLanguage,
          targetLanguage: activeProfile.targetLanguage,
          levelSystem:
            activeProfile.learningLevelSystem,
          level:
            activeProfile.learningLevel
        },

        selectedContext:
          buildSelectedContext(),

        rawUserInput: rawValue,
        rawUserInstruction: rawValue
      };

      const gatewayResponse =
        await sendRuntimeRequest(runtimeRequest);

      appendMessage({
        speaker: "BCL",
        type: "ai",
        mode:
          runtimeContext.runtime === "teaching"
            ? "Teaching Runtime"
            : "Conversation Runtime",
        content: gatewayResponse.content,
        markdown: true
      });
    } catch (error) {
      appendMessage({
        speaker: "BCL",
        type: "ai",
        mode: "Gateway Error",
        content:
          "**Gateway Error**\n\n" +
          error.message,
        markdown: true
      });
    } finally {
      pendingResponses = Math.max(
        0,
        pendingResponses - 1
      );

      updateLoadingState();
    }
  }

  profileTargetLanguage.addEventListener(
    "change",
    updateProfileLevelOptions
  );

  profileStartButton.addEventListener(
    "click",
    saveProfileSetup
  );

  initializeProfileSetup();
  sendButton.addEventListener("click", submitMessage);

  messageInput.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") {
      return;
    }

    if (event.shiftKey) {
      return;
    }

    event.preventDefault();
    submitMessage();
  });

  scrollLatestButton.addEventListener("click", scrollToLatest);

  toggleLoadingButton.addEventListener("click", () => {
    showDemoState(loadingState);
  });

  toggleErrorButton.addEventListener("click", () => {
    showDemoState(errorState);
  });

  toggleRecordingButton.addEventListener("click", () => {
    showDemoState(recordingState);
  });

  microphoneButton.addEventListener("click", () => {
    showDemoState(recordingState);
  });

  hideDemoStates();
  scrollToLatest();
});


























