// js/main.js — 進入點與畫面路由。
//
// 以 location.hash 做路由，格式為 "#畫面名稱" 或 "#畫面名稱?key=value&..."，
// 例如 "#learn?group=1A" 會解析成 { name: "learn", params: { group: "1A" } }。
// 之後 Task 3.2–3.5 會用 registerScreen() 依序註冊 home / table / quiz / review，
// 其中 table 畫面點進某一族時會導覽到 learn 畫面並帶上 group 參數。

import { renderTableScreen } from "./ui/screen-table.js";
import { renderLearnScreen } from "./ui/screen-learn.js";
import { renderQuizScreen } from "./ui/screen-quiz.js";

const screens = {};
const app = document.getElementById("app");

/**
 * 註冊一個畫面。
 * @param {string} name 畫面代稱，對應 hash 的第一段（例如 "home"）
 * @param {(container: HTMLElement, params: Record<string, string>) => void} renderFn
 *   container 是清空後的 #app；params 是 hash 問號後面解析出的查詢參數。
 */
export function registerScreen(name, renderFn) {
  screens[name] = renderFn;
}

/**
 * 導覽到指定畫面，會改變 location.hash 觸發路由。
 * @param {string} name 畫面代稱
 * @param {Record<string, string>} [params] 選填的查詢參數，會編碼進 hash
 */
export function navigate(name, params) {
  const hash = buildHash(name, params);
  if (location.hash === hash) {
    // hash 沒變（例如在同一畫面內重新導覽自己）也要重新渲染一次
    render();
  } else {
    location.hash = hash;
  }
}

function buildHash(name, params) {
  let hash = "#" + name;
  if (params && Object.keys(params).length > 0) {
    hash += "?" + new URLSearchParams(params).toString();
  }
  return hash;
}

/**
 * 解析 location.hash 成 { name, params }。
 * 空 hash 視為 "home"。
 */
function parseHash() {
  const raw = location.hash.replace(/^#/, "");
  const [name, query] = raw.split("?");
  const params = {};
  if (query) {
    new URLSearchParams(query).forEach((value, key) => {
      params[key] = value;
    });
  }
  return { name: name || "home", params };
}

function render() {
  const { name, params } = parseHash();
  app.innerHTML = "";

  const renderFn = screens[name];
  if (renderFn) {
    renderFn(app, params);
  } else {
    renderPlaceholder(name);
  }

  updateNavActiveState(name);
}

/** 找不到對應畫面時的預設內容（尚未註冊的畫面會看到這個）。 */
function renderPlaceholder(name) {
  const wrap = document.createElement("div");
  wrap.className = "placeholder";

  const heading = document.createElement("h2");
  heading.textContent = "建置中";

  const message = document.createElement("p");
  message.textContent = `「${name}」畫面還沒做好，晚點再回來看看。`;

  wrap.append(heading, message);
  app.appendChild(wrap);
}

/** 讓底部導覽列的目前分頁有 aria-current="page"，其餘清掉。 */
function updateNavActiveState(currentName) {
  document.querySelectorAll(".nav-link").forEach((link) => {
    if (link.dataset.screen === currentName) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });
}

function init() {
  if (!location.hash) {
    // 設定 hash 會觸發 hashchange -> render()，不必在這裡重複呼叫
    location.hash = "#home";
  } else {
    render();
  }
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch((err) => {
      console.warn("Service worker 註冊失敗：", err);
    });
  });
}

// 畫面註冊必須在 init() 之前——init() 會立刻依 hash 渲染一次，
// 那時候還沒註冊的畫面會被當成不存在，顯示「建置中」佔位內容。
registerScreen("table", renderTableScreen);
registerScreen("learn", renderLearnScreen);
registerScreen("quiz", renderQuizScreen);

window.addEventListener("hashchange", render);
init();
registerServiceWorker();
