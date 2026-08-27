// =====================================================
// ResQMesh - Emergency Communication Prototype
// =====================================================

let alerts = JSON.parse(localStorage.getItem("resqmesh_alerts")) || [];

let selectedType = "Trapped";

let currentLocation = null;

let currentFilter = "all";


// =====================================================
// PAGE NAVIGATION
// =====================================================

function showPage(pageId, button) {

    document.querySelectorAll(".page").forEach(page => {
        page.classList.remove("active-page");
    });

    const page = document.getElementById(pageId);

    if (page) {
        page.classList.add("active-page");
    }

    document.querySelectorAll(".nav-item").forEach(item => {
        item.classList.remove("active");
    });

    if (button) {
        button.classList.add("active");
    }

    updatePageTitle(pageId);
}


function showPageById(pageId) {

    const button = document.querySelector(
        `.nav-item[onclick*="'${pageId}'"]`
    );

    showPage(pageId, button);
}


function updatePageTitle(pageId) {

    const titles = {

        dashboard: [
            "Emergency Command Center",
            "Monitor emergency communication and local network activity."
        ],

        emergency: [
            "Emergency Response",
            "Create and transmit an emergency report."
        ],

        network: [
            "Mesh Network",
            "Monitor nearby communication nodes and message routes."
        ],

        alerts: [
            "Emergency Alerts",
            "Review incoming emergency reports."
        ]

    };

    if (titles[pageId]) {

        document.getElementById("pageTitle").textContent =
            titles[pageId][0];

        document.getElementById("pageSubtitle").textContent =
            titles[pageId][1];
    }
}


// =====================================================
// EMERGENCY TYPE
// =====================================================

function selectType(button) {

    document.querySelectorAll(".type-btn").forEach(btn => {
        btn.classList.remove("selected");
    });

    button.classList.add("selected");

    selectedType = button.dataset.type;

    calculatePriority();
}


// =====================================================
// LOCATION
// =====================================================

function getLocation() {

    const status =
        document.getElementById("locationStatus");

    if (!navigator.geolocation) {

        status.textContent =
            "Location is not supported by this browser.";

        return;
    }

    status.textContent =
        "Requesting location permission...";

    navigator.geolocation.getCurrentPosition(

        position => {

            currentLocation = {

                latitude: position.coords.latitude,

                longitude: position.coords.longitude

            };

            status.textContent =
                `${currentLocation.latitude.toFixed(5)}, ` +
                `${currentLocation.longitude.toFixed(5)}`;

            showToast(
                "Location Captured",
                "Your current location has been added."
            );

        },

        error => {

            status.textContent =
                "Location permission unavailable.";

            showToast(
                "Location Error",
                "Please allow location access."
            );

        },

        {
            enableHighAccuracy: true,
            timeout: 10000
        }
    );
}


// =====================================================
// PRIORITY ENGINE
// =====================================================

function calculatePriority() {

    const people =
        Number(document.getElementById("people").value) || 1;

    const scores = {

        "Trapped": 45,

        "Medical": 50,

        "Fire": 48,

        "Flood": 35,

        "Building Damage": 30,

        "Other": 15

    };

    let score = scores[selectedType] || 15;

    score += Math.min(people * 5, 30);

    if (currentLocation) {
        score += 5;
    }

    score = Math.min(score, 100);

    let level;

    if (score >= 75) {
        level = "Critical";
    }

    else if (score >= 55) {
        level = "High";
    }

    else if (score >= 35) {
        level = "Medium";
    }

    else {
        level = "Low";
    }

    document.getElementById("priorityScore")
        .textContent = score;

    document.getElementById("priorityLevel")
        .textContent = level;

    const explanations = {

        Critical:
            "Immediate response recommended.",

        High:
            "Rapid response should be considered.",

        Medium:
            "Response required but not immediately critical.",

        Low:
            "Situation currently appears lower priority."

    };

    document.getElementById("priorityExplanation")
        .textContent = explanations[level];

    const circle =
        document.getElementById("priorityCircle");

    const colors = {

        Critical: "#ef4444",

        High: "#f97316",

        Medium: "#eab308",

        Low: "#22c55e"

    };

    circle.style.borderColor = colors[level];

    return {
        score,
        level
    };
}


