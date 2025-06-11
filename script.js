let data = [];
let ganttTimeline = [];

const form = document.getElementById("inputForm");
const inputTableBody = document.querySelector("#inputTable tbody");
const resultTableBody = document.querySelector("#resultTable tbody");
const ganttChart = document.getElementById("ganttChart");
const avgWT = document.getElementById("avgWT");
const avgTAT = document.getElementById("avgTAT");

const algoSelect = document.getElementById("algoritma");
const quantumInput = document.getElementById("quantum");
const quantumGroup = document.getElementById("quantum-group");

algoSelect.addEventListener("change", () => {
  quantumGroup.style.display = algoSelect.value === "rr" ? "block" : "none";
});

// Tambah proses
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const nama = document.getElementById("nama").value.trim();
  const arrival = parseInt(document.getElementById("arrival").value);
  const durasi = parseInt(document.getElementById("durasi").value);

  if (!nama || isNaN(arrival) || isNaN(durasi)) return;

  data.push({ nama, arrival, durasi, remaining: durasi });
  updateInputTable();
  form.reset();
});

function updateInputTable() {
  inputTableBody.innerHTML = "";
  data.forEach(p => {
    const row = document.createElement("tr");
    row.innerHTML = `<td>${p.nama}</td><td>${p.arrival}</td><td>${p.durasi}</td>`;
    inputTableBody.appendChild(row);
  });
}

document.getElementById("resetSim").addEventListener("click", () => {
  data = [];
  ganttTimeline = [];
  updateInputTable();
  ganttChart.innerHTML = "";
  resultTableBody.innerHTML = "";
  avgWT.textContent = "-";
  avgTAT.textContent = "-";
});

document.getElementById("startSim").addEventListener("click", () => {
  if (data.length === 0) return alert("Masukkan data terlebih dahulu.");
  const algoritma = algoSelect.value;
  const copy = JSON.parse(JSON.stringify(data));
  ganttTimeline = [];

  switch (algoritma) {
    case "fifo":
      runFIFO(copy);
      break;
    case "sjf":
      runSJF(copy);
      break;
    case "rr":
      const q = parseInt(quantumInput.value);
      if (isNaN(q) || q <= 0) return alert("Quantum tidak valid.");
      runRR(copy, q);
      break;
    case "srjf":
      runSRJF(copy);
      break;
  }

  drawGantt(ganttTimeline);
  showResults(copy);
});

function runFIFO(queue) {
  queue.sort((a, b) => a.arrival - b.arrival);
  let time = 0;

  queue.forEach(p => {
    time = Math.max(time, p.arrival);
    ganttTimeline.push({ nama: p.nama, start: time, durasi: p.durasi });
    time += p.durasi;
    p.finish = time;
  });
}

function runSJF(queue) {
  let time = 0;
  let ready = [];

  while (queue.length > 0 || ready.length > 0) {
    ready.push(...queue.filter(p => p.arrival <= time));
    queue = queue.filter(p => p.arrival > time);

    if (ready.length === 0) {
      time++;
      continue;
    }

    ready.sort((a, b) => a.durasi - b.durasi);
    const curr = ready.shift();
    ganttTimeline.push({ nama: curr.nama, start: time, durasi: curr.durasi });
    time += curr.durasi;
    curr.finish = time;
  }
}

function runRR(queue, quantum) {
  let time = 0;
  let ready = [];
  const map = new Map(queue.map(p => [p.nama, p]));

  while (queue.length > 0 || ready.length > 0) {
    queue.filter(p => p.arrival <= time && !ready.includes(p)).forEach(p => ready.push(p));
    queue = queue.filter(p => p.arrival > time);

    if (ready.length === 0) {
      time++;
      continue;
    }

    const p = ready.shift();
    const execTime = Math.min(quantum, p.remaining);
    ganttTimeline.push({ nama: p.nama, start: time, durasi: execTime });

    p.remaining -= execTime;
    time += execTime;

    queue.filter(q => q.arrival <= time && !ready.includes(q)).forEach(q => ready.push(q));
    if (p.remaining > 0) ready.push(p);
    else map.get(p.nama).finish = time;
  }
}

function runSRJF(queue) {
  let time = 0;
  let current = null;
  let ready = [];

  while (queue.length > 0 || ready.length > 0 || current) {
    ready.push(...queue.filter(p => p.arrival === time));
    queue = queue.filter(p => p.arrival > time);

    if (current && current.remaining === 0) {
      current.finish = time;
      current = null;
    }

    if (ready.length > 0 || current) {
      const candidates = current ? [current, ...ready] : ready;
      candidates.sort((a, b) => a.remaining - b.remaining);
      const next = candidates[0];

      if (current && current.nama !== next.nama) {
        ready.push(current);
      }
      current = next;
      ready = candidates.filter(p => p !== current);

      if (
        ganttTimeline.length === 0 ||
        ganttTimeline[ganttTimeline.length - 1].nama !== current.nama
      ) {
        ganttTimeline.push({ nama: current.nama, start: time, durasi: 1 });
      } else {
        ganttTimeline[ganttTimeline.length - 1].durasi++;
      }

      current.remaining--;
    }
    time++;
  }
}

function drawGantt(timeline) {
  ganttChart.innerHTML = "";
  timeline.forEach(block => {
    const bar = document.createElement("div");
    bar.className = "bar";
    bar.textContent = `${block.nama} (${block.durasi})`;
    bar.style.flex = block.durasi;
    ganttChart.appendChild(bar);
  });
}

function showResults(data) {
  resultTableBody.innerHTML = "";

  let totalWT = 0, totalTAT = 0;

  data.forEach(p => {
    const tat = p.finish - p.arrival;
    const wt = tat - p.durasi;

    totalTAT += tat;
    totalWT += wt;

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${p.nama}</td>
      <td>${p.arrival}</td>
      <td>${p.durasi}</td>
      <td>${p.finish}</td>
      <td>${tat}</td>
      <td>${wt}</td>
    `;
    resultTableBody.appendChild(row);
  });

  avgWT.textContent = (totalWT / data.length).toFixed(2);
  avgTAT.textContent = (totalTAT / data.length).toFixed(2);
}
