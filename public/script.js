// ================================================================
//  DahiyaAI — JavaScript
//  Contains: Claude API helper, panel nav, toast, copy util,
//             Chat, Writing Assistant, Image Analyzer, Summarizer,
//             creative transitions, parallax & ripple interactions.
// ================================================================

// ── API call ──
async function callClaude(messages, system = '') {

    const response = await fetch("/chat", {

        method: "POST",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify({

            messages: [

                ...(system
                    ? [{ role: "system", content: system }]
                    : []),

                ...messages

            ]

        })

    });

    const data = await response.json();

    return data.reply;

}

// ── Panel nav ──
function switchPanel(id, el) {
  document.querySelectorAll('.tool-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('panel-' + id).classList.add('active');
  el.classList.add('active');
}

// ── Toast ──
let toastTimer;
function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'show ' + type;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.className = '', 2500);
}

// ── Copy ──
function copyResult(id) {
  const el = document.getElementById(id);
  const text = el.innerText || el.textContent;
  if (!text.trim() || el.querySelector('.result-placeholder, .analysis-placeholder')) {
    showToast('Nothing to copy', 'warn'); return;
  }
  navigator.clipboard.writeText(text).then(() => showToast('Copied!', 'success'));
}

// ════════════════════════════════════
// CHAT
// ════════════════════════════════════
const chatHistory = [];

let codeBlockIndex = 0;

function renderMarkdown(text) {
  // Handle fenced code blocks with language label, copy & preview buttons
  text = text.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    const idx = codeBlockIndex++;
    const isHtml = lang === 'html' || (!lang && code.trim().startsWith('<'));
    const label = lang || 'code';
    const escapedCode = code.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const previewBtn = isHtml
      ? `<button onclick="previewCode(${idx})" style="background:#1A56DB;color:white;border:none;padding:4px 10px;border-radius:5px;font-size:12px;cursor:pointer;font-family:inherit;">▶ Preview</button>`
      : '';
    return `<div style="margin:10px 0;border-radius:8px;overflow:hidden;border:1px solid #2d3748;">
      <div style="background:#1a2540;padding:7px 12px;display:flex;align-items:center;justify-content:space-between;">
        <span style="color:#718096;font-size:12px;font-family:monospace;">${label}</span>
        <div style="display:flex;gap:6px;align-items:center;">
          ${previewBtn}
          <button onclick="copyCode(this)" data-code="${encodeURIComponent(code)}" style="background:rgba(255,255,255,.1);color:#a0aec0;border:none;padding:4px 10px;border-radius:5px;font-size:12px;cursor:pointer;font-family:inherit;">Copy</button>
        </div>
      </div>
      <pre id="codeblock-${idx}" style="background:#0d1117;color:#e2e8f0;padding:14px;overflow-x:auto;margin:0;font-size:13px;line-height:1.6;"><code>${escapedCode}</code></pre>
    </div>`;
  });

  return text
    .replace(/`([^`]+)`/g, '<code style="background:rgba(0,0,0,.08);padding:1px 5px;border-radius:4px;font-family:monospace;font-size:13px;">$1</code>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^### (.+)$/gm, '<h4 style="font-size:14px;font-weight:700;margin:10px 0 4px">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 style="font-size:15px;font-weight:700;margin:10px 0 4px">$1</h3>')
    .replace(/^- (.+)$/gm, '<li style="margin-bottom:3px;">$1</li>')
    .replace(/(<li[\s\S]*?<\/li>\n?)+/g, m => `<ul style="padding-left:18px;margin:6px 0;">${m}</ul>`)
    .replace(/\n{2,}/g, '</p><p style="margin-bottom:8px;">')
    .replace(/\n/g, '<br>');
}

function copyCode(btn) {
  const code = decodeURIComponent(btn.dataset.code);
  navigator.clipboard.writeText(code).then(() => {
    btn.textContent = 'Copied!';
    setTimeout(() => btn.textContent = 'Copy', 1800);
  });
}

function previewCode(idx) {
  const pre = document.getElementById('codeblock-' + idx);
  if (!pre) return;
  const raw = pre.innerText;
  const win = window.open('', '_blank');
  win.document.open();
  win.document.write(raw);
  win.document.close();
}

function appendMsg(role, text) {
  const welcome = document.getElementById('chat-welcome');
  if (welcome) welcome.remove();

  const wrap = document.getElementById('chat-messages');
  const div = document.createElement('div');
  div.className = 'msg ' + role;

  const avatar = document.createElement('div');
  avatar.className = 'msg-avatar';
  avatar.textContent = role === 'user' ? 'Y' : 'AI';

  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';
  bubble.innerHTML = '<p>' + renderMarkdown(text) + '</p>';

  div.appendChild(avatar);
  div.appendChild(bubble);
  wrap.appendChild(div);
  wrap.scrollTop = wrap.scrollHeight;
  return bubble;
}

function showTyping() {
  const wrap = document.getElementById('chat-messages');
  const div = document.createElement('div');
  div.className = 'msg assistant';
  div.id = 'typing-msg';
  div.innerHTML = `
    <div class="msg-avatar">AI</div>
    <div class="msg-bubble">
      <div class="typing-indicator"><span></span><span></span><span></span></div>
    </div>`;
  wrap.appendChild(div);
  wrap.scrollTop = wrap.scrollHeight;
}

function removeTyping() {
  const el = document.getElementById('typing-msg');
  if (el) el.remove();
}

async function sendChat() {
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text) return;

  const btn = document.getElementById('send-btn');
  btn.disabled = true;
  input.value = '';
  input.style.height = '48px';

  appendMsg('user', text);
  chatHistory.push({ role: 'user', content: text });
  showTyping();

  try {
    const CHAT_SYSTEM = `You are DahiyaAI, a highly capable AI assistant and expert full-stack developer. You help with anything — questions, analysis, writing, and especially CODE and WEBSITE CREATION.

