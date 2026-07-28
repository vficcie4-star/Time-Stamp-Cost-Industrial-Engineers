// Global variables
let rowCounter = 0;
let rows = [];
let pausedTimers = {};
let currentTimeInterval = null;
let editingRowId = null; // Track which row is being edited

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    updateDateTime();
    setInterval(updateDateTime, 1000);
    setupEventListeners();
    setupAutocomplete();
    setupListManagement();
});

// Setup event listeners
function setupEventListeners() {
    document.getElementById('addRowBtn').addEventListener('click', addNewRow);
    document.getElementById('clearHistoryBtn').addEventListener('click', clearHistory);
    document.getElementById('exportCSVBtn').addEventListener('click', exportCSV);
    document.getElementById('manageListsBtn').addEventListener('click', openManageLists);
    
    // Form modal event listeners
    document.getElementById('formCancelBtn').addEventListener('click', closeFormModal);
    document.getElementById('formSaveBtn').addEventListener('click', saveFormData);
    
    // Manage lists modal
    document.getElementById('manageListsCloseBtn').addEventListener('click', closeManageLists);
    document.getElementById('manageListsSaveBtn').addEventListener('click', saveManageLists);
    document.getElementById('addSectionBtn').addEventListener('click', () => addListItem('section'));
    document.getElementById('addProductBtn').addEventListener('click', () => addListItem('product'));
    
    // Enter key for adding items
    document.getElementById('newSectionInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') addListItem('section');
    });
    document.getElementById('newProductInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') addListItem('product');
    });
    
    // Close modals on backdrop click
    document.getElementById('formModal').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closeFormModal();
    });
    document.getElementById('manageListsModal').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closeManageLists();
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (document.getElementById('formModal').classList.contains('active')) {
                closeFormModal();
            }
            if (document.getElementById('manageListsModal').classList.contains('active')) {
                closeManageLists();
            }
        }
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            if (document.getElementById('formModal').classList.contains('active')) {
                saveFormData();
            }
        }
    });
}

// Setup autocomplete for Section and Product
function setupAutocomplete() {
    const sectionInput = document.getElementById('formSection');
    const productInput = document.getElementById('formProduct');
    const sectionSuggestions = document.getElementById('sectionSuggestions');
    const productSuggestions = document.getElementById('productSuggestions');
    
    // Section autocomplete
    sectionInput.addEventListener('input', function() {
        const value = this.value.toLowerCase();
        const suggestions = CONFIG.sections.filter(s => 
            s.toLowerCase().includes(value)
        );
        showSuggestions(sectionSuggestions, suggestions, value, this, 'section');
    });
    
    sectionInput.addEventListener('blur', function() {
        setTimeout(() => {
            sectionSuggestions.classList.remove('active');
        }, 200);
    });
    
    sectionInput.addEventListener('focus', function() {
        if (this.value) {
            const value = this.value.toLowerCase();
            const suggestions = CONFIG.sections.filter(s => 
                s.toLowerCase().includes(value)
            );
            showSuggestions(sectionSuggestions, suggestions, value, this, 'section');
        } else {
            // Show all suggestions when empty
            showSuggestions(sectionSuggestions, CONFIG.sections, '', this, 'section');
        }
    });
    
    // Product autocomplete
    productInput.addEventListener('input', function() {
        const value = this.value.toLowerCase();
        const suggestions = CONFIG.products.filter(p => 
            p.toLowerCase().includes(value)
        );
        showSuggestions(productSuggestions, suggestions, value, this, 'product');
    });
    
    productInput.addEventListener('blur', function() {
        setTimeout(() => {
            productSuggestions.classList.remove('active');
        }, 200);
    });
    
    productInput.addEventListener('focus', function() {
        if (this.value) {
            const value = this.value.toLowerCase();
            const suggestions = CONFIG.products.filter(p => 
                p.toLowerCase().includes(value)
            );
            showSuggestions(productSuggestions, suggestions, value, this, 'product');
        } else {
            // Show all suggestions when empty
            showSuggestions(productSuggestions, CONFIG.products, '', this, 'product');
        }
    });
}

