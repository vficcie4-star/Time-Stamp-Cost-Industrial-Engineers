// Global variables
let rowCounter = 0;
let rows = [];
let pausedTimers = {};
let currentTimeInterval = null;
let editingRowId = null; // Track which row is being edited
let notes = ''; // Store notes content
let notesLastSaved = null; // Track last save time

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    updateDateTime();
    setInterval(updateDateTime, 1000);
    setupEventListeners();
    setupAutocomplete();
    updateWordCount();
});

// Setup event listeners
function setupEventListeners() {
    document.getElementById('addRowBtn').addEventListener('click', addNewRow);
    document.getElementById('clearHistoryBtn').addEventListener('click', clearHistory);
    document.getElementById('notesBtn').addEventListener('click', openNotesModal);
    document.getElementById('exportCSVBtn').addEventListener('click', exportCSV);
    
    // Form modal event listeners
    document.getElementById('formCancelBtn').addEventListener('click', closeFormModal);
    document.getElementById('formSaveBtn').addEventListener('click', saveFormData);
    
    // Notes modal event listeners
    document.getElementById('notesCancelBtn').addEventListener('click', closeNotesModal);
    document.getElementById('notesSaveBtn').addEventListener('click', saveNotes);
    
    // Close modal on backdrop click
    document.getElementById('formModal').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) {
            closeFormModal();
        }
    });
    
    document.getElementById('notesModal').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) {
            closeNotesModal();
        }
    });
    
    // Notes text area word count
    document.getElementById('notesTextArea').addEventListener('input', updateWordCount);
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (document.getElementById('formModal').classList.contains('active')) {
                closeFormModal();
            }
            if (document.getElementById('notesModal').classList.contains('active')) {
                closeNotesModal();
            }
        }
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            if (document.getElementById('formModal').classList.contains('active')) {
                saveFormData();
            }
            if (document.getElementById('notesModal').classList.contains('active')) {
                saveNotes();
            }
        }
        if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
            if (document.getElementById('notesModal').classList.contains('active')) {
                e.preventDefault();
                saveNotes();
            }
        }
    });
}

// Update word count for notes
function updateWordCount() {
    const textarea = document.getElementById('notesTextArea');
    const text = textarea.value;
    const charCount = text.length;
    const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
    
    document.getElementById('wordCount').textContent = wordCount;
    document.getElementById('charCount').textContent = charCount;
}

// Open notes modal
function openNotesModal() {
    const modal = document.getElementById('notesModal');
    const textarea = document.getElementById('notesTextArea');
    
    // Load existing notes
    textarea.value = notes || '';
    updateWordCount();
    
    // Update last saved info
    updateLastSavedInfo();
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Focus on textarea
    setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    }, 200);
}

