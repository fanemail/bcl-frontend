"use strict";
(function () {
  const cache = new Map();
  let audio = null, objectUrl = "", version = 0;
  function stop() {
    version += 1;
    if (audio) { audio.pause(); audio.currentTime = 0; audio = null; }
    if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = ""; }
  }
  async function play(o) {
    stop();
    const mine = version, text = typeof o.text === "string" ? o.text.trim() : "";
    if (!o.gatewayUrl || !text) throw new Error("AI TTS request is incomplete.");
    if (o.onLoading) o.onLoading();
    try {
      let blob = cache.get(o.cacheKey);
      if (!blob) {
        const headers = {"Content-Type":"application/json"};
        if (o.accessToken) headers["X-BCL-Access-Token"] = o.accessToken;
        const r = await fetch(o.gatewayUrl.replace(/\/+$/, "") + "/tts", {
          method:"POST", headers,
          body:JSON.stringify({text, targetLanguage:o.targetLanguage})
        });
        if (!r.ok) {
          let m="AI TTS request failed.";
          try { const d=await r.json(); if(d && typeof d.error==="string") m=d.error; } catch(e) {}
          throw new Error(m);
        }
        blob=await r.blob();
        if (!blob || !blob.size) throw new Error("AI TTS returned no audio.");
        cache.set(o.cacheKey,blob);
      }
      if (mine !== version) return;
      objectUrl=URL.createObjectURL(blob); audio=new Audio(objectUrl);
      audio.addEventListener("playing",()=>{ if(mine===version && o.onPlaying) o.onPlaying(); });
      audio.addEventListener("ended",()=>{ if(mine!==version)return; audio=null; if(objectUrl){URL.revokeObjectURL(objectUrl);objectUrl="";} if(o.onEnd)o.onEnd(); });
      audio.addEventListener("error",()=>{ if(mine===version && o.onError)o.onError(new Error("Browser audio playback failed.")); });
      await audio.play();
    } catch(e) {
      if(mine!==version)return;
      audio=null; if(objectUrl){URL.revokeObjectURL(objectUrl);objectUrl="";}
      if(o.onError){o.onError(e);return;} throw e;
    }
  }
  window.BCLAITTS={play,stop};
})();
