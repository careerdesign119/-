// 상수
const ADMIN_PASSWORD = "123456789";
const STORAGE_KEYS = {
    companies: "mockFunding_companies",
    teams: "mockFunding_teams",
    investments: "mockFunding_investments"
};

// 초기 샘플 데이터
const SAMPLE_DATA = {
    companies: [
        { name: "테크스타트", basePoints: 100000, spentPoints: 0 },
        { name: "이노베이션", basePoints: 150000, spentPoints: 0 },
        { name: "퓨처벤처", basePoints: 200000, spentPoints: 0 }
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
            backerCount: 0
        },
        {
            teamName: "그린에너지",
            itemName: "태양광 충전 스테이션",
            category: "친환경",
            oneLine: "어디서나 친환경 에너지로 충전하세요",
            detail: "태양광을 활용한 이동식 충전 스테이션으로 친환경 에너지 사용을 확대합니다.",
            goalPoints: 80000,
            raisedPoints: 0,
            backerCount: 0
        },
        {
            teamName: "헬스케어",
            itemName: "스마트 건강관리 앱",
            category: "헬스케어",
            oneLine: "개인 맞춤형 건강관리 솔루션",
            detail: "AI 기반 건강 데이터 분석으로 개인에게 최적화된 건강관리 서비스를 제공합니다.",
            goalPoints: 60000,
            raisedPoints: 0,
            backerCount: 0
        }
    ],
    investments: []
};

// 로컬스토리지 초기화
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

// 데이터 가져오기
function getData(key) {
    const data = localStorage.getItem(STORAGE_KEYS[key]);
    return data ? JSON.parse(data) : [];
}

// 데이터 저장하기
function saveData(key, data) {
    localStorage.setItem(STORAGE_KEYS[key], JSON.stringify(data));
}

// 토스트 표시
function showToast(message, isError = false) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.className = "toast show" + (isError ? " error" : "");
    setTimeout(() => {
        toast.className = "toast";
    }, 1000);
}

// 모달 관리
const entryModal = document.getElementById("entryModal");
const passwordModal = document.getElementById("passwordModal");
const adminPage = document.getElementById("adminPage");
const companyPage = document.getElementById("companyPage");

document.getElementById("adminBtn").addEventListener("click", () => {
    entryModal.style.display = "none";
    passwordModal.style.display = "flex";
});

document.getElementById("companyBtn").addEventListener("click", () => {
    entryModal.style.display = "none";
    companyPage.style.display = "block";
    initCompanyPage();
});

document.getElementById("passwordCancel").addEventListener("click", () => {
    passwordModal.style.display = "none";
    entryModal.style.display = "flex";
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
    if (e.key === "Enter") {
        document.getElementById("passwordSubmit").click();
    }
});

// 탭 전환
document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        const tabName = btn.dataset.tab;
        
        document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
        document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
        
        btn.classList.add("active");
        document.getElementById(tabName + "Tab").classList.add("active");
    });
});

// 관리자 페이지 초기화
function initAdminPage() {
    renderCompaniesTable();
    renderTeamsTable();
    renderInvestmentsTable();
}

// 기업 목록 렌더링
function renderCompaniesTable() {
    const companies = getData("companies");
    const tbody = document.querySelector("#companiesTable tbody");
    tbody.innerHTML = "";
    
    companies.forEach((company, index) => {
        const row = document.createElement("tr");
        const remainPoints = company.basePoints - company.spentPoints;
        
        row.innerHTML = `
            <td><input type="text" value="${company.name}" data-field="name" data-index="${index}"></td>
            <td><input type="number" value="${company.basePoints}" data-field="basePoints" data-index="${index}"></td>
            <td><input type="number" value="${company.spentPoints}" data-field="spentPoints" data-index="${index}"></td>
            <td><input type="number" value="${remainPoints}" class="readonly" readonly></td>
            <td><button class="delete-row-btn" data-index="${index}">삭제</button></td>
        `;
        tbody.appendChild(row);
    });
    
    // 삭제 버튼 이벤트
    document.querySelectorAll("#companiesTable .delete-row-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const index = parseInt(e.target.dataset.index);
            const companies = getData("companies");
            companies.splice(index, 1);
            renderCompaniesTable();
        });
    });
    
    // 입력 이벤트 (남은포인트 자동 계산)
    document.querySelectorAll("#companiesTable input[data-field]").forEach(input => {
        input.addEventListener("input", (e) => {
            const row = e.target.closest("tr");
            const baseInput = row.querySelector("input[data-field='basePoints']");
            const spentInput = row.querySelector("input[data-field='spentPoints']");
            const remainInput = row.querySelector(".readonly");
            
            const base = parseInt(baseInput.value) || 0;
            const spent = parseInt(spentInput.value) || 0;
            remainInput.value = base - spent;
        });
    });
}