CRITICAL RULES FOR CODE/WEBSITE REQUESTS:
- When asked to build a website, app, landing page, shopping site, portfolio, dashboard, or ANY HTML/CSS/JS project — ALWAYS output the FULL, COMPLETE, working code. Never truncate, abbreviate, or say "add the rest yourself".
- Output a complete single-file HTML with all CSS and JavaScript inline unless told otherwise.
- Use modern, polished design with real, meaningful content (not "Lorem ipsum" placeholders).
- Include every feature the user asks for. Shopping site = product grid, cart, navigation bar, hero section, footer, etc.
- Always wrap code in proper markdown fences like: \`\`\`html ... \`\`\`
- After the code block, briefly list what was built and key features.

For all other questions: be clear, thorough, and accurate.`;
    const reply = await askAI(text);
    removeTyping();
    appendMsg('assistant', reply);
    chatHistory.push({ role: 'assistant', content: reply });
  } catch (e) {
    removeTyping();
    appendMsg('assistant', '⚠️ Something went wrong. Please try again.');
    chatHistory.pop();
  }
  btn.disabled = false;
}
async function writerAI(prompt) {

    const response = await fetch("/writer", {

        method: "POST",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify({
            prompt: prompt
        })

    });

    const data = await response.json();

    return data.reply;
}
async function askAI() {

    const response = await fetch("/chat", {

        method: "POST",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify({
            messages: chatHistory
        })

    });

    const data = await response.json();

    return data.reply;
}

function sendSuggestion(text) {
  document.getElementById('chat-input').value = text;
  sendChat();
}

