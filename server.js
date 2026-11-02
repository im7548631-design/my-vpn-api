
const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simulated VPN state
const vpn_state = {
    status: "Disconnected",
    currentCountry: null,
    ip: "Not assigned",
    lastUpdated: "Never",
    logs: [],
    version: "1.4.3-stable",
    build: "2026.11.02-prod"
};

// Country data
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

function getTimestamp() {
    return new Date().toISOString();
}

function addLog(message) {
    vpn_state.logs.unshift(`[${getTimestamp()}] ${message}`);
    vpn_state.logs = vpn_state.logs.slice(0, 50);
}

function generateRandomIp() {
    return `10.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 254) + 1}`;
}

function parseDelay(value, fallback = 0) {
    if (value === undefined || value === "") return fallback;

    const number = Number(value);

    if (!Number.isFinite(number) || number < 0) return null;

    return Math.min(Math.floor(number), 10000);
}

addLog("SYSTEM: VPN simulator started.");

// Health
app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        status: "healthy",
        version: vpn_state.version,
        timestamp: getTimestamp()
    });
});

// Current status
app.get("/api/status", (req, res) => {
    res.json(vpn_state);
});

// Countries
app.get("/api/countries", (req, res) => {
    res.json(COUNTRIES);
});

// Connect simulator
app.post("/api/connect", async (req, res) => {
    const countryCode = String(req.body.countryCode || "MD").toUpperCase();
    const country = COUNTRIES.find(item => item.code === countryCode);

    if (!country) {
        return res.status(400).json({
            success: false,
            error: "Invalid country code"
        });
    }

    const delay = parseDelay(req.body.delay, 0);

    if (delay === null) {
        return res.status(400).json({
            success: false,
            error: "Invalid delay"
        });
    }

    await new Promise(resolve => setTimeout(resolve, delay));

    vpn_state.status = "Connected";
    vpn_state.currentCountry = country;
    vpn_state.ip = generateRandomIp();
    vpn_state.lastUpdated = getTimestamp();

    addLog(`CONNECT SIMULATION: ${country.name}, virtual IP ${vpn_state.ip}`);

    res.json({
        success: true,
        message: "Connection simulated successfully",
        state: vpn_state,
        simulator: true
    });
});

// Disconnect simulator
app.post("/api/disconnect", async (req, res) => {
    const delay = parseDelay(req.body.delay, 0);

    if (delay === null) {
        return res.status(400).json({
            success: false,
            error: "Invalid delay"
        });
    }

    await new Promise(resolve => setTimeout(resolve, delay));

    vpn_state.status = "Disconnected";
    vpn_state.currentCountry = null;
    vpn_state.ip = "Not assigned";
    vpn_state.lastUpdated = getTimestamp();

    addLog("DISCONNECT SIMULATION: Disconnected.");

    res.json({
        success: true,
        message: "Disconnected successfully",
        state: vpn_state,
        simulator: true
    });
});

// Generate virtual IP pool
app.get("/api/pool", (req, res) => {
    const requested = Number.parseInt(req.query.count || "3", 10);
    const count = Number.isFinite(requested)
        ? Math.min(Math.max(requested, 1), 10)
        : 3;

    const addresses = Array.from(
        { length: count },
        () => generateRandomIp()
    );

    res.json({
        success: true,
        count,
        addresses,
        simulator: true
    });
});

// Sleep test
app.all("/api/vpn/test/sleep", async (req, res) => {
    const rawDelay =
        req.query.delay ??
        req.query.ms ??
        req.body?.delay ??
        req.body?.ms;

    const delay = parseDelay(rawDelay, 1000);

    if (delay === null) {
        return res.status(400).json({
            success: false,
            error: "Invalid delay"
        });
    }

    const start = Date.now();

    await new Promise(resolve => setTimeout(resolve, delay));

    const elapsed = Date.now() - start;

    addLog(`SLEEP TEST: ${delay}ms requested, ${elapsed}ms elapsed.`);

    res.json({
        success: true,
        status: "completed",
        method: req.method,
        requestedDelayMs: delay,
        elapsedMs: elapsed,
        timestamp: getTimestamp()
    });
});

