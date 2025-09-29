// Global State
let people = []; 
let items = []; // Stores items: { id, name, cost, assignees: [] }
let splitMode = 'even'; // 'even' or 'itemized'

// DOM Elements
const peopleListContainer = document.getElementById('people-list-container');
const addPersonBtn = document.getElementById('add-person-btn');
const newPersonNameInput = document.getElementById('new-person-name');
const calculateBtn = document.getElementById('calculate-btn');

const billTotalInput = document.getElementById('bill-total');
const taxRateInput = document.getElementById('tax-rate');
const tipRateInput = document.getElementById('tip-rate');
const summaryCard = document.querySelector('.summary-card');
const finalSummaryShares = document.getElementById('final-summary-shares');
const itemizedListContainer = document.getElementById('itemized-list-container');

// Mode Switch Elements
const evenSplitBtn = document.getElementById('even-split-btn');
const itemizedSplitBtn = document.getElementById('itemized-split-btn');
const billInputCard = document.querySelector('.bill-input-card');
const itemizedInputCard = document.querySelector('.itemized-input-card');
const itemAssignmentContainer = document.createElement('div'); // Container for assignment UI

// Item Addition Elements
const newItemNameInput = document.getElementById('new-item-name');
const newItemCostInput = document.getElementById('new-item-cost');
const addItemBtn = document.getElementById('add-item-btn');


// --- Utility & Display Functions ---

function formatCurrency(amount) {
    // Ensures a clean, standard currency format (e.g., $100.00)
    return `$${(Math.round(amount * 100) / 100).toFixed(2)}`;
}

function renderPeopleList() {
    peopleListContainer.innerHTML = '';
    if (people.length === 0) {
        peopleListContainer.innerHTML = '<p style="text-align: center; color: #6c757d;">Add a person to start splitting.</p>';
    }
    people.forEach((person, index) => {
        const item = document.createElement('div');
        item.classList.add('person-item');
        item.innerHTML = `
            <span class="person-name">${person.name}</span>
            <button class="remove-btn" data-id="${person.id}">×</button>
        `;
        peopleListContainer.appendChild(item);
    });
    if (splitMode === 'itemized') renderItemAssignmentUI();
}

function addPerson() {
    const name = newPersonNameInput.value.trim();
    if (name) {
        people.push({
            id: Date.now(),
            name: name,
            amount_owed: 0,
            subtotal_share: 0,
            tax_share: 0,
            tip_share: 0
        });
        newPersonNameInput.value = '';
        renderPeopleList();
    }
}

function removePerson(id) {
    people = people.filter(p => p.id !== id);
    
    // Also remove person from item assignees lists
    items = items.map(item => ({
        ...item,
        assignees: item.assignees.filter(personId => personId !== id)
    }));

    renderPeopleList();
}

// --- Itemized Functions ---

function renderItemList() {
    itemizedListContainer.innerHTML = '';
    const totalCost = items.reduce((sum, item) => sum + item.cost, 0);
    
    if (items.length === 0) {
        itemizedListContainer.innerHTML = '<p style="text-align: center; color: #6c757d;">No items added.</p>';
    }

    items.forEach(item => {
        const itemEl = document.createElement('div');
        itemEl.classList.add('item-item');
        itemEl.innerHTML = `
            <span class="item-name">${item.name}</span>
            <span class="item-cost">${formatCurrency(item.cost)}</span>
            <button class="remove-btn" data-id="${item.id}">×</button>
        `;
        itemizedListContainer.appendChild(itemEl);
    });

    // Update the Bill Subtotal input field automatically
    billTotalInput.value = totalCost.toFixed(2);
    
    renderItemAssignmentUI();
}

function addItem() {
    const name = newItemNameInput.value.trim();
    const cost = parseFloat(newItemCostInput.value);

    if (name && cost > 0) {
        items.push({
            id: Date.now(),
            name: name,
            cost: cost,
            assignees: [] // No one assigned yet
        });
        newItemNameInput.value = '';
        newItemCostInput.value = '';
        renderItemList();
    }
}