function clearChat() {
  chatHistory.length = 0;
  const wrap = document.getElementById('chat-messages');
  wrap.innerHTML = `
    <div class="chat-welcome" id="chat-welcome">
      <div class="wi">💬</div>
      <h3>Start a conversation</h3>
      <p>Ask a question, get an explanation, brainstorm ideas, or request help with any task.</p>
      <div class="chat-suggestions">
        <div class="suggestion-chip" onclick="sendSuggestion('Create a modern shopping website with product cards, cart, and checkout section')">🛒 Shopping website</div>
        <div class="suggestion-chip" onclick="sendSuggestion('Build a responsive portfolio website for a web developer')">💼 Portfolio site</div>
        <div class="suggestion-chip" onclick="sendSuggestion('Create a landing page for a SaaS product with hero, features, pricing, and CTA')">🚀 SaaS landing page</div>
        <div class="suggestion-chip" onclick="sendSuggestion('Explain machine learning in simple terms')">🤖 Explain ML</div>
      </div>
    </div>`;
}

// Auto-resize textarea
document.getElementById('chat-input').addEventListener('input', function () {
  this.style.height = 'auto';
  this.style.height = Math.min(this.scrollHeight, 140) + 'px';
});
document.getElementById('chat-input').addEventListener('keydown', function (e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); }
});

// ════════════════════════════════════
// WRITING ASSISTANT
// ════════════════════════════════════
let selectedTone = 'Professional';

function selectTone(el) {
  document.querySelectorAll('.tone-opt').forEach(e => e.classList.remove('selected'));
  el.classList.add('selected');
  selectedTone = el.textContent.trim();
}

async function runWriter() {
  const task = document.getElementById('write-task').value;
  const prompt = document.getElementById('write-prompt').value.trim();
  const text = document.getElementById('write-text').value.trim();
  const length = document.getElementById('write-length').value;
  const btn = document.getElementById('write-btn');
  const result = document.getElementById('write-result');

  if (!prompt && !text) { showToast('Please enter a prompt or text', 'warn'); return; }

  const lengthMap = { short: '1–2 paragraphs', medium: '3–5 paragraphs', long: '6 or more paragraphs' };
  const taskMap = {
    write: 'Write the following from scratch',
    improve: 'Improve the writing quality of',
    expand: 'Expand and add more detail to',
    shorten: 'Shorten and condense',
    translate_formal: 'Rewrite in a more formal tone',
    translate_casual: 'Rewrite in a more casual, friendly tone',
    bullets: 'Convert into a well-structured bullet point list',
    email: 'Rewrite as a professional email',
  };

  let userMsg = `${taskMap[task]}${prompt ? ': ' + prompt : ' the following text'}.`;
  if (text) userMsg += `\n\nText: """${text}"""`;
  userMsg += `\n\nTone: ${selectedTone}. Length: ${lengthMap[length]}. Output only the final text, no preamble.`;

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Generating…';
  result.innerHTML = '<div class="result-placeholder"><span class="spinner dark"></span></div>';

  try {
    const out = await writerAI(userMsg);
    result.textContent = out;
    document.getElementById('write-wc').textContent = out.split(/\s+/).filter(Boolean).length + ' words';
  } catch (e) {
    result.textContent = '⚠️ Error: could not generate. Please try again.';
  }

  btn.disabled = false;
  btn.innerHTML = '<svg viewBox="0 0 24 24" fill="white" width="15" height="15"><path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/></svg> Generate';
}

function clearWriter() {
  document.getElementById('write-prompt').value = '';
  document.getElementById('write-text').value = '';
  document.getElementById('write-result').innerHTML = '<div class="result-placeholder"><svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor"><path d="M14 17H4v2h10v-2zm6-8H4v2h16V9zM4 15h16v-2H4v2zM4 5v2h16V5H4z"/></svg> Your generated text will appear here.</div>';
  document.getElementById('write-wc').textContent = '';
}

// ════════════════════════════════════
// IMAGE ANALYZER
// ════════════════════════════════════
let imageBase64 = null;
let analysisType = 'describe';

function handleDragOver(e) {
  e.preventDefault();
  document.getElementById('drop-zone').classList.add('drag-over');
}
async function imageAI(image, prompt) {

    const response = await fetch("/image", {

        method: "POST",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify({
            image,
            prompt
        })

    });

    const data = await response.json();

    return data.reply;
}

