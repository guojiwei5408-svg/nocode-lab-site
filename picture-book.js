const form = document.getElementById("bookForm");
const storyIdea = document.getElementById("storyIdea");
const childName = document.getElementById("childName");
const artStyle = document.getElementById("artStyle");
const ideaCount = document.getElementById("ideaCount");
const generateBtn = document.getElementById("generateBtn");
const resultPanel = document.getElementById("resultPanel");
const bookTitle = document.getElementById("bookTitle");
const bookMeta = document.getElementById("bookMeta");
const pageImage = document.getElementById("pageImage");
const pageText = document.getElementById("pageText");
const pageIndicator = document.getElementById("pageIndicator");
const prevPageBtn = document.getElementById("prevPageBtn");
const nextPageBtn = document.getElementById("nextPageBtn");
const downloadPdfBtn = document.getElementById("downloadPdfBtn");
const toast = document.getElementById("toast");
const canvas = document.getElementById("signalCanvas");
const ctx = canvas.getContext("2d");

let currentBook = null;
let currentPageIndex = 0;
let toastTimer = null;
let points = [];
let frame = null;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 2600);
}

function setLoading(isLoading) {
  generateBtn.disabled = isLoading;
  generateBtn.querySelector("span").textContent = isLoading ? "正在生成..." : "生成小绘本";
}

function updateCounter() {
  ideaCount.textContent = String(storyIdea.value.trim().length);
}

function renderPage() {
  if (!currentBook) return;
  const page = currentBook.pages[currentPageIndex];
  pageImage.src = page.imageUrl;
  pageImage.alt = `第 ${page.pageNumber} 页插画`;
  pageText.textContent = page.text;
  pageIndicator.textContent = `${currentPageIndex + 1} / ${currentBook.pages.length}`;
  prevPageBtn.disabled = currentPageIndex === 0;
  nextPageBtn.disabled = currentPageIndex === currentBook.pages.length - 1;
}

function validateForm() {
  const idea = storyIdea.value.trim();
  const name = childName.value.trim();

  if (!idea) return "先写一句故事想法。";
  if (!name) return "给主角填一个昵称或小名。";
  if (idea.length > 200) return "故事想法控制在 200 字以内。";
  if (name.length > 12) return "昵称短一点，12 个字以内。";

  return "";
}

async function submitBook(event) {
  event.preventDefault();
  const error = validateForm();
  if (error) {
    showToast(error);
    return;
  }

  setLoading(true);

  try {
    const response = await fetch("/api/generate-picture-book", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storyIdea: storyIdea.value.trim(),
        childName: childName.value.trim(),
        artStyle: artStyle.value,
      }),
    });

    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.message || "生成失败，请稍后再试。");

    currentBook = data.book;
    currentPageIndex = 0;
    bookTitle.textContent = currentBook.title;
    bookMeta.textContent = currentBook.usedPlaceholderImages
      ? "当前使用占位插画。配置生图 API 后，会自动换成 AI 插画。"
      : "已生成 4 页小绘本，可以翻页预览，也可以下载 PDF。";
    resultPanel.hidden = false;
    renderPage();
    resultPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (err) {
    showToast(err.message || "生成失败，请稍后再试。");
  } finally {
    setLoading(false);
  }
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function wrapCanvasText(context, text, x, y, maxWidth, lineHeight) {
  const chars = [...text];
  let line = "";
  let cursorY = y;

  chars.forEach((char) => {
    const testLine = line + char;
    if (context.measureText(testLine).width > maxWidth && line) {
      context.fillText(line, x, cursorY);
      line = char;
      cursorY += lineHeight;
    } else {
      line = testLine;
    }
  });

  if (line) context.fillText(line, x, cursorY);
}

async function renderPdfPage(page, title) {
  const width = 1240;
  const height = 1754;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  const image = await loadImage(page.imageUrl);

  context.fillStyle = "#fbf6ec";
  context.fillRect(0, 0, width, height);
  context.fillStyle = "#18324a";
  context.font = "700 44px PingFang SC, Microsoft YaHei, sans-serif";
  context.fillText(title, 86, 92);
  context.fillStyle = "#6f7d8a";
  context.font = "28px PingFang SC, Microsoft YaHei, sans-serif";
  context.fillText(`第 ${page.pageNumber} 页`, 86, 136);

  const imageX = 86;
  const imageY = 180;
  const imageW = width - 172;
  const imageH = 980;
  context.fillStyle = "#ffffff";
  context.fillRect(imageX - 8, imageY - 8, imageW + 16, imageH + 16);
  context.drawImage(image, imageX, imageY, imageW, imageH);

  context.fillStyle = "#1f2d3a";
  context.font = "500 46px PingFang SC, Microsoft YaHei, sans-serif";
  wrapCanvasText(context, page.text, 118, 1265, width - 236, 68);

  context.fillStyle = "#8a96a3";
  context.font = "24px PingFang SC, Microsoft YaHei, sans-serif";
  context.fillText("小小绘本机 · 内容仅供亲子阅读参考", 86, 1680);

  const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
  const binary = atob(dataUrl.split(",")[1]);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return { bytes, width, height };
}