function removeItem(id) {
    items = items.filter(item => item.id !== id);
    renderItemList();
}

function renderItemAssignmentUI() {
    itemAssignmentContainer.innerHTML = '';
    
    if (items.length > 0 && people.length > 0) {
        
        const assignmentHTML = items.map(item => {
            const checkboxes = people.map(person => `
                <label>
                    <input type="checkbox" data-item-id="${item.id}" data-person-id="${person.id}"
                           ${item.assignees.includes(person.id) ? 'checked' : ''}>
                    <span>${person.name}</span>
                </label>
            `).join('');
            
            return `
                <div class="assignment-item">
                    <div class="assignment-item-name">${item.name} (${formatCurrency(item.cost)})</div>
                    <div class="person-checkbox-group">${checkboxes}</div>
                </div>
            `;
        }).join('');
        
        itemAssignmentContainer.innerHTML = assignmentHTML;
    } else {
        itemAssignmentContainer.innerHTML = '<p style="text-align: center; color: #6c757d;">Add people and items to assign costs.</p>';
    }
}

function handleAssignmentChange(itemId, personId, checked) {
    items = items.map(item => {
        if (item.id === itemId) {
            let newAssignees = [...item.assignees];
            if (checked && !newAssignees.includes(personId)) {
                newAssignees.push(personId);
            } else if (!checked) {
                newAssignees = newAssignees.filter(id => id !== personId);
            }
            return { ...item, assignees: newAssignees };
        }
        return item;
    });
    calculateFairShare(); 
}


// --- Main Calculation Logic ---

function calculateFairShare() {
    const subtotal = parseFloat(billTotalInput.value) || 0;
    const taxRate = parseFloat(taxRateInput.value) / 100 || 0;
    const tipRate = parseFloat(tipRateInput.value) / 100 || 0;
    const numPeople = people.length;

    if (subtotal <= 0 || numPeople === 0) {
        summaryCard.classList.add('hidden');
        return;
    }

    // 1. Calculate Tax and Tip Amounts
    const taxAmount = subtotal * taxRate;
    const billPlusTax = subtotal + taxAmount;
    const tipAmount = billPlusTax * tipRate;
    const grandTotal = billPlusTax + tipAmount;

    let sharePerPerson = 0;
    
    // Reset person shares before calculation
    people.forEach(p => { p.subtotal_share = 0; p.tax_share = 0; p.tip_share = 0; });

    if (splitMode === 'even') {
        // --- EVEN SPLIT LOGIC ---
        sharePerPerson = grandTotal / numPeople;
        
        people.forEach(p => {
            p.amount_owed = sharePerPerson;
        });
        
    } else if (splitMode === 'itemized') {
        // --- ITEMIZED SPLIT LOGIC ---
        
        // A. Calculate Subtotal Shares
        items.forEach(item => {
            const assigneesCount = item.assignees.length;
            if (assigneesCount > 0) {
                const individualItemShare = item.cost / assigneesCount;
                item.assignees.forEach(personId => {
                    const person = people.find(p => p.id === personId);
                    if (person) {
                        person.subtotal_share += individualItemShare;
                    }
                });
            }
        });
        
        // B. Calculate Tax and Tip Shares (Proportional)
        
        people.forEach(person => {
            if (person.subtotal_share > 0) {
                // Calculate person's proportional weight of the total bill
                const proportionalWeight = person.subtotal_share / subtotal;
                
                person.tax_share = taxAmount * proportionalWeight;
                person.tip_share = tipAmount * proportionalWeight;
                
                person.amount_owed = person.subtotal_share + person.tax_share + person.tip_share;
            } else {
                person.amount_owed = 0;
            }
        });
    }


    // 4. Render the Summary UI
    renderSummary(subtotal, taxAmount, tipAmount, grandTotal, splitMode === 'even' ? sharePerPerson : null);
}

// --- Render Summary Function ---