function handleDrop(e) {
  e.preventDefault();
  document.getElementById('drop-zone').classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) loadImage(file);
}

function handleFileSelect(e) {
  const file = e.target.files[0];
  if (file) loadImage(file);
}

function loadImage(file) {
  const reader = new FileReader();
  reader.onload = function (ev) {
    const data = ev.target.result;
    imageBase64 = data;
    document.getElementById('image-preview').src = data;
    document.getElementById('image-preview-wrap').style.display = 'block';
    document.getElementById('drop-zone').style.display = 'none';
    document.getElementById('analyze-btn').disabled = false;
  };
  reader.readAsDataURL(file);
}

function selectAnalysisType(el, type) {
  document.querySelectorAll('.analysis-type-btn').forEach(b => b.classList.remove('selected'));
  el.classList.add('selected');
  analysisType = type;
  document.getElementById('custom-question-wrap').style.display = type === 'custom' ? 'block' : 'none';
}

async function analyzeImage() {
  if (!imageBase64) return;
  const btn = document.getElementById('analyze-btn');
  const output = document.getElementById('analysis-output');

  const prompts = {
    describe: 'Describe this image in detail. Cover the main subjects, setting, colors, mood, and any notable elements.',
    extract_text: 'Extract and transcribe all text visible in this image. Format it clearly and preserve any structure.',
    sentiment: 'Analyze the mood, tone, and emotional sentiment of this image. What feelings does it evoke and why?',
    technical: 'Provide a technical analysis: composition, lighting, color palette, depth of field, image quality, and any technical observations.',
    accessibility: 'Write an accessibility description (alt text) for this image as if describing it to someone who cannot see it. Be thorough and objective.',
    custom: document.getElementById('custom-question').value.trim() || 'What do you see in this image?',
  };

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Analyzing…';
  output.innerHTML = '<span class="analysis-placeholder">Analyzing image…</span>';

  try {
    const result = await imageAI(
      imageBase64,
      prompts[analysisType]
    );

    output.textContent = result;
  } catch (e) {
    output.textContent = '⚠️ Analysis failed. Please try again.';
  }

  btn.disabled = false;
  btn.textContent = 'Analyze Image';
}

function clearImage() {
  imageBase64 = null;
  document.getElementById('image-preview-wrap').style.display = 'none';
  document.getElementById('drop-zone').style.display = '';
  document.getElementById('file-input').value = '';
  document.getElementById('analyze-btn').disabled = true;
  document.getElementById('analysis-output').innerHTML = '<span class="analysis-placeholder">Upload an image and select an analysis type to get started.</span>';
}

// ════════════════════════════════════
// SUMMARIZER
// ════════════════════════════════════
let sumStyle = 'Executive brief';

function selectSumStyle(el) {
  document.querySelectorAll('#panel-summarize .tone-opt').forEach(e => e.classList.remove('selected'));
  el.classList.add('selected');
  sumStyle = el.textContent.trim().replace(/^[^\w]+/, '');
}

document.getElementById('sum-text').addEventListener('input', function () {
  const wc = this.value.trim().split(/\s+/).filter(Boolean).length;
  document.getElementById('sum-wc').textContent = wc ? wc + ' words' : '';
});

async function runSummarizer() {
  const text = document.getElementById('sum-text').value.trim();
  const focus = document.getElementById('sum-focus').value.trim();
  const btn = document.getElementById('sum-btn');
  const result = document.getElementById('sum-result');

  if (!text) { showToast('Please paste some text to summarize', 'warn'); return; }

  const styleMap = {
    'Executive brief': 'a concise executive summary with key takeaways in 2–3 short paragraphs',
    'Key points only': 'a bulleted list of the most important key points only — be concise',
    'Detailed recap': 'a detailed, structured recap covering all major points and supporting details',
    "Q&A format": 'a Q&A format — identify the 4–6 most important questions about this text and answer them clearly',
  };

  let prompt = `Summarize the following text as ${styleMap[sumStyle] || 'an executive summary'}.`;
  if (focus) prompt += ` Focus especially on: ${focus}.`;
  prompt += `\n\nText:\n"""\n${text}\n"""`;

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Summarizing…';
  result.innerHTML = '<div class="result-placeholder"><span class="spinner dark"></span></div>';

  try {
    const out = await callClaude([{ role: 'user', content: prompt }],
      'You are an expert at reading and summarizing complex content. Be accurate and concise. Output only the summary.');
    result.textContent = out;
  } catch (e) {
    result.textContent = '⚠️ Error summarizing. Please try again.';
  }

  btn.disabled = false;
  btn.textContent = 'Summarize';
}

