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
    const targets = items.map((item) => item.text && item.text.trim()).filter(Boolean).sort((a,b)=>b.length-a.length);
    if (targets.length === 0) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        if (parent.closest(".voice-region, .teaching-collapse-summary, mark.learning-target")) return NodeFilter.FILTER_REJECT;
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
          if (typeof fragment !== "string") { next.push(fragment); continue; }
          const lower = fragment.toLocaleLowerCase();
          const needle = target.toLocaleLowerCase();
          let start = 0;
          let index = lower.indexOf(needle, start);
          if (index < 0) { next.push(fragment); continue; }
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
        for (const fragment of fragments) holder.appendChild(typeof fragment === "string" ? document.createTextNode(fragment) : fragment);
        node.replaceWith(holder);
      }
    }
  }

  function enhanceTeachingCard(article, body, learningItems) {
    if (!article || !body) return;
    article.classList.add("message-teaching");
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
    if (meta) meta.appendChild(button);
    article.insertBefore(summary, body);
    button.addEventListener("click", () => {
      const collapsed = article.classList.toggle("is-collapsed");
      body.hidden = collapsed;
      summary.hidden = !collapsed;
      button.textContent = collapsed ? "Expand" : "Collapse";
      button.setAttribute("aria-expanded", collapsed ? "false" : "true");
    });
  }

  function initializeHistoryUI({ history, search, getSourceLanguage }) {
    const openButton = document.getElementById("learningSearchButton");
    const panel = document.getElementById("learningHistoryPanel");
    const closeButton = document.getElementById("learningHistoryCloseButton");
    const input = document.getElementById("learningHistorySearchInput");
    const results = document.getElementById("learningHistoryResults");
    const review = document.getElementById("learningReview");
    if (!openButton || !panel || !closeButton || !input || !results || !review) return;

    function escape(value) {
      return String(value || "").replace(/[&<>"']/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[char]));
    }
    function formatDate(value) {
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? "" : date.toLocaleString();
    }
    function renderReview(entry) {
      const items = (entry.learningItems || []).map((item) =>
        '<li><strong>' + escape(item.text) + '</strong>' +
        (item.translation ? '<span>' + escape(item.translation) + '</span>' : '') +
        (item.explanation ? '<small>' + escape(item.explanation) + '</small>' : '') + '</li>'
      ).join("");
      review.innerHTML =
        '<button type="button" class="learning-review-back">← Results</button>' +
        '<p class="learning-review-date">' + escape(formatDate(entry.createdAt)) + '</p>' +
        '<h3>' + escape(itemSummary(entry.learningItems)) + '</h3>' +
        (items ? '<ul class="learning-review-items">' + items + '</ul>' : '') +
        '<h4>Original Teaching</h4><div class="learning-review-content">' + escape(entry.displayContent).replace(/\n/g,"<br>") + '</div>' +
        (entry.sourceContext ? '<h4>Conversation Context</h4><div class="learning-review-context">' + escape(entry.sourceContext).replace(/\n/g,"<br>") + '</div>' : '');
      results.hidden = true;
      review.hidden = false;
      review.querySelector(".learning-review-back").addEventListener("click", () => {
        review.hidden = true;
        results.hidden = false;
        input.focus();
      });
    }
    function renderResults() {
      const found = search.search(history.getEntries(), input.value);
      review.hidden = true;
      results.hidden = false;
      results.innerHTML = "";
      if (found.length === 0) {
        results.innerHTML = '<p class="learning-history-empty">No learning history found.</p>';
        return;
      }
      for (const result of found) {
        const entry = result.entry;
        const button = document.createElement("button");
        button.type = "button";
        button.className = "learning-history-result";
        const title = document.createElement("strong");
        title.textContent = itemSummary(entry.learningItems);
        const excerpt = document.createElement("span");
        excerpt.textContent = entry.teachingInput || entry.displayContent.slice(0, 140);
        const date = document.createElement("small");
        date.textContent = formatDate(entry.createdAt);
        button.append(title, excerpt, date);
        button.addEventListener("click", () => renderReview(entry));
        results.appendChild(button);
      }
    }
    function open() {
      panel.hidden = false;
      input.value = "";
      renderResults();
      input.focus();
    }
    function close() { panel.hidden = true; }
    openButton.addEventListener("click", open);
    closeButton.addEventListener("click", close);
    panel.addEventListener("click", (event) => { if (event.target === panel) close(); });
    input.addEventListener("input", renderResults);
    document.addEventListener("keydown", (event) => { if (event.key === "Escape" && !panel.hidden) close(); });
  }

  window.BCLLearningReviewController = { enhanceTeachingCard, initializeHistoryUI };
})();
