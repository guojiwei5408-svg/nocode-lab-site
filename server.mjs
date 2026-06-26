import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL(".", import.meta.url));
const port = Number(process.env.PORT || 8126);
const dailyLimit = Number(process.env.DAILY_GENERATION_LIMIT || 3);
const rateLimit = new Map();

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
};

const safeStyles = {
  "温馨水彩": "warm watercolor, soft edges, gentle bedtime picture book, pastel colors",
  "卡通扁平": "flat cartoon illustration, simple shapes, bright but soft colors, friendly picture book",
  "童趣手绘": "childlike hand drawn illustration, crayon texture, playful lines, gentle colors",
};

const childSafetyBlockedPatterns = [
  /血腥|自杀|色情|成人|裸露|裸照/i,
];

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(body);
}

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded) return forwarded.split(",")[0].trim();
  return req.socket.remoteAddress || "local";
}

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function checkRateLimit(ip) {
  const key = `${getTodayKey()}:${ip}`;
  const count = rateLimit.get(key) || 0;
  if (count >= dailyLimit) return false;
  rateLimit.set(key, count + 1);
  return true;
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 20_000) {
        reject(new Error("body_too_large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(body || "{}"));
      } catch {
        reject(new Error("bad_json"));
      }
    });
    req.on("error", reject);
  });
}

function validateInput(input) {
  const storyIdea = String(input.storyIdea || "").trim();
  const childName = String(input.childName || "").trim();
  const artStyle = String(input.artStyle || "温馨水彩").trim();

  if (!storyIdea) return { error: "先写一句故事想法。" };
  if (!childName) return { error: "给主角填一个昵称或小名。" };
  if (storyIdea.length > 200) return { error: "故事想法控制在 200 字以内。" };
  if (childName.length > 12) return { error: "昵称短一点，12 个字以内。" };
  if (!safeStyles[artStyle]) return { error: "画风选项不正确。" };

  if (childSafetyBlockedPatterns.some((pattern) => pattern.test(storyIdea))) {
    return { error: "这个主题不适合做儿童睡前绘本，换一个温和的小故事吧。" };
  }

  return { storyIdea, childName, artStyle };
}

function cleanIdea(storyIdea) {
  return storyIdea
    .replace(/\s+/g, "")
    .replace(/[。！!？?]+$/g, "")
    .slice(0, 80);
}

function inferSubject(idea) {
  const afterDe = idea.match(/的([^，,。.!！?？]{1,12})/);
  if (afterDe?.[1]) return afterDe[1];

  const known = idea.match(/(小恐龙|小兔子|小熊|小猫|小狗|小狐狸|小企鹅|小朋友|机器人|月亮|星星)/);
  if (known?.[1]) return known[1];

  return "小伙伴";
}

function inferGoal(idea) {
  const learned = idea.match(/(?:最后|后来)?(?:学会|会了|愿意|开始)([^，,。.!！?？]{1,16})/);
  if (learned?.[1]) return learned[1].replace(/^了/, "");

  if (/刷牙/.test(idea)) return "认真刷牙";
  if (/睡觉|入睡|晚睡/.test(idea)) return "安心睡觉";
  if (/分享|玩具/.test(idea)) return "和朋友一起玩";
  if (/害怕|怕|黑/.test(idea)) return "慢慢变勇敢";

  return "试着做一件小事";
}