function clearSummarizer() {
  document.getElementById('sum-text').value = '';
  document.getElementById('sum-focus').value = '';
  document.getElementById('sum-wc').textContent = '';
  document.getElementById('sum-result').innerHTML = '<div class="result-placeholder"><svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor"><path d="M14 17H4v2h10v-2zm6-8H4v2h16V9zM4 15h16v-2H4v2zM4 5v2h16V5H4z"/></svg> Your summary will appear here.</div>';
}

// ════════════════════════════════════
// CREATIVE TRANSITIONS WIRING
// ════════════════════════════════════
(function () {
  const LABELS = {
    'panel-chat':      ['Channeling thought', 'DahiyaAI is composing a reply'],
    'panel-write':     ['Crafting your words', 'Shaping tone, rhythm and flow'],
    'panel-image':     ['Reading your image', 'Decoding pixels, light & meaning'],
    'panel-summarize': ['Distilling the essence', 'Surfacing the most important ideas'],
  };

  document.querySelectorAll('.tool-panel').forEach(panel => {
    const [title, sub] = LABELS[panel.id] || ['Working on it', 'Just a moment'];
    const ov = document.createElement('div');
    ov.className = 'task-overlay';
    ov.innerHTML = `
      <div class="task-core">
        <div class="task-orb"></div>
        <div class="task-label">${title}…</div>
        <div class="task-sub">${sub}</div>
        <div class="task-dots"><span></span><span></span><span></span></div>
      </div>`;
    panel.appendChild(ov);
  });

  window.__showTask = function (panelId) {
    const p = document.getElementById(panelId);
    const ov = p && p.querySelector('.task-overlay');
    if (ov) ov.classList.add('show');
  };
  window.__hideTask = function (panelId) {
    const p = document.getElementById(panelId);
    const ov = p && p.querySelector('.task-overlay');
    if (ov) ov.classList.remove('show');
  };

  const _switch = window.switchPanel;
  window.switchPanel = function (id, el) {
    if (el) {
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('activating'));
      el.classList.add('activating');
      setTimeout(() => el.classList.remove('activating'), 700);
    }
    _switch(id, el);
  };

  function wrap(fnName, panelId) {
    const orig = window[fnName];
    if (typeof orig !== 'function') return;
    window[fnName] = async function (...args) {
      window.__showTask(panelId);
      try { return await orig.apply(this, args); }
      finally { setTimeout(() => window.__hideTask(panelId), 350); }
    };
  }
  wrap('runWriter',     'panel-write');
  wrap('runSummarizer', 'panel-summarize');
  wrap('analyzeImage',  'panel-image');

  const sendBtn = document.getElementById('send-btn');
  const flashSend = () => {
    if (!sendBtn) return;
    sendBtn.classList.remove('launching');
    void sendBtn.offsetWidth;
    sendBtn.classList.add('launching');
  };
  if (sendBtn) sendBtn.addEventListener('click', flashSend);
  const chatInput = document.getElementById('chat-input');
  if (chatInput) {
    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey && chatInput.value.trim()) flashSend();
    });
  }

  document.querySelectorAll('.action-btn.primary').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.classList.remove('firing');
      void btn.offsetWidth;
      btn.classList.add('firing');
      setTimeout(() => btn.classList.remove('firing'), 720);
    });
  });
})();