function asciiBytes(text) {
  return new TextEncoder().encode(text);
}

function concatBytes(chunks) {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  chunks.forEach((chunk) => {
    out.set(chunk, offset);
    offset += chunk.length;
  });
  return out;
}

function buildPdf(images) {
  const chunks = [asciiBytes("%PDF-1.4\n")];
  const offsets = [0];
  const objectCount = 2 + images.length * 3;

  function addObject(id, parts) {
    offsets[id] = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    chunks.push(asciiBytes(`${id} 0 obj\n`));
    parts.forEach((part) => chunks.push(typeof part === "string" ? asciiBytes(part) : part));
    chunks.push(asciiBytes("\nendobj\n"));
  }

  const pageObjectIds = images.map((_, index) => 3 + index * 3);
  addObject(1, [`<< /Type /Catalog /Pages 2 0 R >>`]);
  addObject(2, [`<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${images.length} >>`]);

  images.forEach((image, index) => {
    const pageId = 3 + index * 3;
    const contentId = pageId + 1;
    const imageId = pageId + 2;
    const name = `Im${index + 1}`;
    const commands = `q\n595 0 0 842 0 0 cm\n/${name} Do\nQ`;

    addObject(pageId, [`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /${name} ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`]);
    addObject(contentId, [`<< /Length ${commands.length} >>\nstream\n${commands}\nendstream`]);
    addObject(imageId, [
      `<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.bytes.length} >>\nstream\n`,
      image.bytes,
      "\nendstream",
    ]);
  });

  const xrefOffset = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const xref = ["xref", `0 ${objectCount + 1}`, "0000000000 65535 f "];
  for (let id = 1; id <= objectCount; id += 1) {
    xref.push(`${String(offsets[id]).padStart(10, "0")} 00000 n `);
  }
  chunks.push(asciiBytes(`${xref.join("\n")}\ntrailer\n<< /Size ${objectCount + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`));
  return concatBytes(chunks);
}

async function downloadPdf() {
  if (!currentBook) return;
  downloadPdfBtn.disabled = true;
  downloadPdfBtn.textContent = "正在生成 PDF...";

  try {
    const images = [];
    for (const page of currentBook.pages) {
      images.push(await renderPdfPage(page, currentBook.title));
    }
    const pdf = buildPdf(images);
    const blob = new Blob([pdf], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `小小绘本机-${currentBook.childName}-${new Date().toISOString().slice(0, 10)}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    showToast("PDF 生成失败，请刷新后再试。");
  } finally {
    downloadPdfBtn.disabled = false;
    downloadPdfBtn.textContent = "下载 PDF";
  }
}

function setCanvasSize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const count = window.innerWidth < 700 ? 34 : 80;
  points = Array.from({ length: count }, () => ({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    vx: (Math.random() - 0.5) * 0.22,
    vy: (Math.random() - 0.5) * 0.22,
    r: 1 + Math.random() * 1.2,
  }));
}

function drawSignal() {
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  points.forEach((point) => {
    point.x += point.vx;
    point.y += point.vy;
    if (point.x < 0 || point.x > window.innerWidth) point.vx *= -1;
    if (point.y < 0 || point.y > window.innerHeight) point.vy *= -1;
    ctx.fillStyle = "rgba(57, 217, 255, .3)";
    ctx.beginPath();
    ctx.arc(point.x, point.y, point.r, 0, Math.PI * 2);
    ctx.fill();
  });
  frame = requestAnimationFrame(drawSignal);
}

storyIdea.addEventListener("input", updateCounter);
form.addEventListener("submit", submitBook);
prevPageBtn.addEventListener("click", () => {
  currentPageIndex = Math.max(0, currentPageIndex - 1);
  renderPage();
});
nextPageBtn.addEventListener("click", () => {
  if (!currentBook) return;
  currentPageIndex = Math.min(currentBook.pages.length - 1, currentPageIndex + 1);
  renderPage();
});
downloadPdfBtn.addEventListener("click", downloadPdf);
window.addEventListener("resize", () => {
  if (frame) cancelAnimationFrame(frame);
  setCanvasSize();
  drawSignal();
});

updateCounter();
setCanvasSize();
drawSignal();
