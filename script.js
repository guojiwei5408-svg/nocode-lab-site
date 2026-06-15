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
   第三部分：工资到手计算器（work-003）
   ----------------------------------------------------------- */

var SALARY_CITY_PRESETS = {
  beijing: { label: "北京", baseMin: 0, baseMax: 0 },
  shanghai: { label: "上海", baseMin: 0, baseMax: 0 },
  guangzhou: { label: "广州", baseMin: 0, baseMax: 0 },
  shenzhen: { label: "深圳", baseMin: 0, baseMax: 0 },
  chengdu: { label: "成都", baseMin: 0, baseMax: 0 },
  hangzhou: { label: "杭州", baseMin: 0, baseMax: 0 },
  custom: { label: "自定义", baseMin: 0, baseMax: 0 }
};

var TAX_BRACKETS = [
  { limit: 3000, rate: 0.03, quick: 0 },
  { limit: 12000, rate: 0.10, quick: 210 },
  { limit: 25000, rate: 0.20, quick: 1410 },
  { limit: 35000, rate: 0.25, quick: 2660 },
  { limit: 55000, rate: 0.30, quick: 4410 },
  { limit: 80000, rate: 0.35, quick: 7160 },
  { limit: Infinity, rate: 0.45, quick: 15160 }
];

function money(n) {
  var value = Math.max(0, Number(n) || 0);
  return "¥" + value.toLocaleString("zh-CN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: value % 1 === 0 ? 0 : 2
  });
}

function readNumber(id) {
  var el = document.getElementById(id);
  if (!el) return 0;
  return Math.max(0, Number(el.value) || 0);
}

function clampBase(base, min, max) {
  var result = base;
  if (min > 0) result = Math.max(result, min);
  if (max > 0) result = Math.min(result, max);
  return result;
}

function calcTax(taxable) {
  if (taxable <= 0) return 0;
  for (var i = 0; i < TAX_BRACKETS.length; i++) {
    if (taxable <= TAX_BRACKETS[i].limit) {
      return Math.max(0, taxable * TAX_BRACKETS[i].rate - TAX_BRACKETS[i].quick);
    }
  }
  return 0;
}

function getSpecialDeductionTotal() {
  var childEdu = readNumber("childEduCount") * 2000;
  var babyCare = readNumber("babyCareCount") * 2000;
  var degreeEducation = document.getElementById("degreeEducation");
  var certificateEducation = document.getElementById("certificateEducation");
  var mortgageDeduction = document.getElementById("mortgageDeduction");
  var rentDeduction = document.getElementById("rentDeduction");
  var elderCareType = document.getElementById("elderCareType");
  var elderCareCustom = document.getElementById("elderCareCustom");
  var elderCareCustomRow = document.getElementById("elderCareCustomRow");
  var housingTip = document.getElementById("housingDeductionTip");

  var education = 0;
  if (degreeEducation && degreeEducation.checked) education += 400;
  if (certificateEducation && certificateEducation.checked) education += 300;

  var mortgage = mortgageDeduction && mortgageDeduction.checked ? 1000 : 0;
  var rent = rentDeduction ? readNumber("rentDeduction") : 0;
  if (rentDeduction) {
    rentDeduction.disabled = mortgage > 0;
    if (mortgage > 0) {
      rentDeduction.value = "0";
      rent = 0;
    }
  }
  if (housingTip) housingTip.hidden = mortgage === 0;

  var elderCare = 0;
  if (elderCareType) {
    if (elderCareType.value === "3000") {
      elderCare = 3000;
      if (elderCareCustomRow) elderCareCustomRow.hidden = true;
    } else if (elderCareType.value === "custom") {
      if (elderCareCustomRow) elderCareCustomRow.hidden = false;
      elderCare = Math.min(readNumber("elderCareCustom"), 1500);
      if (elderCareCustom && Number(elderCareCustom.value) > 1500) elderCareCustom.value = "1500";
    } else {
      if (elderCareCustomRow) elderCareCustomRow.hidden = true;
      if (elderCareCustom) elderCareCustom.value = "0";
    }
  }

  return childEdu + babyCare + education + mortgage + rent + elderCare;
}

function renderBreakdown(rows) {
  var list = document.getElementById("breakdownList");
  if (!list) return;
  list.innerHTML = "";
  rows.forEach(function (row) {
    var item = document.createElement("div");
    item.className = "breakdown-row" + (row.total ? " is-total" : "");

    var label = document.createElement("span");
    label.textContent = row.label;

    var amount = document.createElement("strong");
    amount.textContent = money(row.value);

    item.appendChild(label);
    item.appendChild(amount);
    list.appendChild(item);
  });
}

function renderBars(items, gross) {
  var chart = document.getElementById("barChart");
  if (!chart) return;
  chart.innerHTML = "";

  var max = Math.max(gross, 1);
  items.forEach(function (item) {
    var row = document.createElement("div");
    row.className = "salary-bar";

    var label = document.createElement("span");
    label.textContent = item.label;

    var track = document.createElement("div");
    track.className = "salary-bar__track";

    var fill = document.createElement("div");
    fill.className = "salary-bar__fill";
    fill.style.setProperty("--bar-width", Math.min(100, item.value / max * 100) + "%");

    var amount = document.createElement("strong");
    amount.textContent = money(item.value);

    track.appendChild(fill);
    row.appendChild(label);
    row.appendChild(track);
    row.appendChild(amount);
    chart.appendChild(row);
  });
}

