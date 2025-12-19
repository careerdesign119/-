const ADMIN_PASSWORD = "123456789";
const STORAGE_KEYS = {
  companies: "mockFunding_companies",
  teams: "mockFunding_teams",
  investments: "mockFunding_investments",
};

const SAMPLE_DATA = {
  companies: [
    { name: "테크스타트", basePoints: 100000, spentPoints: 0 },
    { name: "이노베이션", basePoints: 150000, spentPoints: 0 },
    { name: "퓨처벤처", basePoints: 200000, spentPoints: 0 },
  ],
  teams: [
    {
      teamName: "AI혁신팀",
      itemName: "스마트 AI 비서",
      category: "인공지능",
      oneLine: "일상을 더 편리하게 만드는 AI 비서",
      detail: "음성인식과 자연어 처리 기술을 활용한 개인 맞춤형 AI 비서 서비스입니다.",
      goalPoints: 50000,
      raisedPoints: 0,
      backerCount: 0,
    },
  ],
  investments: [],
};

function initStorage() {
  if (!localStorage.getItem(STORAGE_KEYS.companies)) {
    localStorage.setItem(STORAGE_KEYS.companies, JSON.stringify(SAMPLE_DATA.companies));
  }
  if (!localStorage.getItem(STORAGE_KEYS.teams)) {
    localStorage.setItem(STORAGE_KEYS.teams, JSON.stringify(SAMPLE_DATA.teams));
  }
  if (!localStorage.getItem(STORAGE_KEYS.investments)) {
    localStorage.setItem(STORAGE_KEYS.investments, JSON.stringify(SAMPLE_DATA.investments));
  }
}
function getData(key) {
  const data = localStorage.getItem(STORAGE_KEYS[key]);
  return data ? JSON.parse(data) : [];
}
function saveData(key, data) {
  localStorage.setItem(STORAGE_KEYS[key], JSON.stringify(data));
}
function showToast(message, isError = false) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.className = "toast show" + (isError ? " error" : "");
  setTimeout(() => (toast.className = "toast"), 1000);
}

/** =========================
 *  집계 재계산 (투자내역이 '진실')
 *  - companies.spentPoints = 투자내역 합
 *  - teams.raisedPoints   = 투자내역 합
 *  - teams.backerCount    = 팀에 투자한 고유 기업 수
 * ========================= */
function recomputeAggregatesFromInvestments() {
  const companies = getData("companies");
  const teams = getData("teams");
  const investments = getData("investments");

  const spentByCompany = new Map();
  const raisedByTeam = new Map();
  const uniqueBackersByTeam = new Map(); // teamName -> Set(companyName)

  for (const inv of investments) {
    const c = String(inv.companyName || "").trim();
    const t = String(inv.teamName || "").trim();
    const amt = Number(inv.amount || 0);
    if (!c || !t || !Number.isFinite(amt)) continue;

    spentByCompany.set(c, (spentByCompany.get(c) || 0) + amt);
    raisedByTeam.set(t, (raisedByTeam.get(t) || 0) + amt);

    if (!uniqueBackersByTeam.has(t)) uniqueBackersByTeam.set(t, new Set());
    uniqueBackersByTeam.get(t).add(c);
  }

  for (const c of companies) {
    const name = String(c.name || "").trim();
    c.spentPoints = spentByCompany.get(name) || 0;
  }

  for (const t of teams) {
    const tn = String(t.teamName || "").trim();
    t.raisedPoints = raisedByTeam.get(tn) || 0;
    t.backerCount = uniqueBackersByTeam.has(tn) ? uniqueBackersByTeam.get(tn).size : 0;
  }

  saveData("companies", companies);
  saveData("teams", teams);
}

/** ===== 화면 참조 ===== */
const entryModal = document.getElementById("entryModal");
const passwordModal = document.getElementById("passwordModal");
const adminPage = document.getElementById("adminPage");
const companyPage = document.getElementById("companyPage");

const entryStepType = document.getElementById("entryStepType");
const entryStepCompany = document.getElementById("entryStepCompany");
const entryCompanySelect = document.getElementById("entryCompanySelect");

