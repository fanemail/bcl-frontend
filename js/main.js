"use strict";

const { createRuntimeState } = window.BCLRuntimeState;
const { dispatchRuntime } = window.BCLDispatcher;
const {
  getActiveLearningProfile,
  setActiveLearningProfile
} = window.BCLLearningProfile;
const {
  getReferenceMemory,
  updateReferenceMemory,
  buildSelectedContext
} = window.BCLReferenceMemory;
const {
  setGatewayUrl,
  setAccessToken,
  getAccessToken,
  getGatewayUrl,
  clearAccessToken,
  sendRuntimeRequest
} = window.BCLGatewayClient;

const { parseGatewayResponse } =
  window.BCLResponseParser;

const { createVoicePlan } =
  window.BCLVoiceController;

const { speak: speakLocal, stop: stopLocal } =
  window.BCLLocalTTS;

const { play: playAI, stop: stopAI } =
  window.BCLAITTS;

setGatewayUrl(
  "https://bcl-api-gateway.fanemailyoutoo.workers.dev"
);

document.addEventListener("DOMContentLoaded", () => {
  const messageList = document.getElementById("messageList");
  const scrollLatestButton = document.getElementById("scrollLatestButton");

  const accessSetup =
    document.getElementById("accessSetup");

  const accessTokenInput =
    document.getElementById("accessTokenInput");

  const accessStartButton =
    document.getElementById("accessStartButton");

  const accessSetupError =
    document.getElementById("accessSetupError");

  const profileSetup =
    document.getElementById("profileSetup");

  const profileButton =
    document.getElementById("profileButton");

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

    function unescapeMarkdownLine(line) {
      return line.replace(/\\([#>*_=+|:-])/g, "$1");
    }

    let paragraph = [];
    let codeLines = [];
    let listItems = [];
    let quoteLines = [];
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

    function flushList() {
      if (listItems.length === 0) {
        return;
      }

      output.push(
        "<ul>" +
          listItems
            .map(
              (item) =>
                "<li>" +
                renderInlineMarkdown(item) +
                "</li>"
            )
            .join("") +
          "</ul>"
      );

      listItems = [];
    }

    function flushQuote() {
      if (quoteLines.length === 0) {
        return;
      }

      output.push(
        "<blockquote>" +
          quoteLines
            .map(renderInlineMarkdown)
            .join("<br>") +
          "</blockquote>"
      );

      quoteLines = [];
    }

    function parseTableRow(line) {
      return line
        .trim()
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map((cell) => cell.trim());
    }

    function isTableSeparator(line) {
      const cells = parseTableRow(line);

      return (
        cells.length > 0 &&
        cells.every(
          (cell) =>
            /^:?-{3,}:?$/.test(cell)
        )
      );
    }

    function renderTable(header, rows) {
      let html = "<table><thead><tr>";

      html += header
        .map(
          (cell) =>
            "<th>" +
            renderInlineMarkdown(cell) +
            "</th>"
        )
        .join("");

      html += "</tr></thead><tbody>";

      html += rows
        .map(
          (row) =>
            "<tr>" +
            row
              .map(
                (cell) =>
                  "<td>" +
                  renderInlineMarkdown(cell) +
                  "</td>"
              )
              .join("") +
            "</tr>"
        )
        .join("");

      html += "</tbody></table>";

      return html;
    }

    function flushTextBlocks() {
      flushParagraph();
      flushList();
      flushQuote();
    }

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
      const line = lines[lineIndex];
      if (line.startsWith("```")) {
        if (!inCodeBlock) {
          flushTextBlocks();
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

      const normalizedLine =
        unescapeMarkdownLine(line);

      if (normalizedLine.trim() === "") {
        flushTextBlocks();
        continue;
      }

      const nextLine =
        lineIndex + 1 < lines.length
          ? unescapeMarkdownLine(
              lines[lineIndex + 1]
            )
          : "";

      if (
        normalizedLine.includes("|") &&
        isTableSeparator(nextLine)
      ) {
        flushTextBlocks();

        const header =
          parseTableRow(normalizedLine);


        const rows = [];

        let tableIndex =
          lineIndex + 2;

        while (
          tableIndex < lines.length
        ) {
          const tableLine =
            unescapeMarkdownLine(
              lines[tableIndex]
            );

          if (
            !tableLine.includes("|") ||
            tableLine.trim() === ""
          ) {
            break;
          }

          rows.push(
            parseTableRow(tableLine)
          );

          tableIndex += 1;
        }

        output.push(
          renderTable(header, rows)
        );

        lineIndex = tableIndex - 1;
        continue;
      }

      if (isTableSeparator(normalizedLine)) {
        continue;
      }

      const headingMatch =
        normalizedLine.match(/^(#{1,4})\s+(.+)$/);

      if (headingMatch) {
        flushTextBlocks();

        const level = headingMatch[1].length;

        output.push(
          "<h" +
            level +
            ">" +
            renderInlineMarkdown(headingMatch[2]) +
            "</h" +
            level +
            ">"
        );

        continue;
      }

      const quoteMatch =
        normalizedLine.match(/^>\s?(.*)$/);

      if (quoteMatch) {
        flushParagraph();
        flushList();
        quoteLines.push(quoteMatch[1]);
        continue;
      }

      const listMatch =
        normalizedLine.match(/^[-*]\s+(.+)$/);

      if (listMatch) {
        flushParagraph();
        flushQuote();
        listItems.push(listMatch[1]);
        continue;
      }

      flushList();
      flushQuote();
      paragraph.push(normalizedLine);
    }

    if (inCodeBlock) {
      flushCodeBlock();
    }

    flushTextBlocks();

    return output.join("");
  }
  function createMessageElement({
    speaker,
    type,
    content,
    markdown = false,
    mode = null,
    runtimeMode = null,
    speechSegments = [],
    targetLanguage = ""
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

    if (type === "ai" && runtimeMode) {
      const voicePlan = createVoicePlan({
        mode: runtimeMode,
        targetLanguage,
        speechSegments
      });

      if (voicePlan.length > 0) {
        const voiceRegion = document.createElement("div");
        voiceRegion.className = "voice-region";

        if (runtimeMode === "conversation") {
          const item = voicePlan[0];
          const button = document.createElement("button");

          button.className =
            "voice-button voice-button-conversation";
          button.type = "button";
          button.disabled = false;
          button.dataset.speechId = item.id;
          button.dataset.voiceRenderer = item.renderer;
          button.dataset.playing = "false";
          button.textContent = "Voice";

          button.addEventListener("click", async () => {
            if (button.dataset.playing === "true") {
              stopAI();
              button.dataset.playing = "false";
              button.textContent = "Voice";
              return;
            }

            button.disabled = true;

            await playAI({
              gatewayUrl: getGatewayUrl(),
              accessToken: getAccessToken(),
              text: item.text,
              targetLanguage: item.targetLanguage,
              cacheKey: item.targetLanguage + ":" + item.text,
              onLoading: () => {
                button.textContent = "Loading...";
              },
              onPlaying: () => {
                button.disabled = false;
                button.dataset.playing = "true";
                button.textContent = "Stop";
              },
              onEnd: () => {
                button.disabled = false;
                button.dataset.playing = "false";
                button.textContent = "Voice";
              },
              onError: (error) => {
                button.disabled = false;
                button.dataset.playing = "false";
                button.textContent = "Voice";
                console.error("AI TTS failed:", error);
              }
            });
          });

          voiceRegion.appendChild(button);
        } else {
          const list = document.createElement("div");
          list.className = "speech-items";

          for (const item of voicePlan) {
            const row = document.createElement("div");
            row.className = "speech-item";

            const button = document.createElement("button");
            button.className = "voice-button";
            button.type = "button";
            button.disabled = item.renderer !== "local";
            button.dataset.speechId = item.id;
            button.dataset.voiceRenderer = item.renderer;
            button.textContent = "Play";

            if (item.renderer === "local") {
              button.addEventListener("click", () => {
                if (button.dataset.playing === "true") {
                  stopLocal();
                  button.dataset.playing = "false";
                  button.textContent = "Play";
                  return;
                }

                try {
                  speakLocal({
                    text: item.text,
                    targetLanguage: item.targetLanguage,
                    onStart: () => {
                      button.dataset.playing = "true";
                      button.textContent = "Stop";
                    },
                    onEnd: () => {
                      button.dataset.playing = "false";
                      button.textContent = "Play";
                    },
                    onError: () => {
                      button.dataset.playing = "false";
                      button.textContent = "Play";
                    }
                  });
                } catch (error) {
                  button.dataset.playing = "false";
                  button.textContent = "Play";
                  console.error("Local TTS failed:", error);
                }
              });
            }

            const text = document.createElement("span");
            text.className = "speech-item-text";
            text.textContent = item.text;

            if (item.targetLanguage) {
              text.lang = item.targetLanguage;
            }

            row.appendChild(button);
            row.appendChild(text);
            list.appendChild(row);
          }

          voiceRegion.appendChild(list);
        }

        body.appendChild(voiceRegion);
      }
    }

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

  function showAccessSetup() {
    accessSetup.hidden = false;
    accessSetupError.hidden = true;
    accessSetupError.textContent = "";
    accessTokenInput.focus();
  }

  function hideAccessSetup() {
    accessSetup.hidden = true;
    accessSetupError.hidden = true;
    accessSetupError.textContent = "";
  }

  function initializeAccessSetup() {
    if (getAccessToken()) {
      initializeProfileSetup();
      return;
    }

    showAccessSetup();
  }

  function saveAccessSetup() {
    try {
      setAccessToken(accessTokenInput.value);

      accessTokenInput.value = "";

      hideAccessSetup();
      initializeProfileSetup();
    } catch (error) {
      accessSetupError.textContent =
        error.message;

      accessSetupError.hidden = false;
    }
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
  function rememberSuccessfulTurn(
    userContent,
    assistantContent
  ) {
    const memory = getReferenceMemory();

    const recentTurns = [
      ...memory.recentTurns,
      "User: " + userContent.trim(),
      "BCL: " + assistantContent.trim()
    ];

    updateReferenceMemory({
      recentTurns: recentTurns.slice(-6)
    });
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

      const parsedResponse =
        parseGatewayResponse(
          gatewayResponse,
          runtimeContext.runtime
        );

      appendMessage({
        speaker: "BCL",
        type: "ai",
        mode:
          runtimeContext.runtime === "teaching"
            ? "Teaching Runtime"
            : "Conversation Runtime",
        content: parsedResponse.displayContent,
        markdown: true,
        runtimeMode: runtimeContext.runtime,
        speechSegments: parsedResponse.speechSegments,
        targetLanguage: activeProfile.targetLanguage
      });

      rememberSuccessfulTurn(
        rawValue,
        parsedResponse.displayContent
      );
    } catch (error) {
      if (error.message === "Unauthorized.") {
        clearAccessToken();
        showAccessSetup();
        return;
      }

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

  accessStartButton.addEventListener(
    "click",
    saveAccessSetup
  );

  accessTokenInput.addEventListener(
    "keydown",
    (event) => {
      if (event.key !== "Enter") {
        return;
      }

      event.preventDefault();
      saveAccessSetup();
    }
  );

  profileButton.addEventListener(
    "click",
    showProfileSetup
  );

  profileTargetLanguage.addEventListener(
    "change",
    updateProfileLevelOptions
  );

  profileStartButton.addEventListener(
    "click",
    saveProfileSetup
  );

  initializeAccessSetup();
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


  scrollToLatest();
});


























