/* ===========================================================
   不会代码研究所 · 全站脚本 script.js
   包含：
   1) 所长决定器：随机抽研究任务（work-001.html）
   2) 灵感停车场：localStorage 保存 / 展示 / 删除 / 清空（inspiration.html）
   纯原生 JavaScript，无任何外部依赖。
   2026
   =========================================================== */

/* -----------------------------------------------------------
   第一部分：所长决定器
   ----------------------------------------------------------- */

/* 研究任务库：30+ 条，方向都符合「不会代码研究所」 */
var RESEARCH_TASKS = [
  "用 AI 做一个随机借口生成器",
  "用 AI 做一个文字人生模拟器",
  "用 AI 做一个土味情话生成器",
  "用 AI 做一个今天吃什么决定器",
  "用 AI 做一个节日抽签器",
  "用 AI 做一个没啥用但很好玩的小网页",
  "用 AI 做一个翻车记录生成器",
  "用 AI 做一个老板消息解读器",
  "用 AI 做一个朋友圈文案反矫情器",
  "用 AI 做一个研究所今日任务牌",
  "用 AI 做一个普通人 AI 入门测试",
  "用 AI 做一个周末计划生成器",
  "用 AI 做一个摸鱼正当理由生成器",
  "用 AI 做一个早安心语随机机",
  "用 AI 做一个起床困难急救器",
  "用 AI 做一个加班自我安慰语录机",
  "用 AI 做一个奶茶口味选择困难终结器",
  "用 AI 做一个今天穿什么提议器",
  "用 AI 做一个微信回复语气翻译器",
  "用 AI 做一个相亲话题破冰生成器",
  "用 AI 做一个夸夸自己彩虹屁机",
  "用 AI 做一个网名昵称随机生成器",
  "用 AI 做一个旅行目的地盲盒抽取器",
  "用 AI 做一个减肥失败借口大全",
  "用 AI 做一个新年 flag 随机分配器",
  "用 AI 做一个小作文标题党生成器",
  "用 AI 做一个尬聊话题救场器",
  "用 AI 做一个今日运势胡说八道机",
  "用 AI 做一个给宠物起名字的小工具",
  "用 AI 做一个emoji 翻译机",
  "用 AI 做一个普通人 AI 工具体验报告模板",
  "用 AI 做一个研究所翻车复盘记录卡"
];

function initDecider() {
  var btn = document.getElementById("decideBtn");
  var result = document.getElementById("deciderResult");
  if (!btn || !result) return; // 不在 work-001 页面就跳过

  var lastIndex = -1;

  btn.addEventListener("click", function () {
    // 抽一个和上次不一样的任务，避免连续重复
    var idx = Math.floor(Math.random() * RESEARCH_TASKS.length);
    if (RESEARCH_TASKS.length > 1) {
      while (idx === lastIndex) {
        idx = Math.floor(Math.random() * RESEARCH_TASKS.length);
      }
    }
    lastIndex = idx;

    // 简单的“抽签滚动”动画
    result.classList.add("is-rolling");
    result.textContent = "🎲 所长正在掐指一算……";

    setTimeout(function () {
      result.classList.remove("is-rolling");
      result.textContent = "👉 " + RESEARCH_TASKS[idx];
    }, 450);
  });
}

/* -----------------------------------------------------------
   第二部分：灵感停车场（localStorage）
   ----------------------------------------------------------- */

var IDEA_KEY = "bhdm_ideas_v1"; // 不会代码研究所 · 灵感存储 key

function loadIdeas() {
  try {
    var raw = localStorage.getItem(IDEA_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveIdeas(ideas) {
  localStorage.setItem(IDEA_KEY, JSON.stringify(ideas));
}

function formatTime(ts) {
  var d = new Date(ts);
  function pad(n) { return n < 10 ? "0" + n : "" + n; }
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) +
         " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
}

function renderIdeas() {
  var list = document.getElementById("ideaList");
  var empty = document.getElementById("ideaEmpty");
  if (!list) return;

  var ideas = loadIdeas();

  // 空状态
  if (ideas.length === 0) {
    list.innerHTML = "";
    if (empty) empty.style.display = "block";
    return;
  }
  if (empty) empty.style.display = "none";

  // 最新的在最上面
  list.innerHTML = "";
  for (var i = ideas.length - 1; i >= 0; i--) {
    var idea = ideas[i];

    var li = document.createElement("li");
    li.className = "idea-item";

    var body = document.createElement("div");
    body.className = "idea-item__text";

    var p = document.createElement("div");
    p.textContent = idea.text; // 用 textContent 防止 XSS
    body.appendChild(p);

    var time = document.createElement("span");
    time.className = "idea-item__time";
    time.textContent = "停车时间：" + formatTime(idea.time);
    body.appendChild(time);

    var del = document.createElement("button");
    del.className = "idea-item__del";
    del.setAttribute("type", "button");
    del.setAttribute("aria-label", "删除这条脑洞");
    del.textContent = "✕";
    (function (id) {
      del.addEventListener("click", function () {
        deleteIdea(id);
      });
    })(idea.id);

    li.appendChild(body);
    li.appendChild(del);
    list.appendChild(li);
  }
}

function addIdea(text) {
  var ideas = loadIdeas();
  ideas.push({
    id: Date.now() + "-" + Math.floor(Math.random() * 1000),
    text: text,
    time: Date.now()
  });
  saveIdeas(ideas);
  renderIdeas();
}

function deleteIdea(id) {
  var ideas = loadIdeas().filter(function (it) {
    return it.id !== id;
  });
  saveIdeas(ideas);
  renderIdeas();
}

function clearIdeas() {
  var ideas = loadIdeas();
  if (ideas.length === 0) {
    alert("停车场现在是空的，没有需要清空的脑洞～");
    return;
  }
  // 二次确认
  var ok = confirm("确定要清空全部脑洞吗？共 " + ideas.length + " 条。\n清空后无法恢复哦。");
  if (!ok) return;
  localStorage.removeItem(IDEA_KEY);
  renderIdeas();
}

function initParking() {
  var input = document.getElementById("ideaInput");
  var saveBtn = document.getElementById("ideaSaveBtn");
  var clearBtn = document.getElementById("ideaClearBtn");
  if (!input || !saveBtn) return; // 不在灵感停车场页面就跳过

  saveBtn.addEventListener("click", function () {
    var text = input.value.trim();
    if (!text) {
      alert("先写点脑洞再停车吧～");
      input.focus();
      return;
    }
    addIdea(text);
    input.value = "";
    input.focus();
  });

  if (clearBtn) {
    clearBtn.addEventListener("click", clearIdeas);
  }

  renderIdeas();
}

/* -----------------------------------------------------------
   启动
   ----------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", function () {
  initDecider();
  initParking();
});