function makeFallbackPages({ idea, childName, artStyle, character }) {
  const subject = inferSubject(idea);
  const goal = inferGoal(idea);
  const style = safeStyles[artStyle];

  if (/刷牙/.test(idea)) {
    return [
      {
        pageNumber: 1,
        text: `晚上，${childName}遇见一只${subject}。它把牙刷藏在枕头下面，说自己不想刷牙。`,
        imagePrompt: `${style}, ${character}, meeting a small dinosaur friend in a cozy bathroom, toothbrush nearby, gentle funny mood, no text in image`,
      },
      {
        pageNumber: 2,
        text: `${childName}没有催它，只拿起自己的小牙刷。白白的泡泡，像一朵小云。`,
        imagePrompt: `${style}, ${character}, child brushing teeth with fluffy white bubbles, small dinosaur watching curiously, warm bathroom, no text in image`,
      },
      {
        pageNumber: 3,
        text: `${subject}也想试一试。它从一颗牙开始，慢慢刷到亮晶晶。`,
        imagePrompt: `${style}, ${character}, small dinosaur trying to brush one tooth, sparkling gentle bubbles, encouraging scene, no text in image`,
      },
      {
        pageNumber: 4,
        text: `睡觉前，${subject}笑着说：“明天我还要认真刷牙。”${childName}也笑了。`,
        imagePrompt: `${style}, ${character}, child and small dinosaur smiling before bedtime, clean teeth, soft night light, peaceful ending, no text in image`,
      },
    ];
  }

  if (/害怕|怕|黑/.test(idea)) {
    return [
      {
        pageNumber: 1,
        text: `夜灯亮起来时，${childName}听见${subject}小声说：“我有点害怕。”`,
        imagePrompt: `${style}, ${character}, cozy bedroom with night light, small friend looking worried, gentle bedtime mood, no text in image`,
      },
      {
        pageNumber: 2,
        text: `${childName}陪它找声音。窗外是风，墙上是树影，都不是可怕的东西。`,
        imagePrompt: `${style}, ${character}, child and small friend looking at tree shadows and window, calm discovery, no text in image`,
      },
      {
        pageNumber: 3,
        text: `他们给黑夜取了一个名字，叫“星星的被子”。房间慢慢安静下来。`,
        imagePrompt: `${style}, ${character}, child and friend looking at stars through window, soft blanket, comforting night scene, no text in image`,
      },
      {
        pageNumber: 4,
        text: `${subject}躺进被窝里。${childName}轻轻说：“晚安，明天见。”`,
        imagePrompt: `${style}, ${character}, peaceful bedtime, child and small friend tucked in, warm night light, no text in image`,
      },
    ];
  }

  if (/花|画|看到|发现/.test(idea)) {
    return [
      {
        pageNumber: 1,
        text: `${childName}看见了一件小小的事。那朵小花站在风里，像在轻轻点头。`,
        imagePrompt: `${style}, ${character}, child noticing a small flower outside, gentle wind, warm curious moment, no text in image`,
      },
      {
        pageNumber: 2,
        text: `${childName}没有摘下它，只蹲下来认真看。花瓣上有一点亮亮的光。`,
        imagePrompt: `${style}, ${character}, child crouching near a small flower, not picking it, sparkling petals, soft daylight, no text in image`,
      },
      {
        pageNumber: 3,
        text: `回到家，${childName}拿出纸和笔。小花被画进纸里，也留在了心里。`,
        imagePrompt: `${style}, ${character}, child drawing a little flower on paper at home, crayons, cozy table, no text in image`,
      },
      {
        pageNumber: 4,
        text: `睡前，${childName}把画放在床边。梦里，那朵小花开得安安静静。`,
        imagePrompt: `${style}, ${character}, bedtime with a flower drawing beside the bed, peaceful dream, gentle night light, no text in image`,
      },
    ];
  }

  return [
    {
      pageNumber: 1,
      text: `${childName}在睡前想起一件小小的事：${idea}。${subject}也坐过来听。`,
      imagePrompt: `${style}, ${character}, meeting a small friendly companion before bedtime, curious beginning, cozy room, no text in image`,
    },
    {
      pageNumber: 2,
      text: `他们把这件事说得很慢。说着说着，心里就没有那么乱了。`,
      imagePrompt: `${style}, ${character}, child listening patiently to a small friend, warm safe corner, gentle mood, no text in image`,
    },
    {
      pageNumber: 3,
      text: `${childName}和${subject}想了一个小办法。先做一点点，再看下一步。`,
      imagePrompt: `${style}, ${character}, child and small friend taking one small step together, encouraging scene, no text in image`,
    },
    {
      pageNumber: 4,
      text: `灯关上时，${childName}觉得这件小事已经变轻了。明天醒来，再慢慢试。`,
      imagePrompt: `${style}, ${character}, peaceful bedtime ending, small friend feeling proud, soft warm light, no text in image`,
    },
  ];
}