// Show suggestions
function showSuggestions(container, suggestions, query, input, type) {
    container.innerHTML = '';
    
    if (suggestions.length === 0) {
        container.classList.remove('active');
        return;
    }
    
    suggestions.forEach(suggestion => {
        const div = document.createElement('div');
        div.className = 'suggestion-item';
        
        // Highlight matching text
        const index = suggestion.toLowerCase().indexOf(query.toLowerCase());
        if (index !== -1 && query) {
            const before = suggestion.substring(0, index);
            const match = suggestion.substring(index, index + query.length);
            const after = suggestion.substring(index + query.length);
            div.innerHTML = `${before}<span class="highlight">${match}</span>${after}`;
        } else {
            div.textContent = suggestion;
        }
        
        // Add label
        const label = document.createElement('span');
        label.className = 'suggestion-label';
        label.textContent = type === 'section' ? '📁' : '📦';
        div.appendChild(label);
        
        div.addEventListener('mousedown', function(e) {
            e.preventDefault();
            input.value = suggestion;
            container.classList.remove('active');
            // Trigger input event to update any dependencies
            input.dispatchEvent(new Event('input'));
        });
        
        container.appendChild(div);
    });
    
    container.classList.add('active');
}

// Setup list management
function setupListManagement() {
    renderListItems();
}

// Render list items in management modal
function renderListItems() {
    const sectionsContainer = document.getElementById('sectionsList');
    const productsContainer = document.getElementById('productsList');
    
    sectionsContainer.innerHTML = '';
    CONFIG.sections.forEach((item, index) => {
        const tag = createListItemTag(item, 'section', index);
        sectionsContainer.appendChild(tag);
    });
    
    productsContainer.innerHTML = '';
    CONFIG.products.forEach((item, index) => {
        const tag = createListItemTag(item, 'product', index);
        productsContainer.appendChild(tag);
    });
}

// Create list item tag
function createListItemTag(item, type, index) {
    const div = document.createElement('div');
    div.className = 'list-item-tag';
    div.textContent = item;
    
    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-item';
    removeBtn.textContent = '×';
    removeBtn.title = 'Remove this item';
    removeBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        if (confirm(`Remove "${item}" from ${type}s?`)) {
            if (type === 'section') {
                CONFIG.sections.splice(index, 1);
            } else {
                CONFIG.products.splice(index, 1);
            }
            renderListItems();
            // Update autocomplete suggestions
            setupAutocomplete();
        }
    });
    
    div.appendChild(removeBtn);
    return div;
}

// Add list item
function addListItem(type) {
    const input = type === 'section' ? 
        document.getElementById('newSectionInput') : 
        document.getElementById('newProductInput');
    
    const value = input.value.trim();
    if (!value) return;
    
    if (type === 'section') {
        if (!CONFIG.sections.includes(value)) {
            CONFIG.sections.push(value);
            CONFIG.sections.sort();
            renderListItems();
            setupAutocomplete();
            input.value = '';
        } else {
            alert('This item already exists!');
        }
    } else {
        if (!CONFIG.products.includes(value)) {
            CONFIG.products.push(value);
            CONFIG.products.sort();
            renderListItems();
            setupAutocomplete();
            input.value = '';
        } else {
            alert('This item already exists!');
        }
    }
}