let selectedCompanyName = "";

/** ===== 시작 ===== */
initStorage();
recomputeAggregatesFromInvestments();

entryModal.style.display = "flex";

/** ===== entry 모달 ===== */
document.getElementById("adminBtn").addEventListener("click", () => {
  entryModal.style.display = "none";
  passwordModal.style.display = "flex";
});

document.getElementById("companyBtn").addEventListener("click", () => {
  entryStepType.style.display = "none";
  entryStepCompany.style.display = "block";

  const companies = getData("companies");
  entryCompanySelect.innerHTML = `<option value="">기업을 선택하세요</option>`;
  companies.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c.name;
    opt.textContent = c.name;
    entryCompanySelect.appendChild(opt);
  });
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

/** ===== 비번 모달 ===== */
document.getElementById("passwordCancel").addEventListener("click", () => {
  passwordModal.style.display = "none";
  entryModal.style.display = "flex";

  entryStepCompany.style.display = "none";
  entryStepType.style.display = "block";
  entryCompanySelect.value = "";

  document.getElementById("passwordInput").value = "";
  document.getElementById("passwordError").textContent = "";
});

document.getElementById("passwordSubmit").addEventListener("click", () => {
  const input = document.getElementById("passwordInput").value;
  if (input === ADMIN_PASSWORD) {
    passwordModal.style.display = "none";
    adminPage.style.display = "block";
    initAdminPage();
  } else {
    document.getElementById("passwordError").textContent = "비밀번호가 일치하지 않습니다";
  }
});

document.getElementById("passwordInput").addEventListener("keypress", (e) => {
  if (e.key === "Enter") document.getElementById("passwordSubmit").click();
});

/** ===== 탭 전환 ===== */
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const tabName = btn.dataset.tab;

    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("active"));

    btn.classList.add("active");
    document.getElementById(tabName + "Tab").classList.add("active");
  });
});

/** =========================
 *  관리자 페이지
 * ========================= */
function initAdminPage() {
  // 관리자 들어올 때마다 투자내역 기준으로 집계 최신화
  recomputeAggregatesFromInvestments();
  renderCompaniesTable();
  renderTeamsTable();
  renderInvestmentsTable();
}

/** ✅ 기업목록: spent/remain 수정 불가 */
function renderCompaniesTable() {
  recomputeAggregatesFromInvestments();
  const companies = getData("companies");
  const tbody = document.querySelector("#companiesTable tbody");
  tbody.innerHTML = "";

  companies.forEach((company, index) => {
    const spent = Number(company.spentPoints || 0);
    const base = Number(company.basePoints || 0);
    const remain = base - spent;

    const row = document.createElement("tr");
    row.innerHTML = `
      <td><input type="text" value="${escapeHtml(company.name)}" data-field="name" data-index="${index}"></td>
      <td><input type="number" value="${base}" data-field="basePoints" data-index="${index}"></td>
      <td><input type="number" value="${spent}" class="readonly" readonly></td>
      <td><input type="number" value="${remain}" class="readonly" readonly></td>
      <td><button class="delete-row-btn" data-index="${index}">삭제</button></td>
    `;
    tbody.appendChild(row);
  });

  document.querySelectorAll("#companiesTable .delete-row-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const index = parseInt(e.target.dataset.index, 10);
      const companies = getData("companies");
      companies.splice(index, 1);
      saveData("companies", companies);

      // 기업 삭제해도 투자내역은 남아있을 수 있으니 정합 재계산
      recomputeAggregatesFromInvestments();
      renderCompaniesTable();
      renderInvestmentsTable();
    });
  });
}

document.getElementById("addCompanyBtn").addEventListener("click", () => {
  const companies = getData("companies");
  companies.push({ name: "", basePoints: 0, spentPoints: 0 });
  saveData("companies", companies);
  renderCompaniesTable();
});

