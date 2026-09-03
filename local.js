/* ============================================
 * 本地 AI 深度解读引擎 local.js
 * wllama（llama.cpp WASM）+ Qwen2.5-1.5B Q4 GGUF
 * 模型与推理全部在浏览器本地（数据不出设备，无需外网）
 * 首次加载模型约 1~3 分钟，之后浏览器缓存秒开
 * ============================================ */

let wllama = null;
let wllamaReady = false;
let wllamaLoading = false;

async function initLocalModel() {
  if (wllamaReady) return true;
  if (wllamaLoading) return false;
  wllamaLoading = true;
  try {
    const { Wllama } = await import('./lib/wllama.esm.js');
    wllama = new Wllama(
      { default: './lib/wllama.wasm' },
      { suppressNativeLog: true, allowOffline: true }
    );
    // 本地兼容资源（避免回退 CDN 需要外网）
    try {
      wllama.setCompat({
        worker: './lib/wllama-compat.js',
        wasm: './lib/wllama-compat.wasm',
      });
    } catch (e) { console.warn('setCompat 跳过:', e.message); }

    await wllama.loadModelFromUrl('./local-model/qwen2.5-1.5b-instruct-q4_k_m.gguf');
    wllamaReady = true;
    console.log('✅ 本地深度解读引擎就绪（完全离线）');
    return true;
  } catch (e) {
    console.warn('本地模型加载失败，将使用云端:', e.message);
    return false;
  } finally {
    wllamaLoading = false;
  }
}

async function localAsk(system, user) {
  if (!wllamaReady || !wllama) return null;
  try {
    const prompt = (system ? system + '\n\n' : '') + user;
    const resp = await wllama.createCompletion({
      prompt,
      nPredict: 500,
      temperature: 0.75,
      top_k: 40,
      top_p: 0.9,
      repeat_penalty: 1.05,
      cachePrompt: false,
    });
    let text = resp?.text || '';
    if (text.startsWith(prompt)) text = text.slice(prompt.length);
    text = text.trim();
    return text || null;
  } catch (e) {
    console.warn('本地生成失败，回退云端:', e.message);
    return null;
  }
}

/* 本地流式生成 */
async function localAskStream(system, user, onFull){
  if(!wllamaReady || !wllama) return null;
  let full="";
  const prompt=(system?system+"\n\n":"")+user;
  await wllama.createCompletion({
    prompt, nPredict: 400, temperature: 0.75, top_k: 40, top_p: 0.9, repeat_penalty: 1.05,
    cachePrompt: false, stream: true,
    onData: (chunk)=>{
      const t = chunk?.text || "";
      if(t){ full+=t; if(onFull) onFull(full); }
    },
  });
  return full.trim() || null;
}
