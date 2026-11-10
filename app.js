import {
    auth,
    db,
    collection,
    addDoc,
    onSnapshot,
    doc,
    updateDoc,
    getDocs,
    setDoc,
    query,
    orderBy,
    signInWithEmailAndPassword,
    signOut
} from "./firebase.js";
// =====================================
// SMARTSHIFT - HE THONG QUAN LY CA LAM
// =====================================

// 1. KHOI TAO DU LIEU


// DU LIEU BAN GIAO VA CONG VIEC
let handovers = JSON.parse(
    localStorage.getItem("smartshift_handovers") || "[]"
);

let tasks = JSON.parse(
    localStorage.getItem("smartshift_tasks") || "[]"
);

let unsubscribeData = null;

// DONG BO DU LIEU LEN FIRESTORE
async function saveData() {
    // Luu tam tren trinh duyet
    localStorage.setItem(
        "smartshift_handovers",
        JSON.stringify(handovers)
    );

    localStorage.setItem(
        "smartshift_tasks",
        JSON.stringify(tasks)
    );

    // Neu chua dang nhap thi khong dong bo
    if (!auth.currentUser) return;

    try {
        await setDoc(doc(db, "appData", "main"), {
            handovers: handovers,
            tasks: tasks
        });
    } catch (error) {
    console.error("Loi dong bo du lieu:", error);
    alert("Không thể đồng bộ dữ liệu lên Firebase!");
    throw error;
}
}

// LANG NGHE DU LIEU TU FIRESTORE
function startDataSync() {
    if (unsubscribeData) {
        unsubscribeData();
    }

    const dataRef = doc(db, "appData", "main");

    unsubscribeData = onSnapshot(dataRef, async (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.data();

            handovers = data.handovers || [];
            tasks = data.tasks || [];
        } else {
            await saveData();
        }

        renderAll();
    }, (error) => {
        console.error("Loi doc Firestore:", error);
    });
}


// 2. CAC HAM HO TRO

