/* ============================================
 * AI 解析封装 ai.js —— GitHub Pages 直连版
 * 浏览器直连 api.deepseek.com（无需服务器）
 * ============================================ */
const DS_KEY = "sk-5b471cd9a84d4671b3eb4534097c50ce";

/* 兼容旧浏览器的超时控制：返回 signal 或 undefined */
function mkSignal(timeoutMs) {
  try {
    var c = new AbortController();
    setTimeout(function () { try { c.abort(); } catch (e) {} }, timeoutMs);
    return c.signal;
  } catch (e) { return undefined; }
}

/* 基础对话：system + user，maxTokens 为输出上限 */
async function aiAsk(system, user, maxTokens) {
  const r = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": "Bearer " + DS_KEY },
    body: JSON.stringify({
      model: "deepseek-v4-flash",
      messages: [...(system ? [{ role: "system", content: system }] : []), { role: "user", content: user }],
      temperature: 0.75,
      max_tokens: maxTokens || 800,
      thinking: { type: "disabled" },
    }),
    signal: mkSignal(70000),
  });
  let j;
  try { j = await r.json(); } catch (e) { throw new Error("服务响应异常（HTTP " + r.status + "）"); }
  if (!r.ok || j.error) throw new Error(j.error?.message || ("HTTP " + r.status));
  return j.choices?.[0]?.message?.content || "";
}

/* 流式 AI：边生成边返回（SSE） */
async function aiAskStream(system, user, onDelta) {
  const r = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": "Bearer " + DS_KEY },
    body: JSON.stringify({
      model: "deepseek-v4-flash",
      messages: [...(system ? [{ role: "system", content: system }] : []), { role: "user", content: user }],
      temperature: 0.75,
      max_tokens: 800,
      stream: true,
      thinking: { type: "disabled" },
    }),
    signal: mkSignal(75000),
  });
  if (!r.ok || !r.body) {
    let j = {};
    try { j = await r.json(); } catch (e) {}
    throw new Error(j.error?.message || "请求失败");
  }
  const reader = r.body.getReader();
  const decoder = new TextDecoder();
  let full = "";
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop();
    for (const line of lines) {
      const t = line.trim();
      if (!t.startsWith("data:")) continue;
      const payload = t.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      let j;
      try { j = JSON.parse(payload); } catch (e) { continue; }
      if (j.error) throw new Error(j.error.message || j.error);
      const delta = j.choices?.[0]?.delta?.content || "";
      if (delta) {
        full += delta;
        if (onDelta) onDelta(delta, full);
      }
    }
  }
  return full;
}

/* 加载动画 */
function showLoading(el, text) {
  el.innerHTML = `
    <div style="text-align:center;padding:26px 10px">
      <div style="font-size:38px;animation:spin 2.4s linear infinite;display:inline-block">☯</div>
      <p style="margin-top:12px;color:var(--ink-soft);font-size:14.5px;letter-spacing:1px">${text}</p>
      <p style="margin-top:6px;color:#a2937a;font-size:12.5px">通常 3~8 秒，请稍候…</p>
    </div>`;
}

/* 极简 markdown 渲染：**加粗** / 换行 / 数字列表 */
function mdRender(text) {
  if (!text) return "";
  let t = String(text)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
    .replace(/\*([^*]+)\*/g, "<i>$1</i>");
  const lines = t.split("\n");
  let html = "", inList = false;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { if (inList) { html += "</div>"; inList = false; } continue; }
    if (/^\d+[.、]/.test(line)) {
      if (!inList) { html += '<div style="margin:8px 0">'; inList = true; }
      html += `<div style="padding:3px 0 3px 22px;position:relative"><span style="position:absolute;left:0;color:var(--gold);font-weight:700">${line.match(/^\d+[.、]/)[0]}</span>${line.replace(/^\d+[.、]/, "")}</div>`;
    } else if (/^[-•·]/.test(line)) {
      if (!inList) { html += '<div style="margin:8px 0">'; inList = true; }
      html += `<div style="padding:3px 0 3px 18px;position:relative"><span style="position:absolute;left:2px;color:var(--gold)">·</span>${line.replace(/^[-•·]\s*/, "")}</div>`;
    } else {
      if (inList) { html += "</div>"; inList = false; }
      html += `<p style="margin:7px 0;line-height:1.95">${line}</p>`;
    }
  }
  if (inList) html += "</div>";
  return html;
}

/* 问题类型模板 */
const QUESTION_TYPES = ["感情", "事业", "财运", "学业", "健康", "决策", "其他"];
function questionTypeSelect(selected) {
  let opts = "";
  QUESTION_TYPES.forEach(q => {
    opts += `<button class="qtype ${q === selected ? "on" : ""}" data-q="${q}" onclick="selectQType(this,'${q}')">${q}</button>`;
  });
  return `<div class="qtype-wrap"><span class="qtype-lbl">所问之事：</span><div class="qtype-btns">${opts}</div></div>`;
}

/* 多轮对话：发送完整 messages 数组（带记忆） */
async function aiAskMessages(messages) {
  const r = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": "Bearer " + DS_KEY },
    body: JSON.stringify({
      model: "deepseek-v4-flash",
      messages: messages,
      temperature: 0.75,
      max_tokens: 1000,
      thinking: { type: "disabled" },
    }),
    signal: mkSignal(45000),
  });
  let j;
  try { j = await r.json(); } catch (e) { throw new Error("服务响应异常（HTTP " + r.status + "）"); }
  if (!r.ok || j.error) throw new Error(j.error?.message || ("HTTP " + r.status));
  return j.choices?.[0]?.message?.content || "";
}