function renderSummary(subtotal, taxAmount, tipAmount, grandTotal, evenSplitAmount) {
    summaryCard.classList.remove('hidden');

    // Update Top Totals
    document.getElementById('summary-subtotal').textContent = formatCurrency(subtotal);
    document.getElementById('summary-tax').textContent = formatCurrency(taxAmount);
    document.getElementById('summary-tip').textContent = formatCurrency(tipAmount);
    document.getElementById('summary-grand-total').textContent = formatCurrency(grandTotal);
    
    // Individual Shares Display
    finalSummaryShares.innerHTML = '';
    const perPersonDisplay = document.querySelector('.per-person-display');
    perPersonDisplay.classList.toggle('hidden', splitMode !== 'even');

    if (splitMode === 'even') {
         document.getElementById('per-person-amount').textContent = formatCurrency(evenSplitAmount);
    } 
    
    people.forEach(person => {
        const item = document.createElement('div');
        item.classList.add('share-item');
        
        item.innerHTML = `
            <span class="person-name">${person.name}</span>
            <span class="amount">${formatCurrency(person.amount_owed)}</span>
        `;
        finalSummaryShares.appendChild(item);
    });
}


// --- Event Handlers & Initialization ---

// Itemized split mode button click
function switchSplitMode(mode) {
    splitMode = mode;
    evenSplitBtn.classList.remove('active');
    itemizedSplitBtn.classList.remove('active');

    if (mode === 'even') {
        evenSplitBtn.classList.add('active');
        itemizedInputCard.classList.add('hidden');
        itemAssignmentContainer.remove(); 
        billInputCard.classList.remove('hidden');
    } else {
        itemizedSplitBtn.classList.add('active');
        itemizedInputCard.classList.remove('hidden');
        billInputCard.classList.add('hidden');
        
        // Add item assignment UI
        itemAssignmentContainer.classList.add('assignment-card');
        peopleListContainer.parentNode.insertBefore(itemAssignmentContainer, calculateBtn);
        renderItemAssignmentUI();
        renderItemList(); // Force update bill total from items
    }
    calculateFairShare(); 
}

// Initial setup on load
document.addEventListener('DOMContentLoaded', () => {
    // 1. Initial People
    people.push({ id: 1, name: "You", amount_owed: 0, subtotal_share: 0, tax_share: 0, tip_share: 0 });
    people.push({ id: 2, name: "Friend A", amount_owed: 0, subtotal_share: 0, tax_share: 0, tip_share: 0 });
    renderPeopleList();
    
    // 2. Initial Mode
    switchSplitMode('even');

    // 3. Event Listeners for Input & Actions
    addPersonBtn.addEventListener('click', addPerson);
    peopleListContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-btn')) {
            const id = parseInt(e.target.getAttribute('data-id'));
            removePerson(id);
        }
    });

    // Itemized Listeners
    addItemBtn.addEventListener('click', addItem);
    itemizedListContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-btn')) {
            const id = parseInt(e.target.getAttribute('data-id'));
            removeItem(id);
        }
    });
    
    // Mode Switch Listeners
    evenSplitBtn.addEventListener('click', () => switchSplitMode('even'));
    itemizedSplitBtn.addEventListener('click', () => switchSplitMode('itemized'));
    
    // Item Assignment Listener (Event Delegation)
    itemAssignmentContainer.addEventListener('change', (e) => {
        if (e.target.type === 'checkbox') {
            const itemId = parseInt(e.target.dataset.itemId);
            const personId = parseInt(e.target.dataset.personId);
            handleAssignmentChange(itemId, personId, e.target.checked);
        }
    });
    
    // Input change listeners for calculation updates
    const inputElements = [billTotalInput, taxRateInput, tipRateInput];
    inputElements.forEach(input => {
        input.addEventListener('input', () => {
            // Recalculate if summary is visible or if mode is even
            if (!summaryCard.classList.contains('hidden') || splitMode === 'even') {
                calculateFairShare();
            }
        });
    });

    // Final Calculate Button (Always useful)
    calculateBtn.addEventListener('click', calculateFairShare);

});