function escapeHTML(value) {
    return String(value ?? "").replace(
        /[&<>"']/g,
        char => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[char]
    );
}

function formatDate(date) {
    if (!date) return "";

    const parts = date.split("-");
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function getStatusClass(status) {
    if (status === "Hoàn thành") return "done";
    if (status === "Đang xử lý") return "progress";
    return "";
}

// 3. CHUYEN TRANG

function showPage(pageName) {
    // KIEM TRA TAI KHOAN
    const user = JSON.parse(
        localStorage.getItem("smartshift_user")
    );

    if (!user) {
        document.getElementById("loginScreen").style.display = "flex";
        return;
    }

    // KIEM TRA QUYEN TRUY CAP
    const permissions = {
        dashboard: ["admin", "handover", "receiver"],
        handover: ["admin", "handover"],
        tasks: ["admin", "handover", "receiver"],
        history: ["admin", "receiver"]
    };

    if (
        !permissions[pageName] ||
        !permissions[pageName].includes(user.role)
    ) {
        alert("Bạn không có quyền truy cập trang này!");
        return;
    }

    document.querySelectorAll(".page").forEach(page => {
        page.classList.remove("active");
    });

    document.querySelectorAll(".nav-item").forEach(button => {
        button.classList.remove("active");
    });

    const page = document.getElementById(pageName + "-page");

    if (!page) return;

    page.classList.add("active");

    const nav = document.querySelector(
        `.nav-item[data-page="${pageName}"]`
    );

    if (nav) nav.classList.add("active");

    const titles = {
        dashboard: "Tổng quan",
        handover: "Bàn giao ca",
        tasks: "Công việc",
        history: "Lịch sử bàn giao"
    };

    document.getElementById("page-title").textContent =
        titles[pageName];

    renderAll();
}

document.querySelectorAll(".nav-item").forEach(button => {
    button.addEventListener("click", () => {
        showPage(button.dataset.page);
    });
});

document.querySelectorAll("[data-go]").forEach(button => {
    button.addEventListener("click", () => {
        showPage(button.dataset.go);
    });
});

document.getElementById("quick-create").addEventListener(
    "click", () => {
        showPage("handover");
    }
);

// 4. TAO PHIEU BAN GIAO

const handoverForm = document.getElementById("handover-form");

handoverForm.addEventListener("submit", async function(event) {
    event.preventDefault();

    const employee = document.getElementById("employee").value.trim();
    const receiver = document.getElementById("receiver").value.trim();
    const shift = document.getElementById("shift").value;
    const date = document.getElementById("handover-date").value;
    const done = document.getElementById("done").value.trim();
    const remaining = document.getElementById("remaining").value.trim();
    const notes = document.getElementById("notes").value.trim();

    if (!employee || !receiver || !date) {
        alert("Vui lòng nhập đầy đủ thông tin bắt buộc!");
        return;
    }

    const handover = {
        id: Date.now(),
        employee,
        receiver,
        shift,
        date,
        done,
        remaining,
        notes,
        createdAt: new Date().toISOString()
    };

    handovers.unshift(handover);

    // Tao cong viec tu noi dung can tiep tuc
    const workItems = remaining
        .split(/\n|;/)
        .map(item => item.trim())
        .filter(item => item.length > 0);

    workItems.forEach((item, index) => {
        tasks.unshift({
            id: handover.id + index + 1,
            handoverId: handover.id,
            title: item,
            employee: receiver,
            shift,
            status: "Chưa xử lý"
        });
    });

    await saveData();

    handoverForm.reset();

    document.getElementById("handover-date").value =
        new Date().toLocaleDateString("en-CA");

    alert("Đã lưu phiếu bàn giao thành công!");

    showPage("history");
});

// 5. CAP NHAT TRANG THAI CONG VIEC


async function updateTaskStatus(taskId, newStatus) {
    const task = tasks.find(item => item.id === taskId);

    if (!task) return;

    const oldStatus = task.status;
    task.status = newStatus;

    try {
        await saveData();
        renderAll();
    } catch (error) {
        task.status = oldStatus;
        renderAll();
    }
}


// 6. HIEN THI THONG KE

function renderDashboard() {
    document.getElementById("total-handovers").textContent =
        handovers.length;

    document.getElementById("in-progress").textContent =
        tasks.filter(task => task.status === "Đang xử lý").length;

    document.getElementById("completed").textContent =
        tasks.filter(task => task.status === "Hoàn thành").length;

    document.getElementById("pending").textContent =
        tasks.filter(task => task.status === "Chưa xử lý").length;

    const recentTable = document.getElementById("recent-table");
    const recentEmpty = document.getElementById("recent-empty");

    const recentTasks = tasks.slice(0, 5);

    recentEmpty.classList.toggle("hidden", recentTasks.length > 0);

    recentTable.innerHTML = recentTasks.map(task => `
        <tr>
            <td>${escapeHTML(task.title)}</td>
            <td>${escapeHTML(task.employee)}</td>
            <td>${escapeHTML(task.shift)}</td>
            <td>
                <span class="status ${getStatusClass(task.status)}">
                    ${escapeHTML(task.status)}
                </span>
            </td>
        </tr>
    `).join("");
}

// 7. HIEN THI DANH SACH CONG VIEC

function renderTasks() {
    const table = document.getElementById("tasks-table");
    const empty = document.getElementById("tasks-empty");

    empty.classList.toggle("hidden", tasks.length > 0);

    table.innerHTML = tasks.map(task => `
        <tr>
            <td>${escapeHTML(task.title)}</td>
            <td>${escapeHTML(task.employee)}</td>
            <td>
                <span class="status ${getStatusClass(task.status)}">
                    ${escapeHTML(task.status)}
                </span>
            </td>
            <td>
                <select class="task-status" data-id="${task.id}">
                    <option value="Chưa xử lý"
                        ${task.status === "Chưa xử lý" ? "selected" : ""}>
                        Chưa xử lý
                    </option>

                    <option value="Đang xử lý"
                        ${task.status === "Đang xử lý" ? "selected" : ""}>
                        Đang xử lý
                    </option>

                    <option value="Hoàn thành"
                        ${task.status === "Hoàn thành" ? "selected" : ""}>
                        Hoàn thành
                    </option>
                </select>
            </td>
        </tr>
    `).join("");
}

// 8. HIEN THI LICH SU BAN GIAO

function renderHistory() {
    const list = document.getElementById("history-list");
    const empty = document.getElementById("history-empty");

    empty.classList.toggle("hidden", handovers.length > 0);

    list.innerHTML = handovers.map(item => `
        <div class="history-card">
            <h3>Phiếu bàn giao #${item.id}</h3>

            <p><b>Ngày:</b> ${formatDate(item.date)}</p>
            <p><b>Ca làm:</b> ${escapeHTML(item.shift)}</p>
            <p><b>Người bàn giao:</b> ${escapeHTML(item.employee)}</p>
            <p><b>Người tiếp nhận:</b> ${escapeHTML(item.receiver)}</p>
            <p><b>Đã hoàn thành:</b> ${escapeHTML(item.done || "Không có")}</p>
            <p><b>Cần tiếp tục:</b> ${escapeHTML(item.remaining || "Không có")}</p>
            <p><b>Ghi chú:</b> ${escapeHTML(item.notes || "Không có")}</p>
        </div>
    `).join("");
}

// 9. CAP NHAT TOAN BO GIAO DIEN

function renderAll() {
    renderDashboard();
    renderTasks();

document.getElementById("tasks-table").addEventListener(
    "change",
    async function(event) {
        if (event.target.matches(".task-status")) {
            await updateTaskStatus(
                Number(event.target.dataset.id),
                event.target.value
            );
        }
    }
);

    renderHistory();
}

// 10. KHOI DONG PHAN MEM

document.getElementById("handover-date").value =
    new Date().toLocaleDateString("en-CA");

renderAll();

console.log("SMARTSHIFT da khoi dong thanh cong!");

// =====================================
// 11. XUAT BAO CAO BAN GIAO PDF
// =====================================

document.getElementById("export-pdf").addEventListener("click", function () {

    if (handovers.length === 0) {
        alert("Chưa có phiếu bàn giao để xuất!");
        return;
    }

    const reportWindow = window.open("", "_blank");

    if (!reportWindow) {
        alert("Trình duyệt đã chặn cửa sổ xuất PDF. Hãy cho phép cửa sổ bật lên nhé!");
        return;
    }

    const reportContent = handovers.map((item, index) => `
        <div class="report-card">
            <h2>PHIẾU BÀN GIAO #${index + 1}</h2>

            <p><b>Ngày bàn giao:</b> ${formatDate(item.date)}</p>
            <p><b>Ca làm việc:</b> ${escapeHTML(item.shift)}</p>
            <p><b>Người bàn giao:</b> ${escapeHTML(item.employee)}</p>
            <p><b>Người tiếp nhận:</b> ${escapeHTML(item.receiver)}</p>

            <hr>

            <h3>Công việc đã hoàn thành</h3>
            <p>${escapeHTML(item.done || "Không có")}</p>

            <h3>Công việc cần tiếp tục</h3>
            <p>${escapeHTML(item.remaining || "Không có")}</p>

            <h3>Ghi chú</h3>
            <p>${escapeHTML(item.notes || "Không có")}</p>
        </div>
    `).join("");

    reportWindow.document.write(`
        <!DOCTYPE html>
        <html lang="vi">
        <head>
            <meta charset="UTF-8">
            <title>Báo cáo SMARTSHIFT</title>

            <style>
                body {
                    font-family: Arial, sans-serif;
                    padding: 30px;
                    color: #1e293b;
                }

                h1 {
                    text-align: center;
                    color: #2563eb;
                }

                .subtitle {
                    text-align: center;
                    color: #64748b;
                }

                .report-card {
                    border: 1px solid #cbd5e1;
                    padding: 20px;
                    margin: 25px 0;
                    border-radius: 8px;
                    page-break-inside: avoid;
                }

                h2 {
                    color: #2563eb;
                }

                h3 {
                    margin-top: 20px;
                }

                p {
                    line-height: 1.6;
                }

                @media print {
                    .no-print {
                        display: none;
                    }
                }
            </style>
        </head>

        <body>
            <h1>SMARTSHIFT</h1>
            <p class="subtitle">
                BÁO CÁO LỊCH SỬ BÀN GIAO CA
            </p>

            <p><b>Tổng số phiếu:</b> ${handovers.length}</p>

            ${reportContent}

            <button class="no-print" onclick="window.print()">
                In / Lưu thành PDF
            </button>
        </body>
        </html>
    `);

    reportWindow.document.close();

});
// TAI KHOAN DEMO SMARTSHIFT
// TAI KHOAN VA PHAN QUYEN
const accountRoles = {
    "admin": {
        email: "admin@smartshift.demo",
        role: "admin",
        name: "Quản trị viên"
    },
    "nhanvien": {
        email: "nhanvien@smartshift.demo",
        role: "handover",
        name: "Nhân viên bàn giao"
    },
    "tiepnhan": {
        email: "tiepnhan@smartshift.demo",
        role: "receiver",
        name: "Nhân viên tiếp nhận"
    }
};

// CHUC NANG DANG NHAP FIREBASE
async function login() {
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;
    const error = document.getElementById("loginError");

    const account = accountRoles[username];

    if (!account) {
        error.textContent = "Tên đăng nhập không tồn tại!";
        error.style.color = "red";
        return;
    }

    try {
        const result = await signInWithEmailAndPassword(
            auth,
            account.email,
            password
        );

        const user = {
            uid: result.user.uid,
            username: username,
            role: account.role,
            name: account.name
        };

        localStorage.setItem(
            "smartshift_user",
            JSON.stringify(user)
        );

        document.getElementById("loginScreen").style.display = "none";

        error.textContent = "";

        alert("Xin chào " + account.name + "!");

        applyRolePermissions();
        startDataSync();

    } catch (err) {
        error.textContent = "Tên đăng nhập hoặc mật khẩu không chính xác!";
        error.style.color = "red";
    }
}

// Cho phep nut HTML goi ham login
window.login = login;
// CHUC NANG DANG XUAT
async function logout() {
    try {
        await signOut(auth);

        if (unsubscribeData) {
    unsubscribeData();
    unsubscribeData = null;
}
        localStorage.removeItem("smartshift_user");

        document.getElementById("loginScreen").style.display = "flex";

        document.getElementById("username").value = "";
        document.getElementById("password").value = "";
        document.getElementById("loginError").textContent = "";

    } catch (error) {
        alert("Không thể đăng xuất. Vui lòng thử lại!");
        console.error(error);
    }
}

window.logout = logout;
// PHAN QUYEN MENU
function applyRolePermissions() {
    const user = JSON.parse(
        localStorage.getItem("smartshift_user")
    );

    if (!user) return;

    const profileName = document.getElementById("profileName");

if (profileName) {
    profileName.textContent = user.name;
}
    const menuItems = document.querySelectorAll(
        ".nav-item[data-roles]"
    );

    menuItems.forEach(item => {
        const allowedRoles = item.dataset.roles.split(",");

        if (allowedRoles.includes(user.role)) {
            item.style.display = "";
        } else {
            item.style.display = "none";
        }
    });
}