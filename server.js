
const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const vpn_state = {
    status: "Disconnected",
    currentCountry: null,
    ip: "Not assigned",
    lastUpdated: "Never",
    logs: [
        `[${new Date().toTimeString().split(" ")[0]}] [SYSTEM] Server initialized.`
    ],
    version: "1.4.2-stable",
    build: "2026.10.21-prod"
};

const COUNTRIES = [
    { code: "MD", name: "Moldova", region: "Europe", flag: "🇲🇩", latency: "12ms" },
    { code: "RO", name: "Romania", region: "Europe", flag: "🇷🇴", latency: "24ms" },
    { code: "DE", name: "Germany", region: "Europe", flag: "🇩🇪", latency: "35ms" },
    { code: "US", name: "United States", region: "North America", flag: "🇺🇸", latency: "98ms" },
    { code: "GB", name: "United Kingdom", region: "Europe", flag: "🇬🇧", latency: "42ms" },
    { code: "FR", name: "France", region: "Europe", flag: "🇫🇷", latency: "38ms" },
    { code: "JP", name: "Japan", region: "Asia", flag: "🇯🇵", latency: "180ms" },
    { code: "CA", name: "Canada", region: "North America", flag: "🇨🇦", latency: "110ms" },
    { code: "AU", name: "Australia", region: "Oceania", flag: "🇦🇺", latency: "220ms" },
    { code: "SG", name: "Singapore", region: "Asia", flag: "🇸🇬", latency: "165ms" }
];

function generateRandomIp() {
    return `10.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 254) + 1}`;
}

function getTimestamp() {
    return new Date().toTimeString().split(" ")[0];
}

function addLog(message) {
    const entry = `[${getTimestamp()}] ${message}`;
    vpn_state.logs.unshift(entry);
    if (vpn_state.logs.length > 50) vpn_state.logs.pop();
    return entry;
}

app.get("/api/health", (req, res) => {
    res.json({
        status: "healthy",
        version: vpn_state.version,
        timestamp: getTimestamp(),
        environment: "Node.js Express Server"
    });
});

app.get("/api/status", (req, res) => res.json(vpn_state));

app.get("/api/countries", (req, res) => res.json(COUNTRIES));

app.post("/api/connect", async (req, res) => {
    const countryCode = typeof req.body.countryCode === "string"
        ? req.body.countryCode.trim().toUpperCase()
        : "";

    const targetCountry = COUNTRIES.find(c => c.code === countryCode);

    if (!targetCountry) {
        const supportedCodes = COUNTRIES.map(c => c.code);
        return res.status(400).json({
            success: false,
            statusCode: 400,
            error: "Invalid countryCode",
            message: "countryCode must be one of the supported ISO codes: " + supportedCodes.join(", "),
            supportedCountryCodes: supportedCodes
        });
    }

    const parsedDelay = Number.parseInt(req.body.delay || 0, 10);
    const waitTime = Number.isFinite(parsedDelay)
        ? Math.min(Math.max(parsedDelay, 0), 10000)
        : 0;

    if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    vpn_state.status = "Connected";
    vpn_state.currentCountry = targetCountry;
    vpn_state.ip = generateRandomIp();
    vpn_state.lastUpdated = getTimestamp();

    addLog(`[CONNECT] Connected via ${targetCountry.name} (${countryCode}). IP: ${vpn_state.ip}`);

    res.json({ success: true, state: vpn_state });
});

app.post("/api/disconnect", async (req, res) => {
    const parsedDelay = Number.parseInt(req.body.delay || 0, 10);
    const waitTime = Number.isFinite(parsedDelay)
        ? Math.min(Math.max(parsedDelay, 0), 10000)
        : 0;

    if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    vpn_state.status = "Disconnected";
    vpn_state.currentCountry = null;
    vpn_state.ip = "Not assigned";
    vpn_state.lastUpdated = getTimestamp();

    addLog("[DISCONNECT] Tunnel closed.");
    res.json({ success: true, state: vpn_state });
});

app.get("/api/pool", (req, res) => {
    const requested = Number.parseInt(req.query.count || 3, 10);
    const count = Number.isFinite(requested)
        ? Math.min(Math.max(requested, 1), 10)
        : 3;

    res.json({
        addresses: Array.from({ length: count }, generateRandomIp)
    });
});