/* ============================================================
   SECOND SCRIPT BLOCK — Parallax, Ripple & Micro-interactions
   ============================================================ */


(function(){
  const scene  = document.querySelector('.jungle-scene');
  const layers = scene ? scene.querySelectorAll('.layer') : [];
  const sun    = scene ? scene.querySelector('.sun') : null;

  // Smooth pointer lerp (lower = silkier)
  const EASE = 0.045;
  let tx=0, ty=0, cx=0, cy=0;

  const onMove = (x,y) => {
    const w = window.innerWidth, h = window.innerHeight;
    tx = (x / w - .5);
    ty = (y / h - .5);
  };
  window.addEventListener('mousemove', e => onMove(e.clientX, e.clientY), {passive:true});
  window.addEventListener('touchmove', e => {
    if (e.touches[0]) onMove(e.touches[0].clientX, e.touches[0].clientY);
  }, {passive:true});

  function tick(){
    cx += (tx - cx) * EASE;
    cy += (ty - cy) * EASE;
    layers.forEach(l => {
      const d = parseFloat(l.dataset.depth || '0.1');
      const x = -cx * 50 * d;
      const y = -cy * 32 * d;
      l.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) scale(${1 + d*0.04})`;
    });
    if (sun) sun.style.transform = `translate3d(${(-cx*18).toFixed(2)}px, ${(-cy*12).toFixed(2)}px, 0)`;
    requestAnimationFrame(tick);
  }
  tick();

  // Smoother 3D tilt on active panel — eased toward target
  document.querySelectorAll('.tool-panel').forEach(panel => {
    let targetX=0, targetY=0, curX=0, curY=0, raf=null, hovering=false;
    const loop = () => {
      curX += (targetX - curX) * 0.12;
      curY += (targetY - curY) * 0.12;
      panel.style.transform = `perspective(1600px) rotateX(${curY.toFixed(2)}deg) rotateY(${curX.toFixed(2)}deg) translateZ(0)`;
      if (hovering || Math.abs(targetX-curX) > 0.05 || Math.abs(targetY-curY) > 0.05) {
        raf = requestAnimationFrame(loop);
      } else { raf = null; }
    };
    const start = () => { if (!raf) raf = requestAnimationFrame(loop); };

    panel.addEventListener('mouseenter', () => { hovering = true; start(); });
    panel.addEventListener('mousemove', (e) => {
      const r = panel.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - .5;
      const py = (e.clientY - r.top) / r.height - .5;
      targetX = px * 1.8;        // gentler tilt
      targetY = -py * 1.6;
      start();
    });
    panel.addEventListener('mouseleave', () => {
      hovering = false; targetX = 0; targetY = 0; start();
    });
  });

  // Auto-grow chat textarea smoothly
  const ta = document.getElementById('chat-input');
  if (ta) {
    ta.style.transition = 'height .18s ease';
    const grow = () => { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 180) + 'px'; };
    ta.addEventListener('input', grow);
    grow();
  }

  // Ripple on primary buttons
  document.querySelectorAll('.action-btn.primary, .send-btn, .suggestion-chip, .nav-item, .tone-opt, .analysis-type-btn').forEach(btn => {
    btn.addEventListener('pointerdown', (e) => {
      const r = btn.getBoundingClientRect();
      const ripple = document.createElement('span');
      ripple.className = 'mj-ripple';
      const size = Math.max(r.width, r.height);
      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = (e.clientX - r.left - size/2) + 'px';
      ripple.style.top  = (e.clientY - r.top  - size/2) + 'px';
      btn.appendChild(ripple);
      setTimeout(() => ripple.remove(), 650);
    });
  });

  // Reveal-on-scroll for chat messages (works when new messages append)
  const mo = new MutationObserver(muts => {
    muts.forEach(m => m.addedNodes.forEach(n => {
      if (n.nodeType === 1) n.classList.add('mj-rise');
    }));
  });
  const cm = document.getElementById('chat-messages');
  if (cm) mo.observe(cm, { childList: true });
})();