// =====================================================
// CREATE EMERGENCY
// =====================================================

function createEmergency() {

    const people =
        Number(document.getElementById("people").value);

    const message =
        document.getElementById("message").value.trim();

    if (!people || people < 1) {

        showToast(
            "Invalid Information",
            "Enter the number of people needing help."
        );

        return;
    }

    const priority = calculatePriority();

    const emergency = {

        id: Date.now(),

        type: selectedType,

        people: people,

        message:
            message ||
            "Emergency assistance requested.",

        priority: priority.level,

        score: priority.score,

        location: currentLocation,

        time: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit"
        }),

        timestamp: Date.now()

    };

    alerts.unshift(emergency);

    saveAlerts();

    updateDashboard();

    renderAlerts();

    document.getElementById("alertBadge")
        .textContent = alerts.length;

    showToast(
        "Emergency Alert Sent",
        `${priority.level} priority alert created.`
    );

    document.getElementById("message").value = "";

    document.getElementById("people").value = 1;

    currentLocation = null;

    document.getElementById("locationStatus")
        .textContent = "Location not captured";

    calculatePriority();

    showPageById("alerts");

    simulatePacket();

}


// =====================================================
// STORAGE
// =====================================================

function saveAlerts() {

    localStorage.setItem(
        "resqmesh_alerts",
        JSON.stringify(alerts)
    );
}


// =====================================================
// DASHBOARD
// =====================================================

function updateDashboard() {

    const active =
        alerts.filter(a => a.priority !== "Low").length;

    const high =
        alerts.filter(
            a =>
                a.priority === "Critical" ||
                a.priority === "High"
        ).length;

    const safe =
        alerts.filter(
            a => a.type === "I Am Safe"
        ).length;

    document.getElementById("activeCount")
        .textContent = active;

    document.getElementById("priorityCount")
        .textContent = high;

    document.getElementById("safeCount")
        .textContent = safe;

    document.getElementById("alertBadge")
        .textContent = alerts.length;

    const feed =
        document.getElementById("dashboardAlerts");

    if (!alerts.length) {

        feed.innerHTML = `
            <div class="empty-state">
                <div>📭</div>
                <strong>No emergency alerts</strong>
                <p>The system is monitoring for new reports.</p>
            </div>
        `;

        return;
    }

    feed.innerHTML = alerts
        .slice(0, 4)
        .map(alert => createAlertHTML(alert))
        .join("");
}


// =====================================================
// ALERT DISPLAY
// =====================================================

function createAlertHTML(alert) {

    const icons = {

        Trapped: "🆘",

        Medical: "🏥",

        Flood: "🌊",

        Fire: "🔥",

        "Building Damage": "🏚️",

        Other: "⚠️"

    };

    const icon =
        icons[alert.type] || "⚠️";

    const borderClass =
        alert.priority === "High" ||
        alert.priority === "Critical"
            ? alert.priority.toLowerCase() + "-border"
            : alert.priority.toLowerCase() + "-border";

    return `

        <div class="alert-card ${borderClass}">

            <div class="alert-card-icon">
                ${icon}
            </div>

            <div>

                <h3>
                    ${escapeHTML(alert.type)}
                </h3>

                <p>
                    ${escapeHTML(alert.message)}
                    • ${alert.people} person(s)
                </p>

            </div>

            <div class="alert-meta">

                <span class="priority-tag ${alert.priority}">
                    ${alert.priority.toUpperCase()}
                </span>

                <small>
                    ${alert.time}
                </small>

            </div>

        </div>
    `;
}


// =====================================================
// FULL ALERT PAGE
// =====================================================

function renderAlerts() {

    const container =
        document.getElementById("fullAlertList");

    let filtered = alerts;

    if (currentFilter !== "all") {

        filtered =
            alerts.filter(
                alert =>
                    alert.priority === currentFilter
            );
    }

    if (!filtered.length) {

        container.innerHTML = `
            <div class="empty-state large">
                <div>📭</div>
                <strong>No matching alerts</strong>
                <p>No emergency reports match this filter.</p>
            </div>
        `;

        return;
    }

    container.innerHTML =
        filtered
            .map(alert => createAlertHTML(alert))
            .join("");
}


// =====================================================
// FILTERS
// =====================================================