function fallbackStory({ storyIdea, childName, artStyle }) {
  const character = `${childName}，一个圆脸、眼睛亮亮、穿柔软睡衣的小朋友`;
  const idea = cleanIdea(storyIdea);
  const pages = makeFallbackPages({ idea, childName, artStyle, character });

  return {
    title: `${childName}的小小绘本`,
    childName,
    artStyle,
    character,
    pages,
  };
}

function sanitizePages(raw, fallback) {
  if (!raw || !Array.isArray(raw.pages) || raw.pages.length !== 4) return fallback.pages;

  return raw.pages.map((page, index) => ({
    pageNumber: index + 1,
    text: String(page.text || fallback.pages[index].text).trim().slice(0, 90),
    imagePrompt: String(page.imagePrompt || fallback.pages[index].imagePrompt).trim().slice(0, 700),
  }));
}

async function generateStoryWithLlm(input) {
  const apiKey = process.env.LLM_API_KEY;
  const baseUrl = process.env.LLM_BASE_URL || "https://api.openai.com/v1";
  const model = process.env.LLM_MODEL || "gpt-4.1-mini";
  const fallback = fallbackStory(input);

  if (!apiKey) return { ...fallback, usedFallbackStory: true };

  const prompt = `
你是儿童绘本编辑。根据用户输入生成一本 4 页小绘本 JSON。
要求：
- 只返回 JSON，不要 Markdown。
- 每页包含 pageNumber、text、imagePrompt。
- text 适合 3-8 岁孩子听，每页 1-2 句，短句，温和积极。
- 4 页必须有完整起承转合：第 1 页介绍角色和小困难；第 2 页出现温和行动；第 3 页发生具体变化；第 4 页睡前收束。
- 不要把用户输入原样拆成四句，要改写成一个连贯故事。
- 每页必须有具体画面、具体动作，少用“小进步”“慢慢来”这类空话。
- 不要恐怖、暴力、成人内容。
- 不制造教育焦虑，不承诺教育效果。
- 主角昵称可以进入故事，但不要引导用户输入真实敏感信息。
- imagePrompt 使用英文，保持统一角色设定和统一画风，不使用具体版权/IP 风格词。

故事想法：${input.storyIdea}
孩子昵称：${input.childName}
画风：${input.artStyle}
固定画风词：${safeStyles[input.artStyle]}
固定角色设定：${fallback.character}
`;

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.7,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "你只输出合法 JSON。" },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) throw new Error("llm_failed");
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    const parsed = JSON.parse(content);

    return {
      ...fallback,
      title: String(parsed.title || fallback.title).slice(0, 24),
      pages: sanitizePages(parsed, fallback),
      usedFallbackStory: false,
    };
  } catch {
    return { ...fallback, usedFallbackStory: true };
  }
}

function makePlaceholderImage(page, artStyle, childName) {
  const palettes = {
    "温馨水彩": ["#f9dfc9", "#f6f0d9", "#8dc8c0", "#e48d7a"],
    "卡通扁平": ["#d8f0ff", "#fce680", "#72c7a6", "#ff8f70"],
    "童趣手绘": ["#fff1c7", "#c7e8d0", "#f3a7b5", "#7aa7d9"],
  };
  const [bg, hill, sky, accent] = palettes[artStyle] || palettes["温馨水彩"];
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">
  <rect width="1200" height="900" fill="${bg}"/>
  <circle cx="980" cy="150" r="78" fill="${sky}" opacity=".72"/>
  <path d="M0 705 C210 610 360 760 560 665 C760 565 940 665 1200 585 L1200 900 L0 900 Z" fill="${hill}"/>
  <path d="M420 560 C405 455 476 380 590 382 C704 384 775 462 760 562 C746 665 651 705 590 705 C529 705 435 664 420 560 Z" fill="#fff8ef" stroke="#24364a" stroke-width="12"/>
  <circle cx="545" cy="535" r="16" fill="#24364a"/>
  <circle cx="635" cy="535" r="16" fill="#24364a"/>
  <path d="M548 596 C575 620 608 620 636 596" fill="none" stroke="#24364a" stroke-width="12" stroke-linecap="round"/>
  <path d="M505 440 C535 388 642 388 675 440" fill="${accent}" stroke="#24364a" stroke-width="12" stroke-linejoin="round"/>
  <rect x="448" y="680" width="284" height="78" rx="39" fill="${accent}" opacity=".9"/>
  <text x="600" y="815" text-anchor="middle" font-family="PingFang SC, Microsoft YaHei, sans-serif" font-size="42" font-weight="700" fill="#24364a">${escapeXml(childName)}的小绘本 · 第 ${page.pageNumber} 页</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function escapeXml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&apos;",
  }[char]));
}

