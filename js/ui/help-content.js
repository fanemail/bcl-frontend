"use strict";

(function () {
  const CONTENT = Object.freeze({
    zh: Object.freeze([
      Object.freeze({
        title: "Conversation",
        paragraphs: Object.freeze([
          "Conversation 是 BCL 的默認模式。平時直接輸入你想說的內容即可，不需要命令。",
          "BCL 會主要使用你正在學習的目標語言回應。Conversation 通常把回應控制在五句以內，目的是降低閱讀負擔並鼓勵多輪互動，而不是一次把所有內容講完。"
        ])
      }),
      Object.freeze({
        title: "Teaching",
        paragraphs: Object.freeze([
          "想對某個語言點進行較完整的教學時，可以在輸入開頭使用 t / T 或「請教 / 请教」。",
          "t / T 後面需要空格、句末或標點分隔，例如：t explain give up、T：explain give up。『請教 / 请教』可以直接接內容。忘記使用教學觸發詞也不會阻止一般使用；Conversation 仍可提供簡短的 micro-teaching。"
        ])
      }),
      Object.freeze({
        title: "Voice Input",
        paragraphs: Object.freeze([
          "Voice Input 是語音轉文字，不是直接的語音聊天模式。",
          "點擊麥克風後說話，BCL 會把語音轉成文字並放入輸入框。你可以先檢查或修改文字，再按 Send；系統不會自動送出。"
        ])
      }),
      Object.freeze({
        title: "Access & API Usage",
        paragraphs: Object.freeze([
          "BCL Access Token 是進入 BCL 的使用憑證，不是 OpenAI API Key。",
          "使用 BCL 的 AI 功能會產生 OpenAI API 使用量與相應成本，請合理使用並避免無意義的重複請求。"
        ])
      }),
      Object.freeze({
        title: "What BCL is for",
        paragraphs: Object.freeze([
          "BCL 定位於語言學習，普通聊天能力不如通用 AI 對話框，建議主要用於語言學習。Conversation 與 Teaching 都服務於這個目的，只是互動深度不同。"
        ])
      })
    ]),
    en: Object.freeze([
      Object.freeze({
        title: "Conversation",
        paragraphs: Object.freeze([
          "Conversation is BCL's default mode. Type naturally; no command is required.",
          "BCL normally keeps Conversation replies within five sentences to reduce reading load and encourage multi-turn practice."
        ])
      }),
      Object.freeze({
        title: "Teaching",
        paragraphs: Object.freeze([
          "Use t / T or 請教 / 请教 at the beginning when you want fuller teaching. t / T must be separated from the content by end-of-input, whitespace, or accepted punctuation.",
          "If you forget the trigger, normal use still works and Conversation may provide brief micro-teaching."
        ])
      }),
      Object.freeze({
        title: "Voice Input",
        paragraphs: Object.freeze([
          "Voice Input is speech-to-text input, not direct voice chat.",
          "Speak, review or edit the transcript in the composer, then press Send. BCL does not auto-send the transcript."
        ])
      }),
      Object.freeze({
        title: "Access & API Usage",
        paragraphs: Object.freeze([
          "A BCL Access Token is an access credential, not an OpenAI API key.",
          "AI features create OpenAI API usage and cost, so use them reasonably and avoid wasteful repeated requests."
        ])
      }),
      Object.freeze({
        title: "What BCL is for",
        paragraphs: Object.freeze([
          "BCL is designed primarily for language learning. Its general chat capability is not intended to replace a general-purpose AI chat product."
        ])
      })
    ]),
    ja: Object.freeze([
      Object.freeze({
        title: "Conversation",
        paragraphs: Object.freeze([
          "Conversation は BCL の標準モードです。通常はコマンドを付けず、そのまま入力します。",
          "Conversation の返答は通常5文以内に抑え、読む負担を減らして複数ターンの練習を続けやすくします。"
        ])
      }),
      Object.freeze({
        title: "Teaching",
        paragraphs: Object.freeze([
          "より詳しい学習説明が必要な場合は、入力の先頭に t / T または「請教 / 请教」を付けます。",
          "トリガーを忘れても通常利用は妨げられず、Conversation で短い micro-teaching が行われる場合があります。"
        ])
      }),
      Object.freeze({
        title: "Voice Input",
        paragraphs: Object.freeze([
          "Voice Input は音声を文字に変換する機能で、直接の音声チャットではありません。",
          "音声が入力欄に文字として表示されたら、確認・編集してから Send を押します。自動送信はされません。"
        ])
      }),
      Object.freeze({
        title: "Access & API Usage",
        paragraphs: Object.freeze([
          "BCL Access Token は BCL を利用するための認証情報で、OpenAI API Key ではありません。",
          "AI 機能の利用には OpenAI API の使用量と費用が発生するため、不要な重複リクエストは避けてください。"
        ])
      }),
      Object.freeze({
        title: "What BCL is for",
        paragraphs: Object.freeze([
          "BCL は主に語学学習のための製品です。一般的な雑談能力は汎用 AI チャット製品の代替を目的としていません。"
        ])
      })
    ])
  });

  function resolveLanguage(language) {
    const value = typeof language === "string"
      ? language.trim().toLowerCase()
      : "";

    if (value.startsWith("ja")) return "ja";
    if (value.startsWith("en")) return "en";
    return "zh";
  }

  function renderHelpContent(container, language) {
    if (!container) {
      throw new Error("Help content container is required.");
    }

    container.textContent = "";
    const sections = CONTENT[resolveLanguage(language)];

    for (const section of sections) {
      const wrapper = document.createElement("section");
      wrapper.className = "help-section";

      const heading = document.createElement("h3");
      heading.textContent = section.title;
      wrapper.appendChild(heading);

      for (const paragraphText of section.paragraphs) {
        const paragraph = document.createElement("p");
        paragraph.textContent = paragraphText;
        wrapper.appendChild(paragraph);
      }

      container.appendChild(wrapper);
    }
  }

  window.BCLHelpContent = {
    renderHelpContent
  };
})();
