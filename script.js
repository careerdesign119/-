const API_URL = "https://script.google.com/macros/s/AKfycbxPn-rQGn_-1pLMycdf4BwSG9BsHhKVFoIzTSz7CRilKnj-RMRrTl3PUsOcTwIhon0/exec";
const ADMIN_PASSWORD = "123456789";

// ===== 전역 상태 =====
let state = { companies: [], teams: [], investments: [] };
let selectedCompanyName = "";

// ===== UI helpers =====
function showToast(message, isError = false) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.className = "toast show" + (isError ? " error" : "");
  setTimeout(() => (toast.className = "toast"), 1000);
}
function n(v) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}
function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function cssEscape(str) { return String(str).replace(/\\/g, "\\\\").replace(/"/g, '\\"'); }
function toISO(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value ?? "");
  return d.toISOString();
}
function formatDateKOR(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value ?? "");
  return d.toLocaleString("ko-KR");
}

// ===== API =====
async function apiGetInit() {
  const res = await fetch(`${API_URL}?action=init`, { method: "GET" });
  if (!res.ok) throw new Error(`init failed: ${res.status}`);
  return await res.json();
}
async function apiPost(action, payload) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" }, // Apps Script 호환
    body: JSON.stringify({ action, ...payload }),
  });
  if (!res.ok) throw new Error(`post failed: ${res.status}`);
  return await res.json();
}

// ===== 집계 (투자내역이 진실) =====
function computeAggregates() {
  const spentByCompany = new Map(); // 기업명 -> 사용합
  const raisedByTeam = new Map();   // 팀명 -> 모인합
  const uniqueBackersByTeam = new Map(); // 팀명 -> Set(기업명)

  for (const inv of state.investments) {
    const c = String(inv["기업명"] ?? "").trim();
    const t = String(inv["팀명"] ?? "").trim();
    const amt = n(inv["투자금액"] ?? 0);
    if (!c || !t || amt <= 0) continue;

    spentByCompany.set(c, (spentByCompany.get(c) || 0) + amt);
    raisedByTeam.set(t, (raisedByTeam.get(t) || 0) + amt);

    if (!uniqueBackersByTeam.has(t)) uniqueBackersByTeam.set(t, new Set());
    uniqueBackersByTeam.get(t).add(c);
  }

  return { spentByCompany, raisedByTeam, uniqueBackersByTeam };
}

// ===== Entry Flow =====
const entryModal = document.getElementById("entryModal");
const passwordModal = document.getElementById("passwordModal");
const adminPage = document.getElementById("adminPage");
const companyPage = document.getElementById("companyPage");

const entryStepType = document.getElementById("entryStepType");
const entryStepCompany = document.getElementById("entryStepCompany");
const entryCompanySelect = document.getElementById("entryCompanySelect");

function resetToEntry() {
  selectedCompanyName = "";
  companyPage.style.display = "none";
  adminPage.style.display = "none";
  passwordModal.style.display = "none";
  entryModal.style.display = "flex";
  entryStepCompany.style.display = "none";
  entryStepType.style.display = "block";
  entryCompanySelect.innerHTML = `<option value="">불러오는 중...</option>`;
}

document.getElementById("adminBtn").addEventListener("click", () => {
  entryModal.style.display = "none";
  passwordModal.style.display = "flex";
});
document.getElementById("companyBtn").addEventListener("click", async () => {
  entryStepType.style.display = "none";
  entryStepCompany.style.display = "block";
  await fillEntryCompanyDropdown();
});
document.getElementById("entryCompanyBack").addEventListener("click", () => {
  entryStepCompany.style.display = "none";
  entryStepType.style.display = "block";
  entryCompanySelect.value = "";
});
document.getElementById("entryCompanyEnter").addEventListener("click", () => {
  const name = entryCompanySelect.value;
  if (!name) return showToast("기업을 선택해주세요", true);

  selectedCompanyName = name;
  entryModal.style.display = "none";
  companyPage.style.display = "block";
  initCompanyPageLocked(selectedCompanyName);
});

