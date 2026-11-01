
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
    logs: [],
    version: "1.4.3-stable",
    build: "2026.11.01-prod"
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

function getTimestamp() {
    return new Date().toISOString();
}

function addLog(message) {
    vpn_state.logs.unshift(
        `[${getTimestamp()}] ${message}`
    );

    if (vpn_state.logs.length > 50) {
        vpn_state.logs.pop();
    }
}

function generateRandomIp() {
    return `10.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 254) + 1}`;
}

function parseDelay(value, defaultValue = 0) {
    if (value === undefined || value === null || value === "") {
        return defaultValue;
    }

    const number = Number(value);

    if (!Number.isFinite(number) || number < 0) {
        return null;
    }

    return Math.min(Math.floor(number), 10000);
}

addLog("[SYSTEM] Server initialized.");

// HEALTH
app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        status: "healthy",
        version: vpn_state.version,
        timestamp: getTimestamp()
    });
});

// STATUS
app.get("/api/status", (req, res) => {
    res.json(vpn_state);
});

// COUNTRIES
app.get("/api/countries", (req, res) => {
    res.json(COUNTRIES);
});

// CONNECT
app.post("/api/connect", async (req, res) => {
    try {
        const countryCode = String(req.body?.countryCode || "")
            .trim()
            .toUpperCase();

        const country = COUNTRIES.find(
            item => item.code === countryCode
        );

        if (!country) {
            return res.status(400).json({
                success: false,
                error: "Invalid countryCode",
                supportedCountryCodes: COUNTRIES.map(c => c.code)
            });
        }

        const delay = parseDelay(req.body?.delay);

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

        addLog(`[CONNECT] ${country.name} selected.`);

        return res.json({
            success: true,
            message: "Connection simulated successfully",
            state: vpn_state
        });

    } catch (error) {
        console.error("CONNECT ERROR:", error);

        return res.status(500).json({
            success: false,
            error: "Connection failed"
        });
    }
});

// DISCONNECT
app.post("/api/disconnect", async (req, res) => {
    try {
        const delay = parseDelay(req.body?.delay);

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

        addLog("[DISCONNECT] Tunnel closed.");

        return res.json({
            success: true,
            message: "Disconnected successfully",
            delay: delay,
            state: vpn_state
        });

    } catch (error) {
        console.error("DISCONNECT ERROR:", error);

        return res.status(500).json({
            success: false,
            error: "Disconnect failed"
        });
    }
});

// ADDRESS POOL
app.get("/api/pool", (req, res) => {
    const count = Math.min(
        Math.max(parseInt(req.query.count, 10) || 3, 1),
        10
    );

    res.json({
        success: true,
        addresses: Array.from(
            { length: count },
            generateRandomIp
        )
    });
});

// SLEEP TEST
app.all("/api/vpn/test/sleep", async (req, res) => {
    try {
        const delay = parseDelay(
            req.query.ms ?? req.body?.ms,
            1000
        );

        if (delay === null) {
            return res.status(400).json({
                success: false,
                error: "Invalid delay"
            });
        }

        const start = Date.now();

        await new Promise(resolve => setTimeout(resolve, delay));

        res.json({
            success: true,
            status: "completed",
            requestedDelayMs: delay,
            elapsedMs: Date.now() - start
        });

    } catch (error) {
        console.error("SLEEP ERROR:", error);
        res.status(500).json({ success: false });
    }
});

// LOGS
app.get("/api/logs", (req, res) => {
    const limit = Math.min(
        Math.max(parseInt(req.query.limit, 10) || 20, 1),
        50
    );

    res.json({
        count: vpn_state.logs.length,
        logs: vpn_state.logs.slice(0, limit)
    });
});

// VERSION
app.get("/api/version", (req, res) => {
    res.json({
        version: vpn_state.version,
        build: vpn_state.build,
        framework: "Express Node.js",
        deploymentReady: true
    });
});

// IP INFORMATION
app.get("/api/vpn/ip", (req, res) => {
    res.json({
        ip: vpn_state.ip,
        status: vpn_state.status,
        country: vpn_state.currentCountry?.name || null,
        countryCode: vpn_state.currentCountry?.code || null,
        isProtected: false,
        simulator: true
    });
});

// API INFORMATION
app.get("/api/info", (req, res) => {
    res.json({
        appName: "VPN Command Instrument",
        version: vpn_state.version,
        endpoints: [
            "GET /api/health",
            "GET /api/status",
            "GET /api/countries",
            "POST /api/connect",
            "POST /api/disconnect",
            "GET /api/pool",
            "GET /api/logs",
            "GET /api/version",
            "GET /api/vpn/ip",
            "GET /api/info"
        ]
    });
});

