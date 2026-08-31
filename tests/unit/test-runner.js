"use strict";

(function () {
  const output = document.getElementById("results");
  const summary = document.getElementById("summary");
  const results = [];

  function assertEqual(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
  }

  function assert(condition, message) {
    if (!condition) {
      throw new Error(message);
    }
  }

  function test(name, fn) {
    try {
      fn();
      results.push({ name, ok: true });
    } catch (error) {
      results.push({
        name,
        ok: false,
        error: error && error.message ? error.message : String(error)
      });
    }
  }

  function dispatch(input) {
    return window.BCLDispatcher.dispatchRuntime({
      rawInput: input,
      normalizedInput: input,
      runtime: null,
      trigger: null,
      phase: "normalized"
    });
  }

  function voicePipeline(rawTranscript) {
    const cleaned = window.BCLSpeechCleanup.cleanTranscript(rawTranscript);
    return {
      cleaned,
      dispatched: dispatch(cleaned)
    };
  }

  test("Dispatcher: t + space -> Teaching", function () {
    const result = dispatch("t give up vs give in");
    assertEqual(result.runtime, "teaching", "runtime");
    assertEqual(result.normalizedInput, "give up vs give in", "normalizedInput");
  });

  test("Dispatcher: t + comma -> Teaching", function () {
    const result = dispatch("t, give up vs give in");
    assertEqual(result.runtime, "teaching", "runtime");
    assertEqual(result.normalizedInput, "give up vs give in", "normalizedInput");
  });

  test("Dispatcher: 請教 -> Teaching", function () {
    const result = dispatch("請教 slog 和 hard 的區別");
    assertEqual(result.runtime, "teaching", "runtime");
    assertEqual(result.normalizedInput, "slog 和 hard 的區別", "normalizedInput");
  });

  test("Dispatcher: 请教 without separator -> Teaching", function () {
    const result = dispatch("请教slog和hard的区别");
    assertEqual(result.runtime, "teaching", "runtime");
    assertEqual(result.normalizedInput, "slog和hard的区别", "normalizedInput");
  });

  test("Dispatcher: today stays Conversation", function () {
    const result = dispatch("today is a hard day");
    assertEqual(result.runtime, "conversation", "runtime");
  });

  test("Speech cleanup: trims and collapses whitespace", function () {
    const actual = window.BCLSpeechCleanup.cleanTranscript("  hello   world \n  today  ");
    assertEqual(actual, "hello world today", "cleaned transcript");
  });

  test("Speech cleanup: non-string -> empty string", function () {
    assertEqual(window.BCLSpeechCleanup.cleanTranscript(null), "", "null cleanup");
  });

  test("Response parser: structured Conversation response", function () {
    const parsed = window.BCLResponseParser.parseGatewayResponse({
      structuredResponse: {
        mode: "conversation",
        displayContent: "Hello.",
        speechSegments: [
          { type: "response", text: " Hello. " }
        ]
      }
    }, "conversation");

    assertEqual(parsed.mode, "conversation", "mode");
    assertEqual(parsed.displayContent, "Hello.", "displayContent");
    assertEqual(parsed.speechSegments.length, 1, "speechSegments length");
    assertEqual(parsed.speechSegments[0].text, "Hello.", "speech text trim");
  });

  test("Response parser: filters invalid speech segment types", function () {
    const parsed = window.BCLResponseParser.parseGatewayResponse({
      structuredResponse: {
        mode: "teaching",
        displayContent: "Lesson",
        speechSegments: [
          { type: "word", text: "slog" },
          { type: "source-language-explanation", text: "不要朗讀" },
          { type: "phrase", text: "a real slog" }
        ]
      }
    }, "teaching");

    assertEqual(parsed.speechSegments.length, 2, "valid speech segment count");
    assertEqual(parsed.speechSegments[0].type, "word", "first segment");
    assertEqual(parsed.speechSegments[1].type, "phrase", "second segment");
  });

  test("Response parser: content fallback", function () {
    const parsed = window.BCLResponseParser.parseGatewayResponse({
      content: "Fallback content"
    }, "conversation");

    assertEqual(parsed.displayContent, "Fallback content", "fallback content");
    assertEqual(parsed.speechSegments.length, 0, "fallback speechSegments");
  });

  test("Response parser: mismatched structured mode falls back to content", function () {
    const parsed = window.BCLResponseParser.parseGatewayResponse({
      content: "Safe fallback",
      structuredResponse: {
        mode: "teaching",
        displayContent: "Wrong mode",
        speechSegments: []
      }
    }, "conversation");

    assertEqual(parsed.displayContent, "Safe fallback", "mode mismatch fallback");
  });

  test("Response parser: missing content throws", function () {
    let threw = false;
    try {
      window.BCLResponseParser.parseGatewayResponse({}, "conversation");
    } catch (error) {
      threw = true;
    }
    assert(threw, "Expected parser to throw");
  });

  test("Integration: Text -> Conversation", function () {
    const result = dispatch("I had a long day at work.");
    assertEqual(result.runtime, "conversation", "runtime");
    assertEqual(result.normalizedInput, "I had a long day at work.", "normalizedInput");
  });

  test("Integration: Text -> Teaching", function () {
    const result = dispatch("T：explain give up");
    assertEqual(result.runtime, "teaching", "runtime");
    assertEqual(result.normalizedInput, "explain give up", "normalizedInput");
  });

  test("Integration: Voice transcript -> Conversation", function () {
    const flow = voicePipeline("  today   was hard  ");
    assertEqual(flow.cleaned, "today was hard", "cleaned transcript");
    assertEqual(flow.dispatched.runtime, "conversation", "runtime");
  });

  test("Integration: Voice transcript -> Teaching", function () {
    const flow = voicePipeline("  请教，  slog 和 hard 有什么区别  ");
    assertEqual(flow.cleaned, "请教， slog 和 hard 有什么区别", "cleaned transcript");
    assertEqual(flow.dispatched.runtime, "teaching", "runtime");
    assertEqual(flow.dispatched.normalizedInput, "slog 和 hard 有什么区别", "normalizedInput");
  });

  test("Integration: C -> T -> C continuity", function () {
    const first = dispatch("today is a hard day");
    const second = dispatch("請教 hard 和 difficult 的區別");
    const third = dispatch("I still want to talk about today.");

    assertEqual(first.runtime, "conversation", "first runtime");
    assertEqual(second.runtime, "teaching", "second runtime");
    assertEqual(third.runtime, "conversation", "third runtime");
  });

  test("Integration: mixed Chinese-English input remains intact", function () {
    const flow = voicePipeline("  今天真的 very hard，but I finished it.  ");
    assertEqual(flow.cleaned, "今天真的 very hard，but I finished it.", "cleaned transcript");
    assertEqual(flow.dispatched.runtime, "conversation", "runtime");
    assertEqual(flow.dispatched.normalizedInput, "今天真的 very hard，but I finished it.", "normalizedInput");
  });

  const passed = results.filter((r) => r.ok).length;
  const failed = results.length - passed;

  output.textContent = results.map((r) =>
    r.ok
      ? `PASS  ${r.name}`
      : `FAIL  ${r.name}\n      ${r.error}`
  ).join("\n");

  if (failed === 0) {
    summary.className = "summary pass";
    summary.textContent = `PASS — ${passed}/${results.length} tests passed.`;
  } else {
    summary.className = "summary fail";
    summary.textContent = `FAIL — ${failed} test(s) failed; ${passed}/${results.length} passed.`;
  }
})();
