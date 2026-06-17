/* ── Konfigurasi & State ──────────────────────────────────────────────── */
const NODEMCU_IP = 'http://192.168.100.79';
let history = [];
let count = 0;
let stats = { tmax: -99, tmin: 99, hmax: -99, hmin: 99 };

/* ── 1. Inisialisasi Chart (WAJIB di atas sebelum updateUI) ───────────── */
const ctx = document.getElementById('mainChart').getContext('2d');
const chart = new Chart(ctx, {
    type: 'line',
    data: {
        labels: [],
        datasets: [
            { label: 'Suhu (°C)', data: [], borderColor: '#D85A30', tension: 0.4, fill: false },
            { label: 'Kelembapan (%)', data: [], borderColor: '#378ADD', tension: 0.4, fill: false }
        ]
    },
    options: { 
        responsive: true, 
        maintainAspectRatio: false,
        scales: { y: { beginAtZero: false } }
    }
});

/* ── 2. Fungsi Hitung Heat Index ─────────────────────────────────────── */
function calcHeatIndex(t, h) {
    return -8.784 + 1.611*t + 2.338*h - 0.146*t*h - 0.012*t*t - 0.016*h*h + 0.002*t*t*h + 0.0007*t*h*h - 0.000003*t*t*h*h;
}

/* ── 3. Fungsi Update UI ─────────────────────────────────────────────── */
function updateUI(t, h) {
    const hi = calcHeatIndex(t, h);
    document.getElementById('device-status').textContent = 'Device terhubung';
    
    // Update Counter
    count++;
    document.getElementById('count-val').textContent = count;

    // Update Utama
    document.getElementById('temp-val').innerHTML = `${t.toFixed(1)}<span class="unit">°C</span>`;
    document.getElementById('hum-val').innerHTML = `${Math.round(h)}<span class="unit">%</span>`;
    document.getElementById('hi-val').innerHTML = `${hi.toFixed(1)}<span class="unit">°C</span>`;

    // Update Grafik
    const now = new Date().toLocaleTimeString('id-ID', { hour12: false });
    chart.data.labels.push(now);
    chart.data.datasets[0].data.push(t);
    chart.data.datasets[1].data.push(h);

    if (chart.data.labels.length > 20) {
        chart.data.labels.shift();
        chart.data.datasets[0].data.shift();
        chart.data.datasets[1].data.shift();
    }
    chart.update(); 

    // Update Gauges
    document.getElementById('g-temp').textContent = `${t.toFixed(1)}°C`;
    document.getElementById('g-hum').textContent = `${Math.round(h)}%`;
    document.getElementById('g-hi').textContent = `${hi.toFixed(1)}°C`;
    document.getElementById('gf-temp').style.width = `${Math.min(100, (t/50)*100)}%`;
    document.getElementById('gf-hum').style.width = `${Math.min(100, h)}%`;
    document.getElementById('gf-hi').style.width = `${Math.min(100, (hi/50)*100)}%`;

    // Update Tabel Riwayat
    history.unshift({ time: now, t: t.toFixed(1), h: Math.round(h), status: t > 32 ? 'Panas' : 'Normal' });
    // Render hanya 10 terakhir ke tabel HTML
const displayHistory = history.slice(0, 10); 
document.getElementById('hist-body').innerHTML = displayHistory.map(r => 
    `<tr><td>${r.time}</td><td>${r.t}</td><td>${r.h}</td><td>...</td></tr>`).join('');
    document.getElementById('hist-body').innerHTML = history.map(r => 
        `<tr><td>${r.time}</td><td>${r.t}</td><td>${r.h}</td><td><span class="badge ${r.status === 'Panas' ? 'badge-hot' : 'badge-ok'}">${r.status}</span></td></tr>`).join('');
    document.getElementById('hist-count').textContent = `${history.length} entri`;
    
    // Update Statistik
    stats.tmax = Math.max(stats.tmax, t); stats.tmin = Math.min(stats.tmin, t);
    stats.hmax = Math.max(stats.hmax, h); stats.hmin = Math.min(stats.hmin, h);
    document.getElementById('s-tmax').textContent = `${stats.tmax.toFixed(1)}°C`;
    document.getElementById('s-tmin').textContent = `${stats.tmin.toFixed(1)}°C`;
    document.getElementById('s-hmax').textContent = `${Math.round(stats.hmax)}%`;
    document.getElementById('s-hmin').textContent = `${Math.round(stats.hmin)}%`;
}

/* ── 4. Fungsi Data & Interaksi ──────────────────────────────────────── */
async function fetchSensor() {
    try {
        const res = await fetch(`${NODEMCU_IP}/data`);
        const d = await res.json();
        updateUI(parseFloat(d.temperature), parseFloat(d.humidity));
    } catch (e) { console.log("Menunggu data dari device..."); }
}

function downloadCSV() {
    let csv = "Waktu,Suhu,Hum,Status\n" + history.map(r => `${r.time},${r.t},${r.h},${r.status}`).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "data_sensor.csv"; a.click();
}

function resetData() { location.reload(); }

/* ── Eksekusi ────────────────────────────────────────────────────────── */
setInterval(fetchSensor, 2000);