app.all("/api/vpn/test/sleep", async (req, res) => {
    const raw = req.query.ms ?? req.body?.ms ?? 1000;
    const parsed = Number.parseInt(raw, 10);
    const ms = Number.isFinite(parsed)
        ? Math.min(Math.max(parsed, 0), 10000)
        : 1000;

    const start = Date.now();
    await new Promise(resolve => setTimeout(resolve, ms));
    const elapsed = Date.now() - start;

    addLog(`[TEST/SLEEP] Delay ${ms}ms; actual ${elapsed}ms`);

    res.json({
        status: "completed",
        requestedDelayMs: ms,
        elapsedMs: elapsed,
        timestamp: getTimestamp()
    });
});

app.get("/api/logs", (req, res) => {
    const parsed = Number.parseInt(req.query.limit || 20, 10);
    const limit = Number.isFinite(parsed)
        ? Math.min(Math.max(parsed, 0), 50)
        : 20;

    res.json({
        count: vpn_state.logs.length,
        logs: vpn_state.logs.slice(0, limit)
    });
});

app.get("/api/version", (req, res) => {
    res.json({
        version: vpn_state.version,
        build: vpn_state.build,
        framework: "Express (Node.js)",
        deploymentReady: true
    });
});

app.get("/api/vpn/ip", (req, res) => {
    res.json({
        ip: vpn_state.ip,
        status: vpn_state.status,
        country: vpn_state.currentCountry?.name || null,
        countryCode: vpn_state.currentCountry?.code || null,
        isProtected: false,
        lastAssigned: vpn_state.lastUpdated,
        simulator: true
    });
});

app.get("/api/info", (req, res) => {
    res.json({
        appName: "VPN Command Instrument",
        version: vpn_state.version,
        deploymentTarget: "Node.js Express Engine",
        activeRoutesCount: COUNTRIES.length,
        currentState: {
            status: vpn_state.status,
            assignedIp: vpn_state.ip,
            activeCountry: vpn_state.currentCountry?.name || "None"
        },
        availableEndpoints: [
            "GET /api/health",
            "GET /api/status",
            "GET /api/countries",
            "POST /api/connect",
            "POST /api/disconnect",
            "GET /api/pool?count=3",
            "ALL /api/vpn/test/sleep?ms=1000",
            "GET /api/logs?limit=20",
            "GET /api/version",
            "GET /api/vpn/ip",
            "GET /api/info"
        ]
    });
});

