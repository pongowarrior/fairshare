let participants = [];
let items = [];

function addParticipant() {
  const name = document.getElementById("nameInput").value.trim();
  if (name) {
    participants.push(name);
    updateParticipantList();
    document.getElementById("nameInput").value = "";
  }
}

function updateParticipantList() {
  const list = document.getElementById("participantList");
  list.innerHTML = participants.map(p => `<li>${p}</li>`).join("");
}

function addItem() {
  const name = document.getElementById("itemName").value.trim();
  const cost = parseFloat(document.getElementById("itemCost").value);
  if (name && !isNaN(cost)) {
    items.push({ name, cost });
    updateItemList();
    document.getElementById("itemName").value = "";
    document.getElementById("itemCost").value = "";
  }
}

function updateItemList() {
  const list = document.getElementById("itemList");
  list.innerHTML = items.map(i => `<li>${i.name}: £${i.cost.toFixed(2)}</li>`).join("");
}

function calculateSplit() {
  if (participants.length === 0 || items.length === 0) return;
  const total = items.reduce((sum, i) => sum + i.cost, 0);
  const share = total / participants.length;
  const output = participants.map(p => `${p} owes £${share.toFixed(2)}`).join("<br>");
  document.getElementById("summaryOutput").innerHTML = output;
}