function pickDirectorComment(data) {
  var takeHomeText = money(data.takeHome);
  var totalDeductText = money(data.personalTotal + data.tax);
  var companyCostText = money(data.companyCost);
  var ratio = data.gross > 0 ? data.takeHome / data.gross : 0;
  var costRatio = data.takeHome > 0 ? data.companyCost / data.takeHome : 0;
  var deductRatio = data.gross > 0 ? (data.personalTotal + data.tax) / data.gross : 0;
  var fundRatio = data.gross > 0 ? data.housingFund / data.gross : 0;

  if (costRatio >= 1.55) {
    return "公司为你花了 " + companyCostText + "，你揣回家 " + takeHomeText + "。中间差的那截，你也看见了。";
  }
  if (deductRatio >= 0.28 || data.tax >= 3000) {
    return "光五险一金加个税就走了 " + totalDeductText + "。交得多，往后领得也多——先这么想着。";
  }
  if (fundRatio >= 0.1 && data.housingFund >= 1000) {
    return "公积金扣了不少，不过那是你自己的钱，换个兜装着，买房能用上。";
  }
  if (ratio >= 0.8) {
    return "扣得不算多，到手还行。这个月，稳了。";
  }
  if (ratio >= 0.65 && ratio <= 0.8) {
    return "忙活一个月，到手 " + takeHomeText + "。不多不少，够过日子。打工人，辛苦了。";
  }
  if (data.takeHome > 0 && data.takeHome < 5000) {
    return "到手 " + takeHomeText + "，是不多。但每一分都是你自己挣的，踏实。";
  }
  return "该扣的都扣了，剩下的就是你的。省着点，也别太亏待自己。";
}

function updateSalaryCalculator() {
  var gross = readNumber("grossSalary");
  var rawBase = readNumber("baseSalary");
  var baseMin = readNumber("baseMin");
  var baseMax = readNumber("baseMax");
  var base = clampBase(rawBase || gross, baseMin, baseMax);
  var fundRate = readNumber("fundRate") / 100;

  var pension = base * readNumber("personalPensionRate") / 100;
  var medical = base * readNumber("personalMedicalRate") / 100;
  var unemployment = base * readNumber("personalUnemploymentRate") / 100;
  var housingFund = base * fundRate;
  var personalTotal = pension + medical + unemployment + housingFund;

  var deductionTotal = getSpecialDeductionTotal();
  var specialDeductionTotal = document.getElementById("specialDeductionTotal");
  if (specialDeductionTotal) specialDeductionTotal.textContent = money(deductionTotal) + "/月";

  var taxable = gross - personalTotal - 5000 - deductionTotal;
  var tax = calcTax(taxable);
  var takeHome = Math.max(0, gross - personalTotal - tax);

  var companyTotal =
    base * readNumber("companyPensionRate") / 100 +
    base * readNumber("companyMedicalRate") / 100 +
    base * readNumber("companyUnemploymentRate") / 100 +
    base * readNumber("companyInjuryRate") / 100 +
    base * fundRate;
  var companyCost = gross + companyTotal;

  document.getElementById("takeHomeBig").textContent = money(takeHome);
  document.getElementById("costHighlight").textContent = "公司每月实际为你花了 " + money(companyCost);
  document.getElementById("fundRateText").textContent = Math.round(fundRate * 100) + "%";

  renderBreakdown([
    { label: "税前月薪", value: gross },
    { label: "养老保险", value: pension },
    { label: "医疗保险", value: medical },
    { label: "失业保险", value: unemployment },
    { label: "住房公积金", value: housingFund },
    { label: "个人所得税", value: tax },
    { label: "每月到手", value: takeHome, total: true }
  ]);

  renderBars([
    { label: "到手", value: takeHome },
    { label: "五险一金", value: personalTotal },
    { label: "个税", value: tax }
  ], gross);

  var comment = document.getElementById("directorComment");
  if (comment) {
    comment.textContent = pickDirectorComment({
      gross: gross,
      takeHome: takeHome,
      personalTotal: personalTotal,
      tax: tax,
      housingFund: housingFund,
      companyCost: companyCost
    });
  }
}

function initSalaryCalculator() {
  var form = document.getElementById("salaryForm");
  if (!form) return;

  var gross = document.getElementById("grossSalary");
  var base = document.getElementById("baseSalary");
  var city = document.getElementById("city");
  var baseTouched = false;

  if (base) {
    base.addEventListener("input", function () {
      baseTouched = true;
    });
  }

  if (gross) {
    gross.addEventListener("input", function () {
      if (base && !baseTouched) base.value = gross.value;
    });
  }

  if (city) {
    city.addEventListener("change", function () {
      var preset = SALARY_CITY_PRESETS[city.value] || SALARY_CITY_PRESETS.custom;
      document.getElementById("baseMin").value = preset.baseMin;
      document.getElementById("baseMax").value = preset.baseMax;
      updateSalaryCalculator();
    });
  }

  form.addEventListener("input", updateSalaryCalculator);
  form.addEventListener("change", updateSalaryCalculator);
  updateSalaryCalculator();
}

/* -----------------------------------------------------------
   启动
   ----------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", function () {
  initDecider();
  initParking();
  initSalaryCalculator();
});