// 기업 추가
document.getElementById("addCompanyBtn").addEventListener("click", () => {
    const companies = getData("companies");
    companies.push({ name: "", basePoints: 0, spentPoints: 0 });
    renderCompaniesTable();
});

// 팀 목록 렌더링
function renderTeamsTable() {
    const teams = getData("teams");
    const tbody = document.querySelector("#teamsTable tbody");
    tbody.innerHTML = "";
    
    teams.forEach((team, index) => {
        const row = document.createElement("tr");
        
        row.innerHTML = `
            <td><input type="text" value="${team.teamName}" data-field="teamName" data-index="${index}"></td>
            <td><input type="text" value="${team.itemName}" data-field="itemName" data-index="${index}"></td>
            <td><input type="text" value="${team.category}" data-field="category" data-index="${index}"></td>
            <td><input type="text" value="${team.oneLine}" data-field="oneLine" data-index="${index}"></td>
            <td><textarea data-field="detail" data-index="${index}">${team.detail}</textarea></td>
            <td><input type="number" value="${team.goalPoints}" data-field="goalPoints" data-index="${index}"></td>
            <td><input type="number" value="${team.raisedPoints}" data-field="raisedPoints" data-index="${index}"></td>
            <td><input type="number" value="${team.backerCount}" data-field="backerCount" data-index="${index}"></td>
            <td><button class="delete-row-btn" data-index="${index}">삭제</button></td>
        `;
        tbody.appendChild(row);
    });
    
    // 삭제 버튼 이벤트
    document.querySelectorAll("#teamsTable .delete-row-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const index = parseInt(e.target.dataset.index);
            const teams = getData("teams");
            teams.splice(index, 1);
            renderTeamsTable();
        });
    });
}

// 팀 추가
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
        backerCount: 0
    });
    renderTeamsTable();
});

// 투자내역 렌더링
function renderInvestmentsTable() {
    const investments = getData("investments");
    const tbody = document.querySelector("#investmentsTable tbody");
    tbody.innerHTML = "";
    
    investments.forEach((inv, index) => {
        const row = document.createElement("tr");
        const date = new Date(inv.ts).toLocaleString("ko-KR");
        
        row.innerHTML = `
            <td>${date}</td>
            <td>${inv.companyName}</td>
            <td>${inv.teamName}</td>
            <td>${inv.itemName}</td>
            <td>${inv.amount.toLocaleString()}</td>
            <td><button class="delete-row-btn" data-index="${index}">삭제</button></td>
        `;
        tbody.appendChild(row);
    });
    
    // 삭제 버튼 이벤트
    document.querySelectorAll("#investmentsTable .delete-row-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const index = parseInt(e.target.dataset.index);
            const investments = getData("investments");
            investments.splice(index, 1);
            saveData("investments", investments);
            renderInvestmentsTable();
        });
    });
}

// 투자내역 전체 삭제
document.getElementById("clearInvestmentsBtn").addEventListener("click", () => {
    if (confirm("모든 투자내역을 삭제하시겠습니까?")) {
        saveData("investments", []);
        renderInvestmentsTable();
        showToast("투자내역이 모두 삭제되었습니다");
    }
});