// DASHBOARD
app.get("/", (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>VPN Command Instrument</title>
<style>
body {
    margin: 0;
    padding: 20px;
    background: #09090b;
    color: #f4f4f5;
    font-family: Arial, sans-serif;
    max-width: 1100px;
    margin: auto;
}
.card {
    background: #18181b;
    border: 1px solid #333;
    border-radius: 12px;
    padding: 18px;
    margin: 15px 0;
}
.grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 18px;
}
button {
    padding: 12px;
    background: #2563eb;
    color: white;
    border: 0;
    border-radius: 7px;
    margin: 4px;
}
.danger { background: #dc2626; }
.country {
    padding: 12px;
    background: #27272a;
    border: 1px solid #444;
    margin: 5px;
    border-radius: 8px;
    cursor: pointer;
}
.country.selected {
    border-color: #3b82f6;
}
.logs {
    background: black;
    padding: 12px;
    overflow: auto;
    max-height: 200px;
}
@media(max-width:700px) {
    .grid { grid-template-columns: 1fr; }
}
</style>
</head>
<body>

<h1>🌐 VPN Command Instrument</h1>
<p>Node.js Express VPN simulator dashboard</p>

<div class="grid">
<div>
<div class="card">
<h3>Server Locations</h3>
<div id="countries"></div>
</div>

<div class="card">
<h3>Connection Delay</h3>
<input id="delay" type="range"
min="0" max="3000" step="250" value="750">
<span id="delayValue">750 ms</span>
<br>
<button id="connectBtn" onclick="connect()">Connect</button>
<button class="danger" onclick="disconnect()">Disconnect</button>
</div>

<div class="card">
<h3>Address Pool</h3>
<button onclick="pool()">Generate IPs</button>
<pre id="poolResult"></pre>
</div>
</div>

<div>
<div class="card">
<h3>Live Status</h3>
<p>Status: <strong id="status">Loading</strong></p>
<p>Country: <strong id="country">None</strong></p>
<p>IP: <strong id="ip">Not assigned</strong></p>
<p>Last updated: <strong id="updated">Never</strong></p>
</div>

<div class="card">
<h3>Diagnostic Logs</h3>
<button onclick="logs()">Refresh</button>
<pre class="logs" id="logs"></pre>
</div>

<div class="card">
<h3>API Inspector</h3>
<button onclick="inspect('/api/health')">Health</button>
<button onclick="inspect('/api/version')">Version</button>
<button onclick="inspect('/api/info')">Info</button>
<pre id="result"></pre>
</div>
</div>
</div>

<script>
let selected = "MD";

const delayInput = document.getElementById("delay");

delayInput.oninput = () => {
    document.getElementById("delayValue").textContent =
        delayInput.value + " ms";
};

async function api(url, options = {}) {
    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || data.message || "Request failed");
    }

    return data;
}

async function init() {
    const countries = await api("/api/countries");

    document.getElementById("countries").innerHTML =
        countries.map(c => \`
            <div class="country \${c.code === selected ? "selected" : ""}"
                 onclick="choose('\${c.code}', this)">
                \${c.flag} \${c.name} — \${c.latency}
            </div>
        \`).join("");

    await refresh();
}

function choose(code, element) {
    selected = code;

    document.querySelectorAll(".country").forEach(
        item => item.classList.remove("selected")
    );

    element.classList.add("selected");
}

async function connect() {
    try {
        const data = await api("/api/connect", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                countryCode: selected,
                delay: Number(delayInput.value)
            })
        });

        showState(data.state);
    } catch (error) {
        alert(error.message);
    }
}

async function disconnect() {
    try {
        const data = await api("/api/disconnect", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                delay: Number(delayInput.value)
            })
        });

        showState(data.state);
    } catch (error) {
        alert(error.message);
    }
}

function showState(state) {
    document.getElementById("status").textContent = state.status;
    document.getElementById("country").textContent =
        state.currentCountry?.name || "None";
    document.getElementById("ip").textContent = state.ip;
    document.getElementById("updated").textContent = state.lastUpdated;

    if (state.logs) {
        document.getElementById("logs").textContent =
            state.logs.join("\\n");
    }
}

async function refresh() {
    showState(await api("/api/status"));
}

async function logs() {
    const data = await api("/api/logs");
    document.getElementById("logs").textContent =
        data.logs.join("\\n");
}

async function pool() {
    const data = await api("/api/pool?count=5");
    document.getElementById("poolResult").textContent =
        data.addresses.join("\\n");
}

async function inspect(endpoint) {
    const data = await api(endpoint);
    document.getElementById("result").textContent =
        JSON.stringify(data, null, 2);
}

window.onload = init;
</script>
</body>
</html>
    `);
});

// ERROR HANDLER
app.use((error, req, res, next) => {
    console.error("SERVER ERROR:", error);

    res.status(500).json({
        success: false,
        error: "Internal server error"
    });
});

app.listen(PORT, "0.0.0.0", () => {
    console.log("VPN Command Instrument running on port " + PORT);
});