async function generateImage(prompt) {
  const apiKey = process.env.IMAGE_API_KEY;
  const baseUrl = process.env.IMAGE_BASE_URL || "https://api.openai.com/v1";
  const model = process.env.IMAGE_MODEL || "gpt-image-1";
  if (!apiKey) return null;

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/images/generations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        prompt,
        size: "1024x1024",
        n: 1,
      }),
    });

    if (!response.ok) throw new Error("image_failed");
    const data = await response.json();
    const b64 = data.data?.[0]?.b64_json;
    if (b64) return `data:image/png;base64,${b64}`;
    return data.data?.[0]?.url || null;
  } catch {
    return null;
  }
}

async function handleGenerate(req, res) {
  let payload;
  try {
    payload = await readJsonBody(req);
  } catch {
    sendJson(res, 400, { ok: false, message: "提交内容格式不正确。" });
    return;
  }

  const input = validateInput(payload);
  if (input.error) {
    sendJson(res, 400, { ok: false, message: input.error });
    return;
  }

  const ip = getClientIp(req);
  if (!checkRateLimit(ip)) {
    sendJson(res, 429, { ok: false, message: `今天已经生成 ${dailyLimit} 次了，明天再来试试。` });
    return;
  }

  try {
    const book = await generateStoryWithLlm(input);
    let usedPlaceholderImages = false;

    const pages = [];
    for (const page of book.pages) {
      const imageUrl = await generateImage(page.imagePrompt);
      if (!imageUrl) usedPlaceholderImages = true;
      pages.push({
        ...page,
        imageUrl: imageUrl || makePlaceholderImage(page, input.artStyle, input.childName),
      });
    }

    sendJson(res, 200, {
      ok: true,
      book: {
        title: book.title,
        childName: input.childName,
        artStyle: input.artStyle,
        pages,
        usedPlaceholderImages,
        usedFallbackStory: Boolean(book.usedFallbackStory),
      },
    });
  } catch {
    sendJson(res, 500, { ok: false, message: "生成失败了，换个简单的小故事再试一次。" });
  }
}

async function serveStatic(req, res) {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = requestUrl.pathname === "/" ? "/index.html" : decodeURIComponent(requestUrl.pathname);
  const safePath = normalize(pathname).replace(/^(\.\.[/\\])+/, "");
  const filePath = join(rootDir, safePath);

  if (!filePath.startsWith(rootDir)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  try {
    const file = await readFile(filePath);
    res.writeHead(200, {
      "Content-Type": mimeTypes[extname(filePath)] || "application/octet-stream",
    });
    res.end(file);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
}

const server = createServer(async (req, res) => {
  if (req.method === "POST" && req.url === "/api/generate-picture-book") {
    await handleGenerate(req, res);
    return;
  }

  if (req.method === "GET" || req.method === "HEAD") {
    await serveStatic(req, res);
    return;
  }

  res.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Method not allowed");
});

server.listen(port, "127.0.0.1", () => {
  console.log(`小小绘本机本地服务已启动：http://127.0.0.1:${port}/picture-book.html`);
});
