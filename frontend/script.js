const API_URL = window.location.origin;
const STORAGE_KEY = 'jarvisos-work-log';
const voiceBtn = document.getElementById('voiceBtn');
const voiceStatus = document.getElementById('voiceStatus');
const textCommand = document.getElementById('textCommand');
const sendBtn = document.getElementById('sendBtn');
const responseText = document.getElementById('responseText');
const historyContainer = document.getElementById('historyContainer');
let workLog = readWorkLog();

const currentHour = new Date().getHours();
const greeting = currentHour < 12 ? 'Good morning, admin' : currentHour < 18 ? 'Good afternoon, admin' : 'Good evening, admin';
document.getElementById('greetingText').textContent = greeting;
document.getElementById('todayLabel').textContent = new Intl.DateTimeFormat('en', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
}).format(new Date());

let recognition;
let isListening = false;
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.onstart = () => {
        isListening = true;
        voiceBtn.classList.add('listening');
        voiceStatus.textContent = 'Listening…';
        voiceBtn.setAttribute('aria-label', 'Stop voice command');
    };
    recognition.onend = () => {
        isListening = false;
        voiceBtn.classList.remove('listening');
        voiceStatus.textContent = 'Tap to speak';
        voiceBtn.setAttribute('aria-label', 'Start voice command');
    };
    recognition.onresult = event => runCommand(event.results[0][0].transcript);
    recognition.onerror = event => {
        voiceStatus.textContent = event.error === 'not-allowed' ? 'Allow microphone access' : 'Didn’t catch that. Try again.';
        voiceBtn.classList.remove('listening');
        isListening = false;
    };
} else {
    voiceStatus.textContent = 'Voice not supported in this browser';
    voiceBtn.disabled = true;
}

voiceBtn.addEventListener('click', () => {
    if (!recognition) return;
    if (isListening) recognition.stop();
    else {
        try { recognition.start(); }
        catch (error) { voiceStatus.textContent = 'Please wait a moment and try again.'; }
    }
});
sendBtn.addEventListener('click', submitCommand);
textCommand.addEventListener('keydown', event => {
    if (event.key === 'Enter') submitCommand();
});
document.querySelectorAll('.example-chip').forEach(button => {
    button.addEventListener('click', () => runCommand(button.dataset.command));
});
document.getElementById('clearHistory').addEventListener('click', () => {
    workLog = [];
    saveWorkLog();
    renderWorkLog();
    updateWorkMetric();
});

function submitCommand() {
    const command = textCommand.value.trim();
    if (command) runCommand(command);
}

async function runCommand(command) {
    responseText.textContent = 'Jarvis is working on it…';
    sendBtn.disabled = true;
    try {
        const response = await fetch(`${API_URL}/api/process-command`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({command})
        });
        if (!response.ok) throw new Error('The request could not be completed. Please try again.');
        const result = await response.json();
        const message = result.message || 'Command complete.';
        responseText.textContent = message;
        addWorkItem(command, message, result.success !== false);
        textCommand.value = '';
        await refreshDashboard();
        if (result.success !== false) speakResponse(message);
    } catch (error) {
        responseText.textContent = error.message || 'Jarvis could not complete that request.';
        addWorkItem(command, responseText.textContent, false);
    } finally {
        sendBtn.disabled = false;
    }
}

async function speakResponse(text) {
    try {
        const response = await fetch(`${API_URL}/api/text-to-speech`, {
            method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({text})
        });
        if (!response.ok) return;
        const url = URL.createObjectURL(await response.blob());
        const audio = new Audio(url);
        audio.onended = audio.onerror = () => URL.revokeObjectURL(url);
        await audio.play();
    } catch (error) {
        console.info('Voice playback unavailable:', error.message);
    }
}

function readWorkLog() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        return Array.isArray(saved) ? saved.slice(0, 30) : [];
    } catch (_) { return []; }
}

function saveWorkLog() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(workLog)); }
    catch (error) { console.info('Could not save the local activity log:', error.message); }
}

function addWorkItem(command, detail, completed) {
    workLog.unshift({command, detail, completed, at: new Date().toISOString()});
    workLog = workLog.slice(0, 30);
    saveWorkLog();
    renderWorkLog();
    updateWorkMetric();
}

function updateWorkMetric() {
    const completed = workLog.filter(item => item.completed).length;
    document.getElementById('metricWork').textContent = completed;
    document.getElementById('activityNavCount').textContent = workLog.length;
}

function renderWorkLog() {
    historyContainer.replaceChildren();
    if (!workLog.length) {
        const empty = document.createElement('div');
        empty.className = 'empty-state';
        const symbol = document.createElement('span');
        symbol.textContent = '✳';
        const text = document.createElement('p');
        text.textContent = 'Completed work will show up here.';
        const hint = document.createElement('small');
        hint.textContent = 'Try asking Jarvis to review your orders.';
        empty.append(symbol, text, hint);
        historyContainer.append(empty);
        return;
    }
    workLog.slice(0, 7).forEach(item => {
        const row = document.createElement('div');
        row.className = 'activity-item';
        const icon = document.createElement('span');
        icon.className = 'activity-icon';
        icon.textContent = item.completed ? '✓' : '!';
        const copy = document.createElement('div');
        copy.className = 'activity-copy';
        const title = document.createElement('div');
        title.className = 'activity-title';
        title.textContent = item.completed ? `Completed · ${item.command}` : `Needs attention · ${item.command}`;
        const detail = document.createElement('div');
        detail.className = 'activity-detail';
        detail.textContent = item.detail;
        copy.append(title, detail);
        const time = document.createElement('time');
        time.className = 'activity-time';
        time.dateTime = item.at;
        time.textContent = formatRelativeTime(item.at);
        row.append(icon, copy, time);
        historyContainer.append(row);
    });
}

function formatRelativeTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return new Intl.DateTimeFormat('en', {month: 'short', day: 'numeric'}).format(date);
}

async function refreshDashboard() {
    const [productsResult, ordersResult] = await Promise.allSettled([
        fetch(`${API_URL}/api/products`).then(response => {
            if (!response.ok) throw new Error('Products unavailable');
            return response.json();
        }),
        fetch(`${API_URL}/api/orders`).then(response => {
            if (!response.ok) throw new Error('Orders unavailable');
            return response.json();
        })
    ]);
    const products = productsResult.status === 'fulfilled' ? productsResult.value : [];
    const orders = ordersResult.status === 'fulfilled' ? ordersResult.value : [];
    renderProducts(products);
    renderReports(orders);
    updateWorkMetric();
}

function renderProducts(products) {
    const body = document.getElementById('inventoryBody');
    body.replaceChildren();
    if (!products.length) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 4;
        cell.className = 'table-loading';
        cell.textContent = 'No catalog data is available.';
        row.append(cell);
        body.append(row);
    }
    let stockCount = 0;
    products.forEach(product => {
        const stock = Number(product.stock) || 0;
        stockCount += stock;
        const row = document.createElement('tr');
        const name = document.createElement('td');
        name.textContent = product.name;
        const price = document.createElement('td');
        price.textContent = formatMoney(product.price);
        const units = document.createElement('td');
        units.textContent = stock.toLocaleString();
        const statusCell = document.createElement('td');
        const status = document.createElement('span');
        status.className = `stock-status${stock === 0 ? ' out' : stock < 20 ? ' low' : ''}`;
        status.textContent = stock === 0 ? 'Out of stock' : stock < 20 ? 'Low stock' : 'In stock';
        statusCell.append(status);
        row.append(name, price, units, statusCell);
        body.append(row);
    });
    document.getElementById('metricProducts').textContent = products.length;
    document.getElementById('metricStock').textContent = stockCount.toLocaleString();
}

function renderReports(orders) {
    const total = orders.reduce((sum, order) => sum + (Number(order.total) || 0), 0);
    document.getElementById('metricOrders').textContent = orders.length;
    document.getElementById('metricRevenue').textContent = `${formatMoney(total)} total order value`;
    document.getElementById('reportRevenue').textContent = formatMoney(total);
    document.getElementById('reportOrders').textContent = orders.length;

    const now = new Date();
    const days = Array.from({length: 7}, (_, index) => {
        const date = new Date(now);
        date.setHours(0, 0, 0, 0);
        date.setDate(now.getDate() - (6 - index));
        return {date, total: 0};
    });
    orders.forEach(order => {
        const date = new Date(order.date);
        const day = days.find(item => item.date.toDateString() === date.toDateString());
        if (day) day.total += Number(order.total) || 0;
    });
    renderChart(days);
}

function renderChart(days) {
    const max = Math.max(100, ...days.map(day => day.total));
    const points = days.map((day, index) => ({
        x: 8 + (index * 684 / 6),
        y: 158 - (day.total / max * 140)
    }));
    const path = points.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ');
    document.getElementById('chartLine').setAttribute('d', path);
    document.getElementById('chartArea').setAttribute('d', `${path} L 692 160 L 8 160 Z`);
    const circles = document.getElementById('chartPoints');
    circles.replaceChildren();
    points.forEach(point => {
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', point.x);
        circle.setAttribute('cy', point.y);
        circle.setAttribute('r', 3.5);
        circles.append(circle);
    });
    const labels = document.getElementById('chartLabels');
    labels.replaceChildren();
    days.forEach(day => {
        const label = document.createElement('span');
        label.textContent = new Intl.DateTimeFormat('en', {weekday: 'short'}).format(day.date);
        labels.append(label);
    });
    const yLabels = document.querySelector('.chart-y-labels');
    const increments = [1, .75, .5, .25, 0];
    yLabels.replaceChildren();
    increments.forEach(ratio => {
        const label = document.createElement('span');
        label.textContent = formatCompactMoney(max * ratio);
        yLabels.append(label);
    });
}

function formatMoney(value) {
    return new Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD'}).format(Number(value) || 0);
}

function formatCompactMoney(value) {
    const rounded = Math.round(value);
    return rounded >= 1000 ? `$${(rounded / 1000).toFixed(rounded >= 10000 ? 0 : 1)}k` : `$${rounded}`;
}

renderWorkLog();
updateWorkMetric();
refreshDashboard();