// Open manage lists modal
function openManageLists() {
    const modal = document.getElementById('manageListsModal');
    renderListItems();
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Close manage lists modal
function closeManageLists() {
    const modal = document.getElementById('manageListsModal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

// Save manage lists (just close and save to localStorage)
function saveManageLists() {
    saveConfigToLocalStorage();
    closeManageLists();
    alert('Lists have been saved!');
}

// Save config to localStorage
function saveConfigToLocalStorage() {
    try {
        localStorage.setItem('journalConfig', JSON.stringify({
            sections: CONFIG.sections,
            products: CONFIG.products
        }));
    } catch (e) {
        console.error('Error saving config:', e);
    }
}

// Load config from localStorage
function loadConfigFromLocalStorage() {
    try {
        const savedConfig = localStorage.getItem('journalConfig');
        if (savedConfig) {
            const parsed = JSON.parse(savedConfig);
            CONFIG.sections = parsed.sections || CONFIG.sections;
            CONFIG.products = parsed.products || CONFIG.products;
        }
    } catch (e) {
        console.error('Error loading config:', e);
    }
}

// Update current time and date
function updateDateTime() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
    });
    document.getElementById('currentTime').textContent = timeStr;
    
    const dateStr = now.toLocaleDateString('en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    }).toUpperCase();
    document.getElementById('currentDate').textContent = dateStr;
}

// Add new row
function addNewRow() {
    rowCounter++;
    const rowId = rowCounter;
    
    const rowData = {
        id: rowId,
        section: '',
        product: '',
        sku: '',
        process: '',
        workUnit: '',
        oprt: '',
        mte: '',
        startTime: '',
        endTime: '',
        pausedTime: 0,
        isPaused: false,
        isStopped: false,
        pauseStartTime: null,
        remarks: ''
    };
    
    rows.push(rowData);
    renderRow(rowData);
    saveData();
    
    // Auto-set start time
    setTimeout(() => updateStartTime(rowId), 100);
    
    // Scroll to the new row
    setTimeout(() => {
        const newRow = document.getElementById(`row-${rowId}`);
        if (newRow) {
            newRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, 200);
    
    // Open form for editing
    setTimeout(() => {
        openFormModal(rowId);
    }, 300);
}

// Render a single row (compact view)
function renderRow(data) {
    const tbody = document.getElementById('tableBody');
    const tr = document.createElement('tr');
    tr.id = `row-${data.id}`;
    tr.dataset.id = data.id;
    
    // No.
    const tdNo = document.createElement('td');
    tdNo.textContent = data.id;
    tdNo.style.fontWeight = '600';
    tdNo.style.textAlign = 'center';
    tr.appendChild(tdNo);
    
    // Product - Clickable to open form
    const tdProduct = document.createElement('td');
    const productDiv = document.createElement('div');
    productDiv.className = 'product-cell' + (data.product ? '' : ' empty');
    productDiv.textContent = data.product || 'Tap to add';
    productDiv.onclick = () => openFormModal(data.id);
    tdProduct.appendChild(productDiv);
    tr.appendChild(tdProduct);
    
    // Process - Clickable to open form
    const tdProcess = document.createElement('td');
    const processDiv = document.createElement('div');
    processDiv.className = 'process-cell' + (data.process ? '' : ' empty');
    processDiv.textContent = data.process || 'Tap to add';
    processDiv.onclick = () => openFormModal(data.id);
    tdProcess.appendChild(processDiv);
    tr.appendChild(tdProcess);
    
    // Start Time
    const tdStartTime = document.createElement('td');
    const startSpan = document.createElement('span');
    startSpan.className = 'time-display';
    startSpan.textContent = data.startTime || '--:--:--';
    startSpan.id = `startTime-${data.id}`;
    tdStartTime.appendChild(startSpan);
    tr.appendChild(tdStartTime);
    
    // End Time
    const tdEndTime = document.createElement('td');
    tdEndTime.id = `endTime-${data.id}`;
    
    const endTimeContainer = document.createElement('div');
    endTimeContainer.style.display = 'flex';
    endTimeContainer.style.flexDirection = 'column';
    endTimeContainer.style.gap = '3px';
    endTimeContainer.style.alignItems = 'center';
    
    const endTimeDisplay = document.createElement('span');
    endTimeDisplay.className = 'time-display';
    endTimeDisplay.textContent = data.endTime || '--:--:--';
    endTimeDisplay.id = `endTimeDisplay-${data.id}`;
    endTimeContainer.appendChild(endTimeDisplay);
    
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.gap = '3px';
    buttonContainer.style.width = '100%';
    
    const stopBtn = document.createElement('button');
    stopBtn.textContent = 'Stop';
    stopBtn.className = 'btn-table btn-stop';
    stopBtn.onclick = (e) => {
        e.stopPropagation();
        stopTimer(data.id);
    };
    buttonContainer.appendChild(stopBtn);
    
    const pauseBtn = document.createElement('button');
    pauseBtn.textContent = data.isPaused ? 'Resume' : 'Pause';
    pauseBtn.className = `btn-table ${data.isPaused ? 'btn-resume' : 'btn-pause'}`;
    pauseBtn.onclick = (e) => {
        e.stopPropagation();
        togglePause(data.id);
    };
    buttonContainer.appendChild(pauseBtn);
    
    endTimeContainer.appendChild(buttonContainer);
    tdEndTime.appendChild(endTimeContainer);
    tr.appendChild(tdEndTime);
    
    // Paused Time
    const tdPaused = document.createElement('td');
    const pausedDisplay = document.createElement('span');
    pausedDisplay.className = 'paused-display';
    pausedDisplay.id = `pausedDisplay-${data.id}`;
    pausedDisplay.textContent = formatPausedTime(data.pausedTime || 0);
    tdPaused.appendChild(pausedDisplay);
    tr.appendChild(tdPaused);
    
    // Action
    const tdAction = document.createElement('td');
    const actionDiv = document.createElement('div');
    actionDiv.className = 'action-cell';
    
    // Edit button
    const editBtn = document.createElement('button');
    editBtn.textContent = '✎';
    editBtn.className = 'btn-table btn-edit';
    editBtn.title = 'Edit details';
    editBtn.onclick = (e) => {
        e.stopPropagation();
        openFormModal(data.id);
    };
    actionDiv.appendChild(editBtn);
    
    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '✕';
    deleteBtn.className = 'delete-btn';
    deleteBtn.onclick = (e) => {
        e.stopPropagation();
        deleteRow(data.id);
    };
    actionDiv.appendChild(deleteBtn);
    
    tdAction.appendChild(actionDiv);
    tr.appendChild(tdAction);
    
    tbody.appendChild(tr);
    
    // If it was paused, restart the timer
    if (data.isPaused && !data.isStopped) {
        startPauseTimer(data.id);
    }
}

// Open form modal for editing
function openFormModal(rowId) {
    const row = rows.find(r => r.id === rowId);
    if (!row) return;
    
    editingRowId = rowId;
    const modal = document.getElementById('formModal');
    const title = document.getElementById('formModalTitle');
    
    title.textContent = `Entry #${row.id} - ${row.product || 'New Entry'}`;
    
    // Populate form fields
    document.getElementById('formSection').value = row.section || '';
    document.getElementById('formProduct').value = row.product || '';
    document.getElementById('formSKU').value = row.sku || '';
    document.getElementById('formProcess').value = row.process || '';
    document.getElementById('formWorkUnit').value = row.workUnit || '';
    document.getElementById('formOprt').value = row.oprt || '';
    document.getElementById('formMTE').value = row.mte || '';
    document.getElementById('formRemarks').value = row.remarks || '';
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Trigger autocomplete to show suggestions
    setTimeout(() => {
        const sectionInput = document.getElementById('formSection');
        const productInput = document.getElementById('formProduct');
        if (sectionInput.value) {
            sectionInput.dispatchEvent(new Event('focus'));
        } else {
            sectionInput.dispatchEvent(new Event('focus'));
        }
    }, 100);
}

// Close form modal
function closeFormModal() {
    const modal = document.getElementById('formModal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
    editingRowId = null;
    
    // Hide suggestions
    document.getElementById('sectionSuggestions').classList.remove('active');
    document.getElementById('productSuggestions').classList.remove('active');
}

// Save form data
function saveFormData() {
    if (!editingRowId) return;
    
    const row = rows.find(r => r.id === editingRowId);
    if (!row) return;
    
    // Get form values
    row.section = document.getElementById('formSection').value.trim();
    row.product = document.getElementById('formProduct').value.trim();
    row.sku = document.getElementById('formSKU').value.trim();
    row.process = document.getElementById('formProcess').value.trim();
    row.workUnit = document.getElementById('formWorkUnit').value.trim();
    row.oprt = document.getElementById('formOprt').value.trim();
    row.mte = document.getElementById('formMTE').value.trim();
    row.remarks = document.getElementById('formRemarks').value.trim();
    
    // Update display
    updateRowDisplay(row.id);
    saveData();
    closeFormModal();
}

// Update row display after form save
function updateRowDisplay(rowId) {
    const row = rows.find(r => r.id === rowId);
    if (!row) return;
    
    const rowElement = document.getElementById(`row-${rowId}`);
    if (!rowElement) return;
    
    const cells = rowElement.querySelectorAll('td');
    
    // Update Product
    const productDiv = cells[1]?.querySelector('.product-cell');
    if (productDiv) {
        productDiv.textContent = row.product || 'Tap to add';
        productDiv.className = 'product-cell' + (row.product ? '' : ' empty');
    }
    
    // Update Process
    const processDiv = cells[2]?.querySelector('.process-cell');
    if (processDiv) {
        processDiv.textContent = row.process || 'Tap to add';
        processDiv.className = 'process-cell' + (row.process ? '' : ' empty');
    }
}

// Stop timer (same as before)
function stopTimer(rowId) {
    const row = rows.find(r => r.id === rowId);
    if (!row || row.isStopped) return;
    
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
    });
    
    row.endTime = timeStr;
    row.isStopped = true;
    row.isPaused = false;
    
    if (pausedTimers[rowId]) {
        clearInterval(pausedTimers[rowId]);
        delete pausedTimers[rowId];
    }
    
    const endDisplay = document.getElementById(`endTimeDisplay-${rowId}`);
    if (endDisplay) endDisplay.textContent = timeStr;
    
    const rowElement = document.getElementById(`row-${rowId}`);
    if (rowElement) {
        const buttons = rowElement.querySelectorAll('.btn-table');
        buttons.forEach(btn => {
            if (!btn.classList.contains('btn-edit')) {
                btn.disabled = true;
                btn.style.opacity = '0.5';
                btn.style.cursor = 'not-allowed';
            }
        });
    }
    
    const pausedDisplay = document.getElementById(`pausedDisplay-${rowId}`);
    if (pausedDisplay) {
        pausedDisplay.textContent = formatPausedTime(row.pausedTime || 0);
    }
    
    saveData();
}

// Toggle pause (same as before)
function togglePause(rowId) {
    const row = rows.find(r => r.id === rowId);
    if (!row || row.isStopped) return;
    
    const rowElement = document.getElementById(`row-${rowId}`);
    if (!rowElement) return;
    
    const pauseBtn = rowElement.querySelector('.btn-table.btn-pause, .btn-table.btn-resume');
    
    if (row.isPaused) {
        row.isPaused = false;
        if (pausedTimers[rowId]) {
            clearInterval(pausedTimers[rowId]);
            delete pausedTimers[rowId];
        }
        if (row.pauseStartTime) {
            const pauseDuration = (Date.now() - row.pauseStartTime) / 1000;
            row.pausedTime = (row.pausedTime || 0) + pauseDuration;
            row.pauseStartTime = null;
        }
        if (pauseBtn) {
            pauseBtn.textContent = 'Pause';
            pauseBtn.className = 'btn-table btn-pause';
        }
    } else {
        row.isPaused = true;
        row.pauseStartTime = Date.now();
        if (pauseBtn) {
            pauseBtn.textContent = 'Resume';
            pauseBtn.className = 'btn-table btn-resume';
        }
        startPauseTimer(rowId);
    }
    
    saveData();
}

// Start pause timer
function startPauseTimer(rowId) {
    if (pausedTimers[rowId]) {
        clearInterval(pausedTimers[rowId]);
    }
    
    pausedTimers[rowId] = setInterval(() => {
        const row = rows.find(r => r.id === rowId);
        if (row && row.isPaused && row.pauseStartTime) {
            const elapsed = (Date.now() - row.pauseStartTime) / 1000;
            const totalPaused = (row.pausedTime || 0) + elapsed;
            const display = document.getElementById(`pausedDisplay-${rowId}`);
            if (display) {
                display.textContent = formatPausedTime(totalPaused);
            }
        }
    }, 1000);
}

// Format paused time
function formatPausedTime(seconds) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// Delete row
function deleteRow(rowId) {
    if (confirm('Delete this entry?')) {
        if (pausedTimers[rowId]) {
            clearInterval(pausedTimers[rowId]);
            delete pausedTimers[rowId];
        }
        
        rows = rows.filter(r => r.id !== rowId);
        const rowElement = document.getElementById(`row-${rowId}`);
        if (rowElement) {
            rowElement.remove();
        }
        saveData();
        renumberRows();
    }
}

// Renumber rows
function renumberRows() {
    const tbody = document.getElementById('tableBody');
    const rowElements = tbody.querySelectorAll('tr');
    
    rowElements.forEach((row, index) => {
        const tdNo = row.querySelector('td:first-child');
        if (tdNo) {
            tdNo.textContent = index + 1;
        }
        const rowId = parseInt(row.dataset.id);
        const rowData = rows.find(r => r.id === rowId);
        if (rowData) {
            rowData.id = index + 1;
        }
        row.dataset.id = index + 1;
    });
    rowCounter = rows.length;
    saveData();
}

// Clear history
function clearHistory() {
    if (confirm('Clear all history?')) {
        Object.keys(pausedTimers).forEach(key => {
            clearInterval(pausedTimers[key]);
            delete pausedTimers[key];
        });
        
        rows = [];
        rowCounter = 0;
        document.getElementById('tableBody').innerHTML = '';
        saveData();
    }
}

// Export CSV
function exportCSV() {
    if (rows.length === 0) {
        alert('No data to export');
        return;
    }
    
    const headers = ['No.', 'Section', 'Product', 'SKU', 'Process', 'Oprt', 'MTE', 'Work Unit', 'Start Time', 'End Time', 'Paused Time', 'Remarks'];
    const csvRows = [];
    csvRows.push(headers.join(','));
    
    rows.forEach(row => {
        const rowData = [
            row.id,
            `"${(row.section || '').replace(/"/g, '""')}"`,
            `"${(row.product || '').replace(/"/g, '""')}"`,
            `"${(row.sku || '').replace(/"/g, '""')}"`,
            `"${(row.process || '').replace(/"/g, '""')}"`,
            `"${(row.oprt || '').replace(/"/g, '""')}"`,
            `"${(row.mte || '').replace(/"/g, '""')}"`,
            `"${(row.workUnit || '').replace(/"/g, '""')}"`,
            `"${row.startTime || ''}"`,
            `"${row.endTime || ''}"`,
            `"${formatPausedTime(row.pausedTime || 0)}"`,
            `"${(row.remarks || '').replace(/"/g, '""')}"`
        ];
        csvRows.push(rowData.join(','));
    });
    
    const csvString = csvRows.join('\n');
    const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `journal_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// Save data to localStorage
function saveData() {
    try {
        const dataToSave = {
            rows: rows,
            rowCounter: rowCounter
        };
        localStorage.setItem('journalData', JSON.stringify(dataToSave));
    } catch (e) {
        console.error('Error saving data:', e);
    }
}

// Load data from localStorage
function loadData() {
    // Load config first
    loadConfigFromLocalStorage();
    
    try {
        const savedData = localStorage.getItem('journalData');
        if (savedData) {
            const parsed = JSON.parse(savedData);
            rows = parsed.rows || [];
            rowCounter = parsed.rowCounter || 0;
            
            const tbody = document.getElementById('tableBody');
            tbody.innerHTML = '';
            rows.forEach(row => {
                renderRow(row);
                if (row.isPaused && !row.isStopped) {
                    startPauseTimer(row.id);
                }
            });
        }
    } catch (e) {
        console.error('Error loading data:', e);
        rows = [];
        rowCounter = 0;
    }
}

// Update start time when adding row
function updateStartTime(rowId) {
    const row = rows.find(r => r.id === rowId);
    if (row && !row.startTime) {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-US', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit' 
        });
        row.startTime = timeStr;
        const display = document.getElementById(`startTime-${rowId}`);
        if (display) {
            display.textContent = timeStr;
        }
        saveData();
    }
}

// Auto-save on page unload
window.addEventListener('beforeunload', () => {
    saveData();
    saveConfigToLocalStorage();
});

// Handle visibility change
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        saveData();
        saveConfigToLocalStorage();
    } else {
        rows.forEach(row => {
            if (row.isPaused && !row.isStopped && row.pauseStartTime) {
                startPauseTimer(row.id);
            }
        });
    }
});