// Logs
app.get("/api/logs", (req, res) => {
    const requested = Number.parseInt(req.query.limit || "20", 10);
    const limit = Number.isFinite(requested)
        ? Math.min(Math.max(requested, 1), 50)
        : 20;

    res.json({
        count: vpn_state.logs.length,
        logs: vpn_state.logs.slice(0, limit)
    });
});

// Version
app.get("/api/version", (req, res) => {
    res.json({
        version: vpn_state.version,
        build: vpn_state.build,
        framework: "Express / Node.js",
        deploymentReady: true
    });
});

// Virtual IP information
app.get("/api/vpn/ip", (req, res) => {
    res.json({
        ip: vpn_state.ip,
        status: vpn_state.status,
        country: vpn_state.currentCountry?.name || null,
        countryCode: vpn_state.currentCountry?.code || null,
        isProtected: false,
        simulator: true,
        lastAssigned: vpn_state.lastUpdated
    });
});

// API information
app.get("/api/info", (req, res) => {
    res.json({
        appName: "VPN Command Instrument",
        version: vpn_state.version,
        deploymentTarget: "Node.js Express",
        simulator: true,
        activeCountries: COUNTRIES.length,
        availableEndpoints: [
            "GET /api/health",
            "GET /api/status",
            "GET /api/countries",
            "POST /api/connect",
            "POST /api/disconnect",
            "GET /api/pool?count=3",
            "GET /api/vpn/test/sleep?delay=5000",
            "GET /api/logs?limit=20",
            "GET /api/version",
            "GET /api/vpn/ip",
            "GET /api/info",
            "GET /.well-known/vpn-discovery.json"
        ]
    });
});

// Well-Known VPN Discovery
app.get("/.well-known/vpn-discovery.json", (req, res) => {
    res.set("Cache-Control", "public, max-age=300");

    res.json({
        service: "VPN Command Instrument",
        discoveryVersion: "1.0",
        status: "available",
        simulator: true,

        provider: {
            name: "VPN Command Instrument",
            protocol: "HTTP REST API"
        },

        endpoints: {
            discovery: "/.well-known/vpn-discovery.json",
            health: "/api/health",
            status: "/api/status",
            countries: "/api/countries",
            connect: "/api/connect",
            disconnect: "/api/disconnect",
            ip: "/api/vpn/ip",
            pool: "/api/pool",
            logs: "/api/logs",
            version: "/api/version",
            info: "/api/info"
        },

        capabilities: {
            countrySelection: true,
            connectionSimulation: true,
            virtualIpGeneration: true,
            realVpnTunnel: false,
            trafficEncryption: false
        },

        timestamp: getTimestamp()
    });
});