function filterAlerts(filter, button) {

    currentFilter = filter;

    document.querySelectorAll(".filter")
        .forEach(btn => btn.classList.remove("active"));

    button.classList.add("active");

    renderAlerts();
}


// =====================================================
// CLEAR ALERTS
// =====================================================

function clearAllAlerts() {

    if (!alerts.length) {

        showToast(
            "No Alerts",
            "There are no alerts to clear."
        );

        return;
    }

    if (
        !confirm(
            "Clear all emergency alerts?"
        )
    ) {
        return;
    }

    alerts = [];

    saveAlerts();

    updateDashboard();

    renderAlerts();

    showToast(
        "Alerts Cleared",
        "Emergency feed has been cleared."
    );
}


// =====================================================
// NETWORK SIMULATION
// =====================================================

function simulatePacket() {

    const packet =
        document.getElementById("packet");

    if (!packet) return;

    packet.style.display = "block";

    const positions = [

        {
            left: "25%",
            top: "32%"
        },

        {
            left: "50%",
            top: "50%"
        },

        {
            left: "75%",
            top: "68%"
        },

        {
            left: "84%",
            top: "82%"
        }

    ];

    let index = 0;

    function move() {

        if (index >= positions.length) {

            packet.style.display = "none";

            const current =
                Number(
                    document.getElementById("relayCount")
                        .textContent
                ) || 0;

            document.getElementById("relayCount")
                .textContent = current + 1;

            document.getElementById("networkRelay")
                .textContent = current + 1;

            return;
        }

        packet.style.transition =
            "all 0.8s ease";

        packet.style.left =
            positions[index].left;

        packet.style.top =
            positions[index].top;

        index++;

        setTimeout(move, 850);
    }

    move();
}


// =====================================================
// CONNECTION TOGGLE
// =====================================================

let connectionActive = true;

function toggleConnection() {

    connectionActive =
        !connectionActive;

    const text =
        document.getElementById("connectionText");

    if (connectionActive) {

        text.textContent =
            "LOCAL NETWORK ACTIVE";

        showToast(
            "Network Active",
            "Local communication is available."
        );

    } else {

        text.textContent =
            "INTERNET UNAVAILABLE";

        showToast(
            "Internet Unavailable",
            "Local mesh mode remains available."
        );
    }
}


// =====================================================
// SYSTEM INFO
// =====================================================

function showInfo() {

    document.getElementById("modalContent")
        .innerHTML = `

            <span class="eyebrow">
                SYSTEM INFORMATION
            </span>

            <h2>ResQMesh</h2>

            <p>
                ResQMesh is a prototype for resilient
                emergency communication. The interface
                demonstrates emergency reporting, priority
                scoring and local mesh-network visualization.
            </p>

            <br>

            <p>
                Current prototype mode:
                <strong>Browser Simulation</strong>
            </p>

            <br>

            <p>
                The next development stage can connect
                real devices using technologies such as
                Bluetooth, Wi-Fi Direct or ESP32-based
                communication nodes.
            </p>
        `;

    document.getElementById("modal")
        .classList.add("show");
}


function closeModal() {

    document.getElementById("modal")
        .classList.remove("show");
}


// =====================================================
// TOAST
// =====================================================

function showToast(title, message) {

    document.getElementById("toastTitle")
        .textContent = title;

    document.getElementById("toastMessage")
        .textContent = message;

    const toast =
        document.getElementById("toast");

    toast.classList.add("show");

    setTimeout(() => {

        toast.classList.remove("show");

    }, 3500);
}


// =====================================================
// SECURITY
// =====================================================

function escapeHTML(value) {

    return String(value)

        .replaceAll("&", "&amp;")

        .replaceAll("<", "&lt;")

        .replaceAll(">", "&gt;")

        .replaceAll('"', "&quot;")

        .replaceAll("'", "&#039;");
}


// =====================================================
// INITIALIZE
// =====================================================

function initialize() {

    updateDashboard();

    renderAlerts();

    calculatePriority();

    document.getElementById("alertBadge")
        .textContent = alerts.length;
}


document.addEventListener(
    "DOMContentLoaded",
    initialize
);


// Close modal when clicking outside

document.getElementById("modal")
    .addEventListener("click", function(event) {

        if (event.target === this) {
            closeModal();
        }

    });