// Dashboard
app.get("/", (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>VPN Command Instrument</title>
<style>
*{box-sizing:border-box}
body{margin:0;padding:25px;background:#09090b;color:#f4f4f5;font-family:Arial,sans-serif;max-width:1100px;margin:auto}
h1{font-size:26px}
p,.muted{color:#a1a1aa}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}
.card{background:#18181b;border:1px solid #333;border-radius:12px;padding:20px;margin:15px 0}
button{padding:12px;background:#2563eb;color:white;border:0;border-radius:7px;cursor:pointer;margin:4px}
button:disabled{opacity:.5}
.danger{background:#dc2626}
.country-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}
.country-item{padding:12px;background:#27272a;border:1px solid #444;border-radius:8px;cursor:pointer}
.country-item.selected{border-color:#3b82f6;background:#172554}
.metric{padding:12px 0;border-bottom:1px solid #333}
.logs{background:#000;padding:12px;max-height:220px;overflow:auto;font-family:monospace;font-size:12px}
#poolIps{white-space:pre-line;color:#34d399}
@media(max-width:700px){.grid{grid-template-columns:1fr}}
</style>
</head>
<body>
<h1>🌐 VPN Command Instrument</h1>
<p>Node.js Express VPN connection simulator and API dashboard.</p>

<div class="grid">
<div>
<div class="card">
<h3>01 / Choose Route Endpoint</h3>
<div id="countryGrid" class="country-grid"></div>
</div>

<div class="card">
<h3>02 / Address Pool Generator</h3>
<p>Pool count: <span id="poolCount">3</span></p>
<button onclick="adjustCount(-1)">-</button>
<button onclick="adjustCount(1)">+</button>
<button onclick="generatePool()">Generate IP addresses</button>
<div id="poolIps">No addresses generated.</div>
</div>

<div class="card">
<h3>03 / Tunnel Control</h3>
<p>Delay: <span id="delayVal">750</span> ms</p>
<input id="delaySlider" type="range" min="0" max="3000" step="250" value="750"
oninput="document.getElementById('delayVal').innerText=this.value">
<button id="actionBtn" onclick="toggleConnection()">Connect Tunnel</button>
</div>
</div>

<div>
<div class="card">
<h3>Live Tunnel State</h3>
<div class="metric">Status: <strong id="statusBadge">Disconnected</strong></div>
<div class="metric">Country: <strong id="currentEndpoint">None</strong></div>
<div class="metric">Virtual IP: <strong id="privateAddress">Not assigned</strong></div>
<div class="metric">Updated: <strong id="sessionUpdated">Never</strong></div>
</div>

<div class="card">
<h3>Diagnostic Logs <button onclick="fetchLogs()">Refresh</button></h3>
<div class="logs" id="logsBox">Loading logs...</div>
</div>

<div class="card">
<h3>API Inspector</h3>
<button onclick="inspectApi('/api/health')">Health</button>
<button onclick="inspectApi('/api/version')">Version</button>
<button onclick="inspectApi('/api/vpn/ip')">IP</button>
<button onclick="inspectApi('/api/info')">Info</button>
<button onclick="inspectApi('/api/logs')">Logs</button>
<pre id="apiResult">Select an endpoint.</pre>
</div>
</div>
</div>

<script>
let selectedCountryCode = "MD";
let poolAddressCount = 3;

async function api(url, options = {}) {
    const response = await fetch(url, options);
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Request failed");
    return data;
}

async function initCountries() {
    const countries = await api("/api/countries");
    const grid = document.getElementById("countryGrid");

    grid.innerHTML = countries.map(c => \`
        <div class="country-item \${c.code === selectedCountryCode ? "selected" : ""}"
             onclick="selectCountry('\${c.code}',this)">
            <div>\${c.flag}</div>
            <strong>\${c.name}</strong>
            <div class="muted">\${c.code} · \${c.latency}</div>
        </div>
    \`).join("");
}

function selectCountry(code, element) {
    selectedCountryCode = code;
    document.querySelectorAll(".country-item").forEach(el => el.classList.remove("selected"));
    element.classList.add("selected");
}

function updateUI(data) {
    document.getElementById("statusBadge").innerText = data.status;
    document.getElementById("currentEndpoint").innerText =
        data.currentCountry ? data.currentCountry.flag + " " + data.currentCountry.name : "None";
    document.getElementById("privateAddress").innerText = data.ip;
    document.getElementById("sessionUpdated").innerText = data.lastUpdated;

    const connected = data.status === "Connected";
    const btn = document.getElementById("actionBtn");
    btn.innerText = connected ? "Disconnect Tunnel" : "Connect Tunnel";
    btn.className = connected ? "danger" : "";
    if (data.logs) renderLogs(data.logs);
}

function renderLogs(logs) {
    document.getElementById("logsBox").innerText = logs.join("\\n");
}

async function fetchStatus() {
    try {
        updateUI(await api("/api/status"));
    } catch (err) {
        alert(err.message);
    }
}

async function fetchLogs() {
    try {
        const data = await api("/api/logs?limit=20");
        renderLogs(data.logs);
    } catch (err) {
        alert(err.message);
    }
}

async function toggleConnection() {
    const btn = document.getElementById("actionBtn");
    btn.disabled = true;

    const connected = btn.innerText.includes("Disconnect");
    const delay = Number(document.getElementById("delaySlider").value);
    const endpoint = connected ? "/api/disconnect" : "/api/connect";
    const body = connected ? { delay } : { countryCode: selectedCountryCode, delay };

    try {
        const data = await api(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });
        updateUI(data.state);
    } catch (err) {
        alert(err.message);
    } finally {
        btn.disabled = false;
        await fetchStatus();
    }
}

function adjustCount(amount) {
    poolAddressCount = Math.max(1, Math.min(10, poolAddressCount + amount));
    document.getElementById("poolCount").innerText = poolAddressCount;
}

async function generatePool() {
    try {
        const data = await api("/api/pool?count=" + poolAddressCount);
        document.getElementById("poolIps").innerText = data.addresses.join("\\n");
    } catch (err) {
        alert(err.message);
    }
}

async function inspectApi(endpoint) {
    try {
        const data = await api(endpoint);
        document.getElementById("apiResult").innerText = JSON.stringify(data, null, 2);
    } catch (err) {
        document.getElementById("apiResult").innerText = err.message;
    }
}

window.onload = async () => {
    await initCountries();
    await fetchStatus();
};
</script>
</body>
</html>`);
});

app.listen(PORT, () => {
    console.log(`VPN Command Instrument running on port ${PORT}`);
});