// 관리자 수정 버튼
document.getElementById("saveAdminBtn").addEventListener("click", () => {
    // 기업 데이터 수집
    const companies = [];
    const companyNames = new Set();
    let hasError = false;
    
    document.querySelectorAll("#companiesTable tbody tr").forEach(row => {
        const name = row.querySelector("input[data-field='name']").value.trim();
        const basePoints = parseInt(row.querySelector("input[data-field='basePoints']").value) || 0;
        const spentPoints = parseInt(row.querySelector("input[data-field='spentPoints']").value) || 0;
        
        if (!name) {
            showToast("기업명을 입력해주세요", true);
            hasError = true;
            return;
        }
        
        if (companyNames.has(name)) {
            showToast(`기업명 중복: ${name}`, true);
            hasError = true;
            return;
        }
        
        if (basePoints < spentPoints) {
            showToast(`${name}: 기본포인트가 사용포인트보다 작습니다`, true);
            hasError = true;
            return;
        }
        
        companyNames.add(name);
        companies.push({ name, basePoints, spentPoints });
    });
    
    if (hasError) return;
    
    // 팀 데이터 수집
    const teams = [];
    const teamNames = new Set();
    
    document.querySelectorAll("#teamsTable tbody tr").forEach(row => {
        const teamName = row.querySelector("input[data-field='teamName']").value.trim();
        const itemName = row.querySelector("input[data-field='itemName']").value.trim();
        const category = row.querySelector("input[data-field='category']").value.trim();
        const oneLine = row.querySelector("input[data-field='oneLine']").value.trim();
        const detail = row.querySelector("textarea[data-field='detail']").value.trim();
        const goalPoints = parseInt(row.querySelector("input[data-field='goalPoints']").value) || 0;
        const raisedPoints = parseInt(row.querySelector("input[data-field='raisedPoints']").value) || 0;
        const backerCount = parseInt(row.querySelector("input[data-field='backerCount']").value) || 0;
        
        if (!teamName) {
            showToast("팀명을 입력해주세요", true);
            hasError = true;
            return;
        }
        
        if (teamNames.has(teamName)) {
            showToast(`팀명 중복: ${teamName}`, true);
            hasError = true;
            return;
        }
        
        teamNames.add(teamName);
        teams.push({ teamName, itemName, category, oneLine, detail, goalPoints, raisedPoints, backerCount });
    });
    
    if (hasError) return;
    
    // 저장
    saveData("companies", companies);
    saveData("teams", teams);
    
    showToast("적용되었습니다");
    
    // UI 갱신
    renderCompaniesTable();
    renderTeamsTable();
});

// 기업 페이지 초기화
function initCompanyPage() {
    const companies = getData("companies");
    const select = document.getElementById("companySelect");
    select.innerHTML = '<option value="">기업을 선택하세요</option>';
    
    companies.forEach(company => {
        const option = document.createElement("option");
        option.value = company.name;
        option.textContent = company.name;
        select.appendChild(option);
    });
    
    select.addEventListener("change", (e) => {
        const companyName = e.target.value;
        if (companyName) {
            loadCompanyInfo(companyName);
        } else {
            document.getElementById("companyInfo").style.display = "none";
            document.getElementById("teamsContainer").innerHTML = "";
        }
    });
}

// 기업 정보 로드
function loadCompanyInfo(companyName) {
    const companies = getData("companies");
    const company = companies.find(c => c.name === companyName);
    
    if (company) {
        document.getElementById("basePoints").textContent = company.basePoints.toLocaleString();
        document.getElementById("spentPoints").textContent = company.spentPoints.toLocaleString();
        document.getElementById("remainPoints").textContent = (company.basePoints - company.spentPoints).toLocaleString();
        document.getElementById("companyInfo").style.display = "block";
        
        loadTeams();
    }
}

// 팀 목록 로드
function loadTeams() {
    const teams = getData("teams");
    const container = document.getElementById("teamsContainer");
    container.innerHTML = "";
    
    teams.forEach(team => {
        const card = createTeamCard(team);
        container.appendChild(card);
    });
}