document.getElementById("passwordCancel").addEventListener("click", () => {
  resetToEntry();
  document.getElementById("passwordInput").value = "";
  document.getElementById("passwordError").textContent = "";
});
document.getElementById("passwordSubmit").addEventListener("click", async () => {
  const input = document.getElementById("passwordInput").value;
  if (input !== ADMIN_PASSWORD) {
    document.getElementById("passwordError").textContent = "비밀번호가 일치하지 않습니다";
    return;
  }
  passwordModal.style.display = "none";
  adminPage.style.display = "block";
  await initAdminPage();
});
document.getElementById("passwordInput").addEventListener("keypress", (e) => {
  if (e.key === "Enter") document.getElementById("passwordSubmit").click();
});

// ===== Tabs =====
document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const tabName = btn.dataset.tab;
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(tabName + "Tab").classList.add("active");
  });
});

// ===== Load / Sync =====
async function loadFromSheet() {
  const data = await apiGetInit();
  if (data.error) throw new Error(data.error);
  state.companies = Array.isArray(data.companies) ? data.companies : [];
  state.teams = Array.isArray(data.teams) ? data.teams : [];
  state.investments = Array.isArray(data.investments) ? data.investments : [];
}

async function fillEntryCompanyDropdown() {
  try {
    await loadFromSheet();
    const select = entryCompanySelect;
    select.innerHTML = `<option value="">기업을 선택하세요</option>`;
    state.companies.forEach(c => {
      const name = String(c["기업명"] ?? "").trim();
      if (!name) return;
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      select.appendChild(opt);
    });
  } catch (e) {
    console.error(e);
    entryCompanySelect.innerHTML = `<option value="">불러오기 실패</option>`;
    showToast("기업 목록을 불러오지 못했습니다", true);
  }
}

// ===== Admin Page =====
async function initAdminPage() {
  await loadFromSheet();
  document.getElementById("lastSyncText").textContent = `마지막 동기화: ${new Date().toLocaleString("ko-KR")}`;
  renderAdminAll();
}

document.getElementById("syncBtn").addEventListener("click", async () => {
  try {
    await initAdminPage();
    showToast("불러오기 완료");
  } catch (e) {
    console.error(e);
    showToast("불러오기에 실패했습니다", true);
  }
});

function renderAdminAll() {
  renderCompaniesTable();
  renderTeamsTable();
  renderInvestmentsTable();
}

function renderCompaniesTable() {
  const tbody = document.querySelector("#companiesTable tbody");
  tbody.innerHTML = "";

  const { spentByCompany } = computeAggregates();

  state.companies.forEach((c, index) => {
    const name = String(c["기업명"] ?? "").trim();
    const base = n(c["기본포인트"]);
    const spent = spentByCompany.get(name) || 0;
    const remain = base - spent;

    const row = document.createElement("tr");
    row.innerHTML = `
      <td><input type="text" value="${escapeHtml(name)}" data-type="company" data-field="기업명" data-index="${index}"></td>
      <td><input type="number" value="${base}" data-type="company" data-field="기본포인트" data-index="${index}"></td>
      <td><input type="number" value="${spent}" class="readonly" readonly></td>
      <td><input type="number" value="${remain}" class="readonly" readonly></td>
      <td><button class="delete-row-btn" data-type="company" data-index="${index}">삭제</button></td>
    `;
    tbody.appendChild(row);
  });

  tbody.querySelectorAll(".delete-row-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const idx = parseInt(e.target.dataset.index, 10);
      state.companies.splice(idx, 1);
      renderCompaniesTable();
    });
  });

  tbody.querySelectorAll("input[data-type='company']").forEach(inp => {
    inp.addEventListener("input", (e) => {
      const i = parseInt(e.target.dataset.index, 10);
      const field = e.target.dataset.field;
      state.companies[i][field] = (field === "기본포인트") ? n(e.target.value) : e.target.value;
    });
  });
}

