"use strict";

(function () {
  function itemSummary(items) {
    const values = (items || []).map((item) => item.text).filter(Boolean);
    if (values.length === 0) return "Teaching review";
    const shown = values.slice(0, 2);
    return shown.join(" · ") + (values.length > 2 ? " · +" + (values.length - 2) : "");
  }

  function highlightLearningItems(root, items) {
    if (!root || !Array.isArray(items) || items.length === 0) return;

    const targets = items
      .map((item) => item.text && item.text.trim())
      .filter(Boolean)
      .sort((a, b) => b.length - a.length);

    if (targets.length === 0) return;

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;

        if (
          parent.closest(
            ".voice-region, .teaching-collapse-summary, mark.learning-target, mark.session-search-hit"
          )
        ) {
          return NodeFilter.FILTER_REJECT;
        }

        return NodeFilter.FILTER_ACCEPT;
      }
    });

    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    for (const node of nodes) {
      let fragments = [node.nodeValue];
      let changed = false;

      for (const target of targets) {
        const next = [];

        for (const fragment of fragments) {
          if (typeof fragment !== "string") {
            next.push(fragment);
            continue;
          }

          const lower = fragment.toLocaleLowerCase();
          const needle = target.toLocaleLowerCase();
          let start = 0;
          let index = lower.indexOf(needle, start);

          if (index < 0) {
            next.push(fragment);
            continue;
          }

          changed = true;

          while (index >= 0) {
            if (index > start) next.push(fragment.slice(start, index));

            const mark = document.createElement("mark");
            mark.className = "learning-target";
            mark.textContent = fragment.slice(index, index + target.length);
            next.push(mark);

            start = index + target.length;
            index = lower.indexOf(needle, start);
          }

          if (start < fragment.length) next.push(fragment.slice(start));
        }

        fragments = next;
      }

      if (changed) {
        const holder = document.createDocumentFragment();

        for (const fragment of fragments) {
          holder.appendChild(
            typeof fragment === "string"
              ? document.createTextNode(fragment)
              : fragment
          );
        }

        node.replaceWith(holder);
      }
    }
  }

  function enhanceTeachingCard(article, body, learningItems) {
    if (!article || !body) return;

    article.classList.add("message-teaching");

    if (article.dataset.bclTeachingReviewEnhanced === "true") {
      highlightLearningItems(body, learningItems);
      return;
    }

    article.dataset.bclTeachingReviewEnhanced = "true";
    highlightLearningItems(body, learningItems);

    const button = document.createElement("button");
    button.type = "button";
    button.className = "teaching-collapse-button";
    button.textContent = "Collapse";
    button.setAttribute("aria-expanded", "true");

    const summary = document.createElement("div");
    summary.className = "teaching-collapse-summary";
    summary.textContent = itemSummary(learningItems);
    summary.hidden = true;

    const meta = article.querySelector(".message-meta");

    if (meta) {
      meta.appendChild(button);
    } else {
      article.insertBefore(button, body);
    }

    article.insertBefore(summary, body);

    button.addEventListener("click", () => {
      const collapsed = article.classList.toggle("is-collapsed");

      body.hidden = collapsed;
      summary.hidden = !collapsed;

      button.textContent = collapsed ? "Expand" : "Collapse";
      button.setAttribute(
        "aria-expanded",
        collapsed ? "false" : "true"
      );
    });
  }

  function enhanceExistingTeachingCards() {
    const cards = document.querySelectorAll(".message.message-teaching");

    cards.forEach((article) => {
      const body = article.querySelector(".message-body");
      if (!body) return;
      enhanceTeachingCard(article, body, []);
    });
  }

  function visibleMessageText(message) {
    if (!message) return "";

    const clone = message.cloneNode(true);

    clone
      .querySelectorAll(
        ".message-meta, .voice-region, .playback-button, .teaching-collapse-button, .teaching-collapse-summary"
      )
      .forEach((node) => node.remove());

    return (clone.textContent || "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function buildSessionRecords() {
    const list = document.getElementById("messageList");
    if (!list) return [];

    const messages = Array.from(
      list.querySelectorAll(":scope > .message")
    );

    const records = [];
    let current = null;

    for (const message of messages) {
      const isUser = message.classList.contains("message-user");
      const isAi = message.classList.contains("message-ai");

      if (!isUser && !isAi) continue;

      if (isUser) {
        current = {
          id: "session-" + records.length,
          elements: [message],
          fields: [{
            role: "user",
            text: visibleMessageText(message),
            element: message
          }]
        };

        records.push(current);
        continue;
      }

      if (!current) {
        current = {
          id: "session-" + records.length,
          elements: [],
          fields: []
        };

        records.push(current);
      }

      current.elements.push(message);
      current.fields.push({
        role: "bcl",
        text: visibleMessageText(message),
        element: message
      });
    }

    return records.filter((record) =>
      record.fields.some((field) => field.text)
    );
  }

  function escapeHtml(value) {
    return String(value || "").replace(
      /[&<>"']/g,
      (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "\"": "&quot;",
        "'": "&#039;"
      }[char])
    );
  }

  function makeSnippet(text, range, query) {
    const source = String(text || "");
    if (!source) return { before: "", hit: "", after: "" };

    if (!range) {
      const q = String(query || "").trim();
      const lower = source.toLocaleLowerCase();
      const index = q ? lower.indexOf(q.toLocaleLowerCase()) : -1;

      if (index >= 0) {
        range = {
          start: index,
          end: index + q.length
        };
      }
    }

    if (!range) {
      return {
        before: source.slice(0, 180),
        hit: "",
        after: source.length > 180 ? "…" : ""
      };
    }

    const padding = 72;
    const start = Math.max(0, range.start - padding);
    const end = Math.min(source.length, range.end + padding);

    return {
      before: (start > 0 ? "…" : "") + source.slice(start, range.start),
      hit: source.slice(range.start, range.end),
      after: source.slice(range.end, end) + (end < source.length ? "…" : "")
    };
  }

  function clearOriginalSearchMarks() {
    document
      .querySelectorAll("mark.session-search-hit")
      .forEach((mark) => {
        mark.replaceWith(document.createTextNode(mark.textContent || ""));
      });

    document
      .querySelectorAll(".session-search-target")
      .forEach((node) => {
        node.classList.remove("session-search-target");
      });
  }

  function markTextInElement(root, matchedText) {
    const needle = String(matchedText || "").trim();
    if (!root || !needle) return false;

    const lowerNeedle = needle.toLocaleLowerCase();
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;

        if (
          !parent ||
          !node.nodeValue ||
          !node.nodeValue.trim() ||
          parent.closest(
            ".message-meta, .voice-region, button, mark.session-search-hit"
          )
        ) {
          return NodeFilter.FILTER_REJECT;
        }

        return NodeFilter.FILTER_ACCEPT;
      }
    });

    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    for (const node of nodes) {
      const value = node.nodeValue;
      const index = value.toLocaleLowerCase().indexOf(lowerNeedle);

      if (index < 0) continue;

      const holder = document.createDocumentFragment();

      if (index > 0) {
        holder.appendChild(
          document.createTextNode(value.slice(0, index))
        );
      }

      const mark = document.createElement("mark");
      mark.className = "session-search-hit";
      mark.textContent = value.slice(index, index + needle.length);
      holder.appendChild(mark);

      if (index + needle.length < value.length) {
        holder.appendChild(
          document.createTextNode(
            value.slice(index + needle.length)
          )
        );
      }

      node.replaceWith(holder);
      return true;
    }

    return false;
  }

  function initializeHistoryUI({ history, search, getSourceLanguage }) {
    const openButton = document.getElementById("learningSearchButton");
    const panel = document.getElementById("learningHistoryPanel");
    const closeButton = document.getElementById("learningHistoryCloseButton");
    const input = document.getElementById("learningHistorySearchInput");
    const results = document.getElementById("learningHistoryResults");
    const review = document.getElementById("learningReview");
    const title = document.getElementById("learningHistoryTitle");
    const fieldLabel = panel
      ? panel.querySelector(".learning-history-search-field .sr-only")
      : null;

    if (!openButton || !panel || !closeButton || !input || !results) {
      return;
    }

    if (title) {
      title.textContent = "Search";
    }

    if (fieldLabel) {
      fieldLabel.textContent = "Searching within this conversation only";
    }

    input.placeholder = "Search words or phrases...";
    openButton.title = "Search";

    if (review) {
      review.hidden = true;
      review.innerHTML = "";
    }

    const state = {
      query: "",
      resultsScrollTop: 0,
      hasSearched: false
    };

    function renderResult(result) {
      const record = result.record;
      const field =
        record.fields[result.matchedFieldIndex] ||
        record.fields[0];

      const snippet = makeSnippet(
        field ? field.text : "",
        result.range,
        state.query
      );

      const button = document.createElement("button");
      button.type = "button";
      button.className = "learning-history-result session-search-result";

      const role = document.createElement("small");
      role.className = "session-search-result-role";
      role.textContent =
        field && field.role === "user"
          ? "You"
          : "BCL";

      const excerpt = document.createElement("span");
      excerpt.className = "session-search-result-snippet";
      excerpt.innerHTML =
        escapeHtml(snippet.before) +
        (
          snippet.hit
            ? "<mark>" + escapeHtml(snippet.hit) + "</mark>"
            : ""
        ) +
        escapeHtml(snippet.after);

      const meta = document.createElement("small");
      meta.className = "session-search-match-kind";
      meta.textContent =
        result.kind === "phrase"
          ? "Phrase match"
          : result.kind === "prefix"
            ? "Prefix match"
            : result.kind === "substring"
              ? "Partial match"
              : result.kind === "fuzzy"
                ? "Close spelling"
                : result.kind === "multi-term" ||
                  result.kind === "multi-term-cross-message"
                  ? "Multi-word match"
                  : "Match";

      button.append(role, excerpt, meta);

      button.addEventListener("click", () => {
        state.resultsScrollTop = results.scrollTop;
        panel.hidden = true;

        clearOriginalSearchMarks();

        const target =
          (field && field.element) ||
          record.elements[0];

        if (!target) return;

        record.elements.forEach((element) => {
          element.classList.add("session-search-target");
        });

        if (snippet.hit) {
          markTextInElement(target, snippet.hit);
        }

        target.scrollIntoView({
          behavior: "smooth",
          block: "center"
        });

        window.setTimeout(() => {
          record.elements.forEach((element) => {
            element.classList.remove("session-search-target");
          });
        }, 2600);
      });

      return button;
    }

    function renderResults() {
      const records = buildSessionRecords();
      state.query = input.value;
      state.hasSearched = Boolean(state.query.trim());

      results.innerHTML = "";

      if (!state.hasSearched) {
        const hint = document.createElement("p");
        hint.className = "learning-history-empty session-search-hint";
        hint.textContent =
          "Type a word or phrase. Results appear as you type.";
        results.appendChild(hint);
        return;
      }

      const found = search.search(records, state.query);

      if (found.length === 0) {
        const empty = document.createElement("p");
        empty.className = "learning-history-empty";
        empty.textContent = "No match in this learning session.";
        results.appendChild(empty);
        return;
      }

      for (const result of found) {
        results.appendChild(renderResult(result));
      }
    }

    function open() {
      panel.hidden = false;

      // Deliberately preserve query + result state while the page/session remains open.
      if (input.value !== state.query) {
        input.value = state.query;
      }

      renderResults();

      window.requestAnimationFrame(() => {
        results.scrollTop = state.resultsScrollTop;
        input.focus();
        input.setSelectionRange(
          input.value.length,
          input.value.length
        );
      });
    }

    function close() {
      state.query = input.value;
      state.resultsScrollTop = results.scrollTop;
      panel.hidden = true;
    }

    openButton.addEventListener("click", open);
    closeButton.addEventListener("click", close);

    panel.addEventListener("click", (event) => {
      if (event.target === panel) close();
    });

    input.addEventListener("input", () => {
      state.resultsScrollTop = 0;
      renderResults();
    });

    input.addEventListener("search", () => {
      state.resultsScrollTop = 0;
      renderResults();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !panel.hidden) {
        close();
      }
    });
  }

  window.BCLLearningReviewController = {
    enhanceTeachingCard,
    initializeHistoryUI
  };

  document.addEventListener(
    "DOMContentLoaded",
    enhanceExistingTeachingCards
  );
})();