// 팀 카드 생성
function createTeamCard(team) {
    const card = document.createElement("div");
    card.className = "team-card";
    
    const percentage = Math.round((team.raisedPoints / team.goalPoints) * 100);
    const progressWidth = Math.min(percentage, 100);
    
    card.innerHTML = `
        <div class="team-header">
            <div class="team-name">${team.teamName}</div>
            <span class="team-category">${team.category}</span>
        </div>
        <div class="team-item">${team.itemName}</div>
        <div class="team-oneline">${team.oneLine}</div>
        <div class="team-detail">${team.detail}</div>
        <div class="progress-section">
            <div class="progress-info">
                <span>${team.raisedPoints.toLocaleString()} / ${team.goalPoints.toLocaleString()} 포인트</span>
                <span>${percentage}%</span>
            </div>
            <div class="progress-bar-container">
                <div class="progress-bar" style="width: ${progressWidth}%"></div>
            </div>
            <div style="margin-top: 8px; font-size: 14px; color: #7f8c8d;">
                투자자: ${team.backerCount}명
            </div>
        </div>
        <div class="investment-section">
            <div class="investment-notice">투자포인트(한번 투자하면 수정이 불가하니 신중히 투자해 주세요)</div>
            <div class="investment-input-group">
                <input type="text" class="investment-input" placeholder="투자 포인트 입력" data-team="${team.teamName}">
                <button class="invest-btn" data-team="${team.teamName}">투자하기</button>
            </div>
            <div class="input-error" data-team="${team.teamName}"></div>
        </div>
    `;
    
    // 입력 검증
    const input = card.querySelector(".investment-input");
    const errorDiv = card.querySelector(".input-error");
    
    input.addEventListener("input", (e) => {
        const value = e.target.value;
        if (value && !/^\d+$/.test(value)) {
            errorDiv.textContent = "숫자만 입력해주세요";
            e.target.classList.add("error");
        } else {
            errorDiv.textContent = "";
            e.target.classList.remove("error");
        }
    });
    
    // 투자 버튼
    const btn = card.querySelector(".invest-btn");
    btn.addEventListener("click", () => {
        handleInvestment(team.teamName);
    });
    
    return card;
}

// 투자 처리
function handleInvestment(teamName) {
    const input = document.querySelector(`.investment-input[data-team="${teamName}"]`);
    const errorDiv = document.querySelector(`.input-error[data-team="${teamName}"]`);
    const value = input.value.trim();
    
    if (!value) {
        errorDiv.textContent = "투자 포인트를 입력해주세요";
        return;
    }
    
    if (!/^\d+$/.test(value)) {
        errorDiv.textContent = "숫자만 입력해주세요";
        return;
    }
    
    const amount = parseInt(value);
    if (amount <= 0) {
        errorDiv.textContent = "0보다 큰 금액을 입력해주세요";
        return;
    }
    
    const companyName = document.getElementById("companySelect").value;
    const companies = getData("companies");
    const company = companies.find(c => c.name === companyName);
    
    if (!company) {
        showToast("기업 정보를 찾을 수 없습니다", true);
        return;
    }
    
    const remainPoints = company.basePoints - company.spentPoints;
    if (amount > remainPoints) {
        showToast("포인트가 부족합니다", true);
        return;
    }
    
    // 투자 처리
    const teams = getData("teams");
    const team = teams.find(t => t.teamName === teamName);
    
    if (!team) {
        showToast("팀 정보를 찾을 수 없습니다", true);
        return;
    }
    
    // 데이터 업데이트
    company.spentPoints += amount;
    team.raisedPoints += amount;
    team.backerCount += 1;
    
    // 투자내역 추가
    const investments = getData("investments");
    investments.push({
        ts: Date.now(),
        companyName: company.name,
        teamName: team.teamName,
        itemName: team.itemName,
        amount: amount
    });
    
    // 저장
    saveData("companies", companies);
    saveData("teams", teams);
    saveData("investments", investments);
    
    // UI 업데이트
    loadCompanyInfo(companyName);
    
    showToast("투자가 완료되었습니다");
}

// 초기화
initStorage();