function renderTeamsTable() {
  const tbody = document.querySelector("#teamsTable tbody");
  tbody.innerHTML = "";

  const { raisedByTeam, uniqueBackersByTeam } = computeAggregates();

  state.teams.forEach((t, index) => {
    const teamName = String(t["팀명"] ?? "").trim();
    const goal = n(t["목표포인트"]);
    const raised = raisedByTeam.get(teamName) || 0;
    const backers = uniqueBackersByTeam.has(teamName) ? uniqueBackersByTeam.get(teamName).size : 0;

    const row = document.createElement("tr");
    row.innerHTML = `
      <td><input type="text" value="${escapeHtml(teamName)}" data-type="team" data-field="팀명" data-index="${index}"></td>
      <td><input type="text" value="${escapeHtml(t["아이템명"] ?? "")}" data-type="team" data-field="아이템명" data-index="${index}"></td>
      <td><input type="text" value="${escapeHtml(t["카테고리"] ?? "")}" data-type="team" data-field="카테고리" data-index="${index}"></td>
      <td><input type="text" value="${escapeHtml(t["한줄소개"] ?? "")}" data-type="team" data-field="한줄소개" data-index="${index}"></td>
      <td><textarea data-type="team" data-field="상세설명" data-index="${index}">${escapeHtml(t["상세설명"] ?? "")}</textarea></td>
      <td><input type="number" value="${goal}" data-type="team" data-field="목표포인트" data-index="${index}"></td>
      <td><input type="number" value="${raised}" class="readonly" readonly></td>
      <td><input type="number" value="${backers}" class="readonly" readonly></td>
      <td><button class="delete-row-btn" data-type="team" data-index="${index}">삭제</button></td>
    `;
    tbody.appendChild(row);
  });

  tbody.querySelectorAll(".delete-row-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const idx = parseInt(e.target.dataset.index, 10);
      state.teams.splice(idx, 1);
      renderTeamsTable();
    });
  });

  tbody.querySelectorAll("[data-type='team']").forEach(inp => {
    inp.addEventListener("input", (e) => {
      const i = parseInt(e.target.dataset.index, 10);
      const field = e.target.dataset.field;
      state.teams[i][field] = (field === "목표포인트") ? n(e.target.value) : e.target.value;
    });
  });
}