/** ✅ 팀목록: raised/backer 수정 불가 */
function renderTeamsTable() {
  recomputeAggregatesFromInvestments();
  const teams = getData("teams");
  const tbody = document.querySelector("#teamsTable tbody");
  tbody.innerHTML = "";

  teams.forEach((team, index) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><input type="text" value="${escapeHtml(team.teamName)}" data-field="teamName" data-index="${index}"></td>
      <td><input type="text" value="${escapeHtml(team.itemName)}" data-field="itemName" data-index="${index}"></td>
      <td><input type="text" value="${escapeHtml(team.category)}" data-field="category" data-index="${index}"></td>
      <td><input type="text" value="${escapeHtml(team.oneLine)}" data-field="oneLine" data-index="${index}"></td>
      <td><textarea data-field="detail" data-index="${index}">${escapeHtml(team.detail)}</textarea></td>
      <td><input type="number" value="${Number(team.goalPoints || 0)}" data-field="goalPoints" data-index="${index}"></td>
      <td><input type="number" value="${Number(team.raisedPoints || 0)}" class="readonly" readonly></td>
      <td><input type="number" value="${Number(team.backerCount || 0)}" class="readonly" readonly></td>
      <td><button class="delete-row-btn" data-index="${index}">삭제</button></td>
    `;
    tbody.appendChild(row);
  });

  document.querySelectorAll("#teamsTable .delete-row-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const index = parseInt(e.target.dataset.index, 10);
      const teams = getData("teams");
      teams.splice(index, 1);
      saveData("teams", teams);

      recomputeAggregatesFromInvestments();
      renderTeamsTable();
      renderInvestmentsTable();
    });
  });
}

document.getElementById("addTeamBtn").addEventListener("click", () => {
  const teams = getData("teams");
  teams.push({
    teamName: "",
    itemName: "",
    category: "",
    oneLine: "",
    detail: "",
    goalPoints: 0,
    raisedPoints: 0,
    backerCount: 0,
  });
  saveData("teams", teams);
  renderTeamsTable();
});

/** 투자내역 렌더링(삭제 시 집계 연동) */
function renderInvestmentsTable() {
  const investments = getData("investments");
  const tbody = document.querySelector("#investmentsTable tbody");
  tbody.innerHTML = "";

  investments.forEach((inv, index) => {
    const row = document.createElement("tr");
    const date = new Date(inv.ts).toLocaleString("ko-KR");
    row.innerHTML = `
      <td>${date}</td>
      <td>${escapeHtml(inv.companyName)}</td>
      <td>${escapeHtml(inv.teamName)}</td>
      <td>${escapeHtml(inv.itemName)}</td>
      <td>${Number(inv.amount || 0).toLocaleString()}</td>
      <td><button class="delete-row-btn" data-index="${index}">삭제</button></td>
    `;
    tbody.appendChild(row);
  });

  document.querySelectorAll("#investmentsTable .delete-row-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const index = parseInt(e.target.dataset.index, 10);
      const investments = getData("investments");
      investments.splice(index, 1);
      saveData("investments", investments);

      // ✅ 투자내역이 바뀌면 집계는 항상 재계산
      recomputeAggregatesFromInvestments();
      renderInvestmentsTable();
      renderCompaniesTable();
      renderTeamsTable();

      showToast("삭제되었습니다");
    });
  });
}

document.getElementById("clearInvestmentsBtn").addEventListener("click", () => {
  if (!confirm("모든 투자내역을 삭제하시겠습니까?")) return;

  saveData("investments", []);
  recomputeAggregatesFromInvestments();

  renderInvestmentsTable();
  renderCompaniesTable();
  renderTeamsTable();

  showToast("투자내역이 모두 삭제되었습니다");
});

/** ✅ 관리자 수정 버튼: 집계값은 건드리지 않음(투자내역이 결정) */
document.getElementById("saveAdminBtn").addEventListener("click", () => {
  let hasError = false;

  // 기업: name + basePoints만 저장
  const companies = [];
  const companyNames = new Set();
  document.querySelectorAll("#companiesTable tbody tr").forEach((row) => {
    const name = row.querySelector("input[data-field='name']").value.trim();
    const basePoints = parseInt(row.querySelector("input[data-field='basePoints']").value, 10) || 0;

    if (!name) { showToast("기업명을 입력해주세요", true); hasError = true; return; }
    if (companyNames.has(name)) { showToast(`기업명 중복: ${name}`, true); hasError = true; return; }

    companyNames.add(name);
    companies.push({ name, basePoints, spentPoints: 0 }); // spentPoints는 재계산
  });
  if (hasError) return;

  // 팀: 기본정보 + goalPoints만 저장
  const teams = [];
  const teamNames = new Set();
  document.querySelectorAll("#teamsTable tbody tr").forEach((row) => {
    const teamName = row.querySelector("input[data-field='teamName']").value.trim();
    const itemName = row.querySelector("input[data-field='itemName']").value.trim();
    const category = row.querySelector("input[data-field='category']").value.trim();
    const oneLine = row.querySelector("input[data-field='oneLine']").value.trim();
    const detail = row.querySelector("textarea[data-field='detail']").value.trim();
    const goalPoints = parseInt(row.querySelector("input[data-field='goalPoints']").value, 10) || 0;

    if (!teamName) { showToast("팀명을 입력해주세요", true); hasError = true; return; }
    if (teamNames.has(teamName)) { showToast(`팀명 중복: ${teamName}`, true); hasError = true; return; }

    teamNames.add(teamName);
    teams.push({ teamName, itemName, category, oneLine, detail, goalPoints, raisedPoints: 0, backerCount: 0 });
  });
  if (hasError) return;

  saveData("companies", companies);
  saveData("teams", teams);

  // ✅ 저장 후 투자내역 기준으로 집계 다시 맞춤
  recomputeAggregatesFromInvestments();

  renderCompaniesTable();
  renderTeamsTable();
  renderInvestmentsTable();

  showToast("적용되었습니다");
});

/** =========================
 *  기업 페이지(기업 고정)
 * ========================= */
function initCompanyPageLocked(companyName) {
  document.getElementById("companySelectorWrap").style.display = "none";
  document.getElementById("fixedCompanyName").textContent = companyName;

  loadCompanyInfo(companyName);
  loadTeams(companyName);
  renderMyInvestSummary(companyName);

  document.getElementById("companyResetBtn").onclick = () => {
    selectedCompanyName = "";
    companyPage.style.display = "none";
    entryModal.style.display = "flex";
    entryStepCompany.style.display = "none";
    entryStepType.style.display = "block";
    entryCompanySelect.value = "";
    document.getElementById("teamsContainer").innerHTML = "";
    document.getElementById("companyInfo").style.display = "none";
    document.getElementById("myInvestSummary").style.display = "none";
  };
}

function loadCompanyInfo(companyName) {
  recomputeAggregatesFromInvestments();
  const companies = getData("companies");
  const company = companies.find((c) => c.name === companyName);
  if (!company) return showToast("기업 정보를 찾을 수 없습니다", true);

  const base = Number(company.basePoints || 0);
  const spent = Number(company.spentPoints || 0);
  const remain = base - spent;

  document.getElementById("basePoints").textContent = base.toLocaleString();
  document.getElementById("spentPoints").textContent = spent.toLocaleString();
  document.getElementById("remainPoints").textContent = remain.toLocaleString();
  document.getElementById("companyInfo").style.display = "block";
}

function loadTeams(companyName) {
  recomputeAggregatesFromInvestments();
  const teams = getData("teams");
  const container = document.getElementById("teamsContainer");
  container.innerHTML = "";

  teams.forEach((team) => {
    container.appendChild(createTeamCard(team, companyName));
  });
}

function createTeamCard(team, companyName) {
  const card = document.createElement("div");
  card.className = "team-card";

  const goal = Number(team.goalPoints || 0);
  const raised = Number(team.raisedPoints || 0);
  const percentage = goal > 0 ? Math.round((raised / goal) * 100) : 0;
  const progressWidth = Math.min(Math.max(percentage, 0), 100);

  card.innerHTML = `
    <div class="team-header">
      <div class="team-name">${escapeHtml(team.teamName)}</div>
      <span class="team-category">${escapeHtml(team.category)}</span>
    </div>
    <div class="team-item">${escapeHtml(team.itemName)}</div>
    <div class="team-oneline">${escapeHtml(team.oneLine)}</div>
    <div class="team-detail">${escapeHtml(team.detail)}</div>

    <div class="progress-section">
      <div class="progress-info">
        <span>${raised.toLocaleString()} / ${goal.toLocaleString()} 포인트</span>
        <span>${percentage}%</span>
      </div>
      <div class="progress-bar-container">
        <div class="progress-bar" style="width:${progressWidth}%"></div>
      </div>
      <div class="investor-count">투자자: ${Number(team.backerCount || 0)}명</div>
    </div>

    <div class="investment-section">
      <div class="investment-notice">투자포인트(한번 투자하면 수정이 불가하니 신중히 투자해 주세요)</div>
      <div class="investment-input-group">
        <input type="text" class="investment-input" placeholder="투자 포인트 입력" data-team="${escapeAttr(team.teamName)}">
        <button class="invest-btn" data-team="${escapeAttr(team.teamName)}">투자하기</button>
      </div>
      <div class="input-error" data-team="${escapeAttr(team.teamName)}"></div>
    </div>
  `;

  const input = card.querySelector(".investment-input");
  const errorDiv = card.querySelector(".input-error");

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

  card.querySelector(".invest-btn").addEventListener("click", () => {
    handleInvestment(companyName, team.teamName);
  });

  return card;
}

function handleInvestment(companyName, teamName) {
  const input = document.querySelector(`.investment-input[data-team="${cssEscape(teamName)}"]`);
  const errorDiv = document.querySelector(`.input-error[data-team="${cssEscape(teamName)}"]`);
  const value = (input?.value || "").trim();

  if (!value) { errorDiv.textContent = "투자 포인트를 입력해주세요"; return; }
  if (!/^\d+$/.test(value)) { errorDiv.textContent = "숫자만 입력해주세요"; return; }

  const amount = parseInt(value, 10);
  if (amount <= 0) { errorDiv.textContent = "0보다 큰 금액을 입력해주세요"; return; }

  recomputeAggregatesFromInvestments();

  const companies = getData("companies");
  const company = companies.find((c) => c.name === companyName);
  if (!company) return showToast("기업 정보를 찾을 수 없습니다", true);

  const remain = Number(company.basePoints || 0) - Number(company.spentPoints || 0);
  if (amount > remain) return showToast("포인트가 부족합니다", true);

  const team = getData("teams").find((t) => t.teamName === teamName);
  if (!team) return showToast("팀 정보를 찾을 수 없습니다", true);

  const investments = getData("investments");
  investments.push({
    ts: Date.now(),
    companyName,
    teamName,
    itemName: team.itemName,
    amount,
  });
  saveData("investments", investments);

  // ✅ 투자내역 기준 재집계(중복 투자자 제거)
  recomputeAggregatesFromInvestments();

  input.value = "";
  errorDiv.textContent = "";
  loadCompanyInfo(companyName);
  loadTeams(companyName);
  renderMyInvestSummary(companyName);

  showToast("투자가 완료되었습니다");
}

function renderMyInvestSummary(companyName) {
  const wrap = document.getElementById("myInvestSummary");
  const list = document.getElementById("myInvestList");

  const investments = getData("investments").filter((inv) => inv.companyName === companyName);
  if (investments.length === 0) { wrap.style.display = "none"; return; }

  const sumByTeam = new Map();
  for (const inv of investments) {
    sumByTeam.set(inv.teamName, (sumByTeam.get(inv.teamName) || 0) + Number(inv.amount || 0));
  }

  wrap.style.display = "block";
  list.innerHTML = "";
  [...sumByTeam.entries()].forEach(([teamName, total]) => {
    const row = document.createElement("div");
    row.className = "my-invest-row";
    row.innerHTML = `<div class="mi-team">${escapeHtml(teamName)}</div><div class="mi-amt">${Number(total).toLocaleString()} P</div>`;
    list.appendChild(row);
  });
}

/** Utils */
function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function escapeAttr(str) { return escapeHtml(str); }
function cssEscape(str) { return String(str).replace(/\\/g, "\\\\").replace(/"/g, '\\"'); }