// Close notes modal
function closeNotesModal() {
    const modal = document.getElementById('notesModal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

// Save notes
function saveNotes() {
    const textarea = document.getElementById('notesTextArea');
    notes = textarea.value;
    notesLastSaved = new Date();
    updateLastSavedInfo();
    saveData();
    closeNotesModal();
}

// Update last saved info
function updateLastSavedInfo() {
    const lastSavedSpan = document.getElementById('notesLastSaved');
    if (notesLastSaved) {
        const now = new Date();
        const diffMs = now - notesLastSaved;
        const diffMins = Math.floor(diffMs / 60000);
        const diffSecs = Math.floor((diffMs % 60000) / 1000);
        
        if (diffMins > 0) {
            lastSavedSpan.textContent = `${diffMins}m ${diffSecs}s ago`;
        } else {
            lastSavedSpan.textContent = `${diffSecs}s ago`;
        }
    } else {
        lastSavedSpan.textContent = 'Never';
    }
}

// Setup autocomplete for inputs
function setupAutocomplete() {
    setupInputAutocomplete('formSection', 'sectionSuggestions', CONFIG.sections);
    setupInputAutocomplete('formProduct', 'productSuggestions', CONFIG.products);
    setupInputAutocomplete('formSKU', 'skuSuggestions', CONFIG.skus || []);
    setupInputAutocomplete('formWorkUnit', 'workUnitSuggestions', CONFIG.workUnits || []);
}

// Setup autocomplete for a specific input
function setupInputAutocomplete(inputId, suggestionsId, dataList) {
    const input = document.getElementById(inputId);
    const suggestionsContainer = document.getElementById(suggestionsId);
    
    if (!input || !suggestionsContainer || !dataList) return;
    
    let currentFocus = -1;
    
    input.addEventListener('input', function(e) {
        const value = this.value.toLowerCase();
        suggestionsContainer.innerHTML = '';
        
        if (!value) {
            suggestionsContainer.classList.remove('active');
            return;
        }
        
        // Filter suggestions
        const matches = dataList.filter(item => 
            item.toLowerCase().includes(value)
        );
        
        if (matches.length === 0) {
            suggestionsContainer.classList.remove('active');
            return;
        }
        
        // Create suggestion items
        matches.forEach((item, index) => {
            const div = document.createElement('div');
            div.className = 'suggestion-item';
            
            // Highlight matching part
            const matchIndex = item.toLowerCase().indexOf(value);
            if (matchIndex !== -1) {
                const before = item.substring(0, matchIndex);
                const match = item.substring(matchIndex, matchIndex + value.length);
                const after = item.substring(matchIndex + value.length);
                div.innerHTML = before + '<span class="match-highlight">' + match + '</span>' + after;
            } else {
                div.textContent = item;
            }
            
            div.dataset.value = item;
            div.dataset.index = index;
            
            div.addEventListener('click', function() {
                input.value = this.dataset.value;
                suggestionsContainer.classList.remove('active');
                // Trigger input event to hide suggestions
                input.dispatchEvent(new Event('input'));
            });
            
            suggestionsContainer.appendChild(div);
        });
        
        suggestionsContainer.classList.add('active');
        currentFocus = -1;
    });
    
    // Keyboard navigation for suggestions
    input.addEventListener('keydown', function(e) {
        const items = suggestionsContainer.querySelectorAll('.suggestion-item');
        
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            currentFocus++;
            if (currentFocus >= items.length) currentFocus = 0;
            highlightItem(items, currentFocus);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            currentFocus--;
            if (currentFocus < 0) currentFocus = items.length - 1;
            highlightItem(items, currentFocus);
        } else if (e.key === 'Enter') {
            if (currentFocus >= 0 && currentFocus < items.length) {
                e.preventDefault();
                const selectedItem = items[currentFocus];
                if (selectedItem) {
                    input.value = selectedItem.dataset.value;
                    suggestionsContainer.classList.remove('active');
                    input.dispatchEvent(new Event('input'));
                }
            }
        } else if (e.key === 'Escape') {
            suggestionsContainer.classList.remove('active');
        }
    });
    
    // Close suggestions on blur
    input.addEventListener('blur', function() {
        setTimeout(() => {
            suggestionsContainer.classList.remove('active');
        }, 200);
    });
}

// Highlight suggestion item
function highlightItem(items, index) {
    items.forEach((item, i) => {
        if (i === index) {
            item.classList.add('highlighted');
            item.scrollIntoView({ block: 'nearest' });
        } else {
            item.classList.remove('highlighted');
        }
    });
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
    
    // Focus on first field
    setTimeout(() => {
        document.getElementById('formSection').focus();
    }, 200);
}

// Close form modal
function closeFormModal() {
    const modal = document.getElementById('formModal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
    editingRowId = null;
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

// Stop timer
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
    
    // Clear pause timer if any
    if (pausedTimers[rowId]) {
        clearInterval(pausedTimers[rowId]);
        delete pausedTimers[rowId];
    }
    
    // Update display
    const endDisplay = document.getElementById(`endTimeDisplay-${rowId}`);
    if (endDisplay) endDisplay.textContent = timeStr;
    
    // Update button states
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
    
    // Update paused time display
    const pausedDisplay = document.getElementById(`pausedDisplay-${rowId}`);
    if (pausedDisplay) {
        pausedDisplay.textContent = formatPausedTime(row.pausedTime || 0);
    }
    
    saveData();
}

// Toggle pause
function togglePause(rowId) {
    const row = rows.find(r => r.id === rowId);
    if (!row || row.isStopped) return;
    
    const rowElement = document.getElementById(`row-${rowId}`);
    if (!rowElement) return;
    
    const pauseBtn = rowElement.querySelector('.btn-table.btn-pause, .btn-table.btn-resume');
    
    if (row.isPaused) {
        // Resume
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
        // Pause
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
        // Clear pause timer
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
    if (confirm('Clear all history and notes?')) {
        // Clear all timers
        Object.keys(pausedTimers).forEach(key => {
            clearInterval(pausedTimers[key]);
            delete pausedTimers[key];
        });
        
        rows = [];
        rowCounter = 0;
        document.getElementById('tableBody').innerHTML = '';
        
        // Clear notes as well
        notes = '';
        notesLastSaved = null;
        
        saveData();
    }
}

// Export CSV
function exportCSV() {
    let csvContent = '';
    
    // Add notes as a separate sheet (section)
    if (notes && notes.trim()) {
        csvContent += '=== NOTES ===\n';
        csvContent += `"${notes.replace(/"/g, '""')}"\n\n`;
    }
    
    // Add journal data
    if (rows.length === 0 && !notes.trim()) {
        alert('No data to export');
        return;
    }
    
    if (rows.length > 0) {
        if (csvContent) {
            csvContent += '=== JOURNAL DATA ===\n';
        }
        
        const headers = ['No.', 'Section', 'Product', 'SKU', 'Process', 'Oprt', 'MTE', 'Work Unit', 'Start Time', 'End Time', 'Paused Time', 'Remarks'];
        csvContent += headers.join(',') + '\n';
        
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
            csvContent += rowData.join(',') + '\n';
        });
    }
    
    // Create download
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
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
            rowCounter: rowCounter,
            notes: notes,
            notesLastSaved: notesLastSaved ? notesLastSaved.toISOString() : null
        };
        localStorage.setItem('journalData', JSON.stringify(dataToSave));
    } catch (e) {
        console.error('Error saving data:', e);
    }
}

// Load data from localStorage
function loadData() {
    try {
        const savedData = localStorage.getItem('journalData');
        if (savedData) {
            const parsed = JSON.parse(savedData);
            rows = parsed.rows || [];
            rowCounter = parsed.rowCounter || 0;
            notes = parsed.notes || '';
            notesLastSaved = parsed.notesLastSaved ? new Date(parsed.notesLastSaved) : null;
            
            // Render all rows
            const tbody = document.getElementById('tableBody');
            tbody.innerHTML = '';
            rows.forEach(row => {
                renderRow(row);
                // Restart pause timers if needed
                if (row.isPaused && !row.isStopped) {
                    startPauseTimer(row.id);
                }
            });
            
            // Update notes last saved display if modal is open
            updateLastSavedInfo();
        }
    } catch (e) {
        console.error('Error loading data:', e);
        rows = [];
        rowCounter = 0;
        notes = '';
        notesLastSaved = null;
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
});

// Handle visibility change to keep timers accurate
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        saveData();
    } else {
        rows.forEach(row => {
            if (row.isPaused && !row.isStopped && row.pauseStartTime) {
                startPauseTimer(row.id);
            }
        });
    }
});
