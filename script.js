
/* -----------------------------
   REPAIRABILITY SETTINGS
--------------------------------*/
const CRITERIA = [
  { key:"accessibility", label:"Accessibility & opening", weight:0.20 },
  { key:"modularity", label:"Modularity / interchangeability", weight:0.20 },
  { key:"spareParts", label:"Spare part availability", weight:0.20 },
  { key:"serviceInfo", label:"Service manuals & documentation", weight:0.20 },
  { key:"softwareLock", label:"Software/spare part pairing", weight:0.10 },
  { key:"economy", label:"Economy of repair", weight:0.10 },
];

// Create sliders for criteria
const criteriaDiv = document.getElementById("criteria-container");
CRITERIA.forEach(c => {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = `
    <label>${c.label}: <span id="${c.key}-val">5</span>/10</label>
    <input type="range" class="bar" min="0" max="10" value="5" id="${c.key}" 
      oninput="document.getElementById('${c.key}-val').textContent=this.value">
  `;
  criteriaDiv.appendChild(wrapper);
});

/* -----------------------------
   STORAGE
--------------------------------*/
let devices = JSON.parse(localStorage.getItem("devices") || "[]");
let editingId = null;

/* -----------------------------
   HELPERS
--------------------------------*/
function save() {
  localStorage.setItem("devices", JSON.stringify(devices));
}

function calculateIndex(device) {
  criteria = device.criteria;
  let sum = 0;
  CRITERIA.forEach(c => {
    sum += (criteria[c.key] / 10) * c.weight;
  });
  return Math.round(sum * 1000) / 10; // one decimal
}


/* -----------------------------
   FORM SUBMISSION
--------------------------------*/
document.getElementById("device-form").addEventListener("submit", e => {
  e.preventDefault();

  const device = {
    id: editingId || Date.now(),
    deviceName: document.getElementById("deviceName").value,
    category: document.getElementById("category").value,
    age: Number(document.getElementById("age").value) || 0,
    usage: Number(document.getElementById("usage").value) || 0,
    importance: Number(document.getElementById("importance").value),
    notes: document.getElementById("notes").value,
    criteria: {},
    createdAt: new Date().toISOString(),
  };

  CRITERIA.forEach(c => {
    device.criteria[c.key] = Number(document.getElementById(c.key).value);
  });

  device.repairIndex = calculateIndex(device);

  if (editingId) {
    devices = devices.map(d => d.id === editingId ? device : d);
    editingId = null;
    document.getElementById("form-title").textContent = "Add Device";
    document.getElementById("submit-btn").textContent = "Add Device";
  } else {
    devices.unshift(device);
  }

  save();
  renderList();
  e.target.reset();
});

function calculateSustainability(devices) {
    sum = 0;
    importances = 0;
    for (const device in devices) {
        sum += devices[device].repairIndex * (devices[device].importance / 10);
        importances += devices[device].importance / 10;
    }
    return sum/importances;
}

/* -----------------------------
   RENDER DEVICE LIST
--------------------------------*/
function renderList() {
  const list = document.getElementById("device-list");
  list.innerHTML = "";

  const sustainability_val = document.getElementById("sustainability-val");
  sustainability_val.textContent = Math.round(calculateSustainability(devices)).toString();

  const q = search.value.toLowerCase();
  let items = devices.filter(d =>
    d.deviceName?.toLowerCase().includes(q) || d.name?.toLowerCase().includes(q) ||
    (d.category || "").toLowerCase().includes(q)
  );

  // sorting
  if (sort.value === "repair-high")
    items.sort((a,b)=>b.repairIndex-a.repairIndex);
  else if (sort.value === "repair-low")
    items.sort((a,b)=>a.repairIndex-b.repairIndex);
  else if (sort.value === "importance-high")
    items.sort((a,b)=>b.importance-a.importance);
  else if (sort.value === "importance-low")
    items.sort((a,b)=>a.importance-b.importance);
  else if (sort.value === "age-high")
    items.sort((a,b)=>b.age-a.age);
  else if (sort.value === "age-low")
    items.sort((a,b)=>a.age-b.age);
  else if (sort.value === "usage-high")
    items.sort((a,b)=>b.usage-a.usage);
  else if (sort.value === "usage-low")
    items.sort((a,b)=>a.usage-b.usage);
  else
    items.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));

  items.forEach(d => {
    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <h3>${d.deviceName || d.name} (${d.category || "uncategorized"})</h3>
      <p>Age: ${d.age} yrs — Usage: ${d.usage} hrs/wk — Importance: ${d.importance}/10</p>
      <p><strong>Repairability Index: ${d.repairIndex}</strong></p>

      <div style="margin:10px 0;">
        ${CRITERIA.map(c =>
          `<div>${c.label}: <strong>${d.criteria[c.key]}</strong>/10</div>`
        ).join("")}
      </div>

      <p>${d.notes || ""}</p>

      <div class="flex" style="margin-top:10px;">
        <button onclick="editDevice(${d.id})">Edit</button>
        <button class="btn-danger" onclick="deleteDevice(${d.id})">Delete</button>
      </div>
    `;

    list.appendChild(card);
  });
}

/* -----------------------------
   EDIT / DELETE
--------------------------------*/
function editDevice(id) {
  const d = devices.find(x => x.id === id);
  editingId = id;

  deviceName.value = d.deviceName || d.name;
  category.value = d.category;
  age.value = d.age;
  usage.value = d.usage;
  importance.value = d.importance;
  document.getElementById("importance-val").textContent = d.importance;
  notes.value = d.notes;

  CRITERIA.forEach(c => {
    document.getElementById(c.key).value = d.criteria[c.key];
    document.getElementById(`${c.key}-val`).textContent = d.criteria[c.key];
  });

  document.getElementById("form-title").textContent = "Edit Device";
  document.getElementById("submit-btn").textContent = "Save Changes";
}

function deleteDevice(id) {
  if (!confirm("Delete this device?")) return;
  devices = devices.filter(d => d.id !== id);
  save();
  renderList();
}

function exportJSON() {
  let json = localStorage.getItem("devices");
  const blob = new Blob([json], { type:"text/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "devices.json";
  a.click();
  URL.revokeObjectURL(url);
}

function importJSON() {
  const a = document.createElement("input");
  a.type = "file";

  a.addEventListener("change", () => {
    const reader = new FileReader();
    reader.readAsText(a.files[0]);
    
    reader.onload = () => {
      try {
        let json = JSON.parse(reader.result);
        for (const device in json) {
          if (!json[device].id ||
              !(json[device].deviceName || json[device].name) ||
              !json[device].category ||
              !json[device].importance ||
              !json[device].repairIndex) {
            throw "ValidJSONbutInvalidContent";
          }
        }
        localStorage["devices"] = reader.result;
        devices = JSON.parse(localStorage.getItem("devices") || "[]");
        renderList();
      } catch {
        alert("Invalid file!");
    }
    }
  });

  a.click();
}

/* -----------------------------
   INITIAL RENDER
--------------------------------*/
renderList();