// Interactive dashboard with Google Fonts
app.get("/", (req, res) => {
    res.type("html").send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>VPN Command Instrument</title>

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">

<style>
* {
    box-sizing: border-box;
}

body {
    margin: 0;
    padding: 20px;
    background: #101827;
    color: #eef2ff;
    font-family: 'Roboto', sans-serif;
}

button, input, select, textarea {
    font-family: 'Roboto', sans-serif;
}

main {
    max-width: 850px;
    margin: auto;
}

.panel {
    background: #1d293b;
    border: 1px solid #34445c;
    border-radius: 12px;
    padding: 18px;
    margin: 15px 0;
}

h1 {
    color: #60a5fa;
    font-weight: 700;
}

h2 {
    font-weight: 500;
}

button, select, input {
    padding: 11px;
    border-radius: 7px;
    border: 1px solid #52647d;
    margin: 5px;
}

button {
    background: #2563eb;
    color: white;
    cursor: pointer;
    font-weight: 500;
}

button.disconnect {
    background: #dc2626;
}

pre {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    color: #86efac;
}

.small {
    color: #aab8ce;
}
</style>
</head>
<body>
<main>
<h1>🌐 VPN Command Instrument</h1>
<p class="small">Node.js Express VPN simulator dashboard</p>

<div class="panel">
<h2>Connection control</h2>
<select id="country"></select>
<br>
<label>Delay (ms)</label>
<input id="delay" type="number" min="0" max="10000" value="750">
<br>
<button onclick="connect()">Connect</button>
<button class="disconnect" onclick="disconnect()">Disconnect</button>
</div>

<div class="panel">
<h2>Live state</h2>
<pre id="state">Loading...</pre>
<button onclick="refresh()">Refresh status</button>
</div>

<div class="panel">
<h2>Virtual IP pool</h2>
<input id="poolCount" type="number" min="1" max="10" value="3">
<button onclick="pool()">Generate IPs</button>
<pre id="poolResult"></pre>
</div>

<div class="panel">
<h2>Sleep test</h2>
<input id="sleepDelay" type="number" min="0" max="10000" value="1000">
<button onclick="sleepTest()">Run test</button>
<pre id="sleepResult"></pre>
</div>

<div class="panel">
<h2>Diagnostic logs</h2>
<button onclick="loadLogs()">Refresh logs</button>
<pre id="logs"></pre>
</div>

<div class="panel">
<h2>API information</h2>
<button onclick="apiInfo()">View API info</button>
<pre id="info"></pre>
</div>
</main>

<script>
async function api(url, options = {}) {
    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || "Request failed");
    }

    return data;
}

function show(id, data) {
    document.getElementById(id).textContent =
        typeof data === "string" ? data : JSON.stringify(data, null, 2);
}

async function refresh() {
    try {
        show("state", await api("/api/status"));
    } catch (error) {
        show("state", error.message);
    }
}

async function connect() {
    try {
        const result = await api("/api/connect", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                countryCode: document.getElementById("country").value,
                delay: document.getElementById("delay").value
            })
        });
        show("state", result);
        loadLogs();
    } catch (error) {
        show("state", error.message);
    }
}

async function disconnect() {
    try {
        const result = await api("/api/disconnect", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                delay: document.getElementById("delay").value
            })
        });
        show("state", result);
        loadLogs();
    } catch (error) {
        show("state", error.message);
    }
}

async function pool() {
    try {
        const count = document.getElementById("poolCount").value;
        show("poolResult", await api("/api/pool?count=" + encodeURIComponent(count)));
    } catch (error) {
        show("poolResult", error.message);
    }
}

async function sleepTest() {
    try {
        const delay = document.getElementById("sleepDelay").value;
        show("sleepResult", await api("/api/vpn/test/sleep?delay=" + encodeURIComponent(delay)));
        loadLogs();
    } catch (error) {
        show("sleepResult", error.message);
    }
}

async function loadLogs() {
    try {
        const result = await api("/api/logs");
        show("logs", result.logs.join("\\n"));
    } catch (error) {
        show("logs", error.message);
    }
}

async function apiInfo() {
    try {
        show("info", await api("/api/info"));
    } catch (error) {
        show("info", error.message);
    }
}

async function loadCountries() {
    try {
        const countries = await api("/api/countries");
        const select = document.getElementById("country");

        countries.forEach(country => {
            const option = document.createElement("option");
            option.value = country.code;
            option.textContent = country.flag + " " + country.name;
            select.appendChild(option);
        });
    } catch (error) {
        show("state", error.message);
    }
}

loadCountries();
refresh();
loadLogs();
</script>
</body>
</html>`);
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: "Endpoint not found",
        path: req.path
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({
        success: false,
        error: "Internal server error"
    });
});

app.listen(PORT, "0.0.0.0", () => {
    console.log(`VPN simulator running on port ${PORT}`);
});