function renderInvestmentsTable() {
  const tbody = document.querySelector("#investmentsTable tbody");
  tbody.innerHTML = "";

  state.investments.forEach((inv, index) => {
    const tsRaw = inv["일시"];
    const tsIso = toISO(tsRaw);
    const companyName = String(inv["기업명"] ?? "").trim();
    const teamName = String(inv["팀명"] ?? "").trim();
    const amount = n(inv["투자금액"] ?? 0);

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${escapeHtml(formatDateKOR(tsRaw))}</td>
      <td>${escapeHtml(companyName)}</td>
      <td>${escapeHtml(teamName)}</td>
      <td>${amount.toLocaleString()}</td>
      <td><button class="delete-row-btn" data-index="${index}">삭제</button></td>
    `;
    tbody.appendChild(row);

    row.querySelector(".delete-row-btn").addEventListener("click", async () => {
      if (!confirm("이 투자내역을 삭제할까요?")) return;
      try {
        const resp = await apiPost("deleteInvestment", { ts: tsIso, companyName, teamName, amount });
        if (!resp.success) throw new Error(resp.error || "delete failed");
        await loadFromSheet();
        renderAdminAll();
        showToast("삭제되었습니다");
      } catch (e) {
        console.error(e);
        showToast("삭제에 실패했습니다", true);
      }
    });
  });
}

document.getElementById("addCompanyBtn").addEventListener("click", () => {
  state.companies.push({ "기업명": "", "기본포인트": 0 });
  renderCompaniesTable();
});
document.getElementById("addTeamBtn").addEventListener("click", () => {
  state.teams.push({
    "팀명": "",
    "아이템명": "",
    "카테고리": "",
    "한줄소개": "",
    "상세설명": "",
    "목표포인트": 0
  });
  renderTeamsTable();
});

document.getElementById("saveAdminBtn").addEventListener("click", async () => {
  try {
    // 간단 검증
    const companyNames = new Set();
    for (const c of state.companies) {
      const name = String(c["기업명"] ?? "").trim();
      if (!name) return showToast("기업명을 입력해주세요", true);
      if (companyNames.has(name)) return showToast(`기업명 중복: ${name}`, true);
      companyNames.add(name);
    }
    const teamNames = new Set();
    for (const t of state.teams) {
      const name = String(t["팀명"] ?? "").trim();
      if (!name) return showToast("팀명을 입력해주세요", true);
      if (teamNames.has(name)) return showToast(`팀명 중복: ${name}`, true);
      teamNames.add(name);
    }

    const r1 = await apiPost("saveCompanies", { companies: state.companies });
    if (!r1.success) throw new Error("saveCompanies failed");

    const r2 = await apiPost("saveTeams", { teams: state.teams });
    if (!r2.success) throw new Error("saveTeams failed");

    await loadFromSheet();
    renderAdminAll();
    showToast("적용되었습니다");
  } catch (e) {
    console.error(e);
    showToast("저장에 실패했습니다", true);
  }
});

document.getElementById("clearInvestmentsBtn").addEventListener("click", async () => {
  if (!confirm("모든 투자내역을 삭제하시겠습니까?")) return;
  try {
    const r = await apiPost("clearInvestments", {});
    if (!r.success) throw new Error("clear failed");
    await loadFromSheet();
    renderAdminAll();
    showToast("투자내역이 모두 삭제되었습니다");
  } catch (e) {
    console.error(e);
    showToast("전체 삭제에 실패했습니다", true);
  }
});

// ===== Company Page =====
function initCompanyPageLocked(companyName) {
  document.getElementById("fixedCompanyName").textContent = companyName;

  document.getElementById("companyResetBtn").onclick = () => resetToEntry();

  renderCompanyPage(companyName);
}

async function renderCompanyPage(companyName) {
  try {
    if (state.companies.length === 0 || state.teams.length === 0) {
      await loadFromSheet();
    }

    const { spentByCompany } = computeAggregates();
    const company = state.companies.find(c => String(c["기업명"] ?? "").trim() === companyName);
    if (!company) return showToast("기업 정보를 찾을 수 없습니다", true);

    const base = n(company["기본포인트"]);
    const spent = spentByCompany.get(companyName) || 0;
    const remain = base - spent;

    document.getElementById("basePoints").textContent = base.toLocaleString();
    document.getElementById("spentPoints").textContent = spent.toLocaleString();
    document.getElementById("remainPoints").textContent = remain.toLocaleString();
    document.getElementById("companyInfo").style.display = "block";

    renderTeams(companyName);
    renderMyInvestSummary(companyName);
  } catch (e) {
    console.error(e);
    showToast("데이터를 불러오지 못했습니다", true);
  }
}

function renderTeams(companyName) {
  const container = document.getElementById("teamsContainer");
  container.innerHTML = "";

  const { raisedByTeam, uniqueBackersByTeam } = computeAggregates();

  state.teams.forEach(team => {
    const teamName = String(team["팀명"] ?? "").trim();
    const itemName = String(team["아이템명"] ?? "");
    const category = String(team["카테고리"] ?? "");
    const oneLine = String(team["한줄소개"] ?? "");
    const detail = String(team["상세설명"] ?? "");
    const goal = n(team["목표포인트"]);
    const raised = raisedByTeam.get(teamName) || 0;
    const backers = uniqueBackersByTeam.has(teamName) ? uniqueBackersByTeam.get(teamName).size : 0;

    const percentage = goal > 0 ? Math.round((raised / goal) * 100) : 0; // 120%, 130% 가능
    const progressWidth = Math.min(Math.max(percentage, 0), 100); // 바는 100%까지만

    const card = document.createElement("div");
    card.className = "team-card";
    card.innerHTML = `
      <div class="team-header">
        <div class="team-name">${escapeHtml(teamName)}</div>
        <span class="team-category">${escapeHtml(category)}</span>
      </div>
      <div class="team-item">${escapeHtml(itemName)}</div>
      <div class="team-oneline">${escapeHtml(oneLine)}</div>
      <div class="team-detail">${escapeHtml(detail)}</div>

      <div class="progress-section">
        <div class="progress-info">
          <span>${raised.toLocaleString()} / ${goal.toLocaleString()} 포인트</span>
          <span>${percentage}%</span>
        </div>
        <div class="progress-bar-container">
          <div class="progress-bar" style="width:${progressWidth}%"></div>
        </div>
        <div class="investor-count">투자자: ${backers}명</div>
      </div>

      <div class="investment-section">
        <div class="investment-notice">투자포인트(한번 투자하면 수정이 불가하니 신중히 투자해 주세요)</div>
        <div class="investment-input-group">
          <input type="text" class="investment-input" placeholder="투자 포인트 입력" data-team="${escapeHtml(teamName)}">
          <button class="invest-btn" data-team="${escapeHtml(teamName)}">투자하기</button>
        </div>
        <div class="input-error" data-team="${escapeHtml(teamName)}"></div>
      </div>
    `;

    const input = card.querySelector(".investment-input");
    const errorDiv = card.querySelector(".input-error");

    // 숫자만
    input.addEventListener("input", (e) => {
      const raw = e.target.value;
      const cleaned = raw.replace(/[^0-9]/g, "");
      if (raw !== cleaned) {
        e.target.value = cleaned;
        errorDiv.textContent = "숫자만 입력해주세요";
        e.target.classList.add("error");
      } else {
        errorDiv.textContent = "";
        e.target.classList.remove("error");
      }
    });

    card.querySelector(".invest-btn").addEventListener("click", async () => {
      await handleInvestment(companyName, teamName);
    });

    container.appendChild(card);
  });
}

async function handleInvestment(companyName, teamName) {
  const input = document.querySelector(`.investment-input[data-team="${cssEscape(teamName)}"]`);
  const errorDiv = document.querySelector(`.input-error[data-team="${cssEscape(teamName)}"]`);
  const value = (input?.value || "").trim();

  if (!value) { errorDiv.textContent = "투자 포인트를 입력해주세요"; return; }
  if (!/^\d+$/.test(value)) { errorDiv.textContent = "숫자만 입력해주세요"; return; }

  const amount = parseInt(value, 10);
  if (amount <= 0) { errorDiv.textContent = "0보다 큰 금액을 입력해주세요"; return; }

  // 잔액 체크
  const { spentByCompany } = computeAggregates();
  const company = state.companies.find(c => String(c["기업명"] ?? "").trim() === companyName);
  if (!company) return showToast("기업 정보를 찾을 수 없습니다", true);

  const base = n(company["기본포인트"]);
  const spent = spentByCompany.get(companyName) || 0;
  const remain = base - spent;
  if (amount > remain) return showToast("포인트가 부족합니다", true);

  try {
    const resp = await apiPost("invest", { companyName, teamName, amount });
    if (!resp.success) throw new Error(resp.error || "invest failed");

    // 성공 시 최신 재로딩(공유 반영)
    await loadFromSheet();

    input.value = "";
    errorDiv.textContent = "";
    renderCompanyPage(companyName);

    showToast("투자가 완료되었습니다");
  } catch (e) {
    console.error(e);
    showToast("투자에 실패했습니다", true);
  }
}

function renderMyInvestSummary(companyName) {
  const wrap = document.getElementById("myInvestSummary");
  const list = document.getElementById("myInvestList");

  const invs = state.investments
    .map(inv => ({
      company: String(inv["기업명"] ?? "").trim(),
      team: String(inv["팀명"] ?? "").trim(),
      amt: n(inv["투자금액"] ?? 0),
    }))
    .filter(x => x.company === companyName && x.team && x.amt > 0);

  if (invs.length === 0) {
    wrap.style.display = "none";
    return;
  }

  const sumByTeam = new Map();
  for (const inv of invs) sumByTeam.set(inv.team, (sumByTeam.get(inv.team) || 0) + inv.amt);

  wrap.style.display = "block";
  list.innerHTML = "";
  [...sumByTeam.entries()].forEach(([team, total]) => {
    const row = document.createElement("div");
    row.className = "my-invest-row";
    row.innerHTML = `<div class="mi-team">${escapeHtml(team)}</div><div class="mi-amt">${Number(total).toLocaleString()} P</div>`;
    list.appendChild(row);
  });
}

// ===== 시작 =====
entryModal.style.display = "flex";
resetToEntry();
