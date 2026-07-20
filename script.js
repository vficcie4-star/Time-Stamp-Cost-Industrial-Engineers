// State Management
let entries = [];
let entryCounter = 0;
let pauseTimers = {};

// DOM Elements
const currentTimeElement = document.getElementById('currentTime');
const currentDateElement = document.getElementById('currentDate');
const tableBody = document.getElementById('tableBody');
const addTimeBtn = document.getElementById('addTime');
const clearHistoryBtn = document.getElementById('clearHistory');
const exportCSVBtn = document.getElementById('exportCSV');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadFromLocalStorage();
    updateClock();
    setInterval(updateClock, 1000);
    renderEntries();
});

// Update Clock
function updateClock() {
    const now = new Date();
    currentTimeElement.textContent = now.toTimeString().slice(0, 8);
    
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 
                    'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const day = String(now.getDate()).padStart(2, '0');
    const month = months[now.getMonth()];
    const year = now.getFullYear();
    currentDateElement.textContent = `${day}-${month}-${year}`;
}

// Get Current Time String
function getCurrentTimeString() {
    const now = new Date();
    return now.toTimeString().slice(0, 8);
}

// Add New Entry
function addEntry() {
    const startTime = getCurrentTimeString();
    const entry = {
        id: Date.now(),
        number: ++entryCounter,
        startTime: startTime,
        endTime: '--:--:--',
        pausedTime: '00:00:00',
        isPaused: false,
        isStopped: false,
        pauseStartTime: null,
        totalPauseSeconds: 0
    };
    
    entries.push(entry);
    saveToLocalStorage();
    renderEntries();
}

// Stop Entry
function stopEntry(id) {
    const entry = entries.find(e => e.id === id);
    if (!entry || entry.isStopped) return;
    
    entry.endTime = getCurrentTimeString();
    entry.isStopped = true;
    
    // Stop pause timer if active
    if (entry.isPaused) {
        pauseEntry(id);
    }
    
    saveToLocalStorage();
    renderEntries();
}

// Pause/Resume Entry
function togglePause(id) {
    const entry = entries.find(e => e.id === id);
    if (!entry || entry.isStopped) return;
    
    if (entry.isPaused) {
        // Resume
        entry.isPaused = false;
        if (entry.pauseStartTime) {
            const pauseDuration = (Date.now() - entry.pauseStartTime) / 1000;
            entry.totalPauseSeconds += pauseDuration;
            entry.pauseStartTime = null;
        }
        clearInterval(pauseTimers[id]);
        delete pauseTimers[id];
    } else {
        // Pause
        entry.isPaused = true;
        entry.pauseStartTime = Date.now();
        
        // Start pause timer
        pauseTimers[id] = setInterval(() => {
            updatePauseDisplay(id);
        }, 1000);
    }
    
    saveToLocalStorage();
    renderEntries();
}

// Update Pause Display
function updatePauseDisplay(id) {
    const entry = entries.find(e => e.id === id);
    if (!entry || !entry.isPaused) return;
    
    const pauseDuration = (Date.now() - entry.pauseStartTime) / 1000;
    const totalSeconds = Math.floor(entry.totalPauseSeconds + pauseDuration);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    const pausedTimeElement = document.querySelector(`[data-paused-id="${id}"]`);
    if (pausedTimeElement) {
        pausedTimeElement.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
}

// Delete Entry
function deleteEntry(id) {
    if (!confirm('Delete this entry?')) return;
    
    entries = entries.filter(e => e.id !== id);
    if (pauseTimers[id]) {
        clearInterval(pauseTimers[id]);
        delete pauseTimers[id];
    }
    saveToLocalStorage();
    renderEntries();
}

// Clear All History
function clearHistory() {
    if (entries.length === 0) return;
    if (!confirm('Clear all history?')) return;
    
    entries = [];
    entryCounter = 0;
    Object.keys(pauseTimers).forEach(id => {
        clearInterval(pauseTimers[id]);
        delete pauseTimers[id];
    });
    saveToLocalStorage();
    renderEntries();
}

// Render Entries
function renderEntries() {
    if (entries.length === 0) {
        tableBody.innerHTML = `
            <div class="empty-state">
                <span class="empty-state-icon">⏱️</span>
                No entries yet<br>
                Click "Add Time" to start
            </div>
        `;
        return;
    }
    
    let html = '';
    entries.forEach((entry, index) => {
        // Calculate paused time for display
        let displayPaused = entry.pausedTime;
        let pauseText = entry.pausedTime;
        
        if (entry.isPaused && entry.pauseStartTime) {
            const pauseDuration = (Date.now() - entry.pauseStartTime) / 1000;
            const totalSeconds = Math.floor(entry.totalPauseSeconds + pauseDuration);
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;
            pauseText = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        } else {
            const totalSeconds = Math.floor(entry.totalPauseSeconds);
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;
            pauseText = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }
        
        const isStopped = entry.isStopped;
        const isPaused = entry.isPaused;
        
        // End time column content
        let endTimeContent;
        if (isStopped) {
            endTimeContent = `<div class="time-display">${entry.endTime}</div>`;
        } else {
            const pauseButtonText = isPaused ? 'Resume' : 'Pause';
            const pauseButtonClass = isPaused ? 'btn-resume' : 'btn-pause';
            endTimeContent = `
                <div class="time-display">--:--:--</div>
                <div class="button-group">
                    <button class="row-btn btn-stop" onclick="window.stopEntry(${entry.id})">Stop</button>
                    <button class="row-btn ${pauseButtonClass}" onclick="window.togglePause(${entry.id})">${pauseButtonText}</button>
                </div>
            `;
        }
        
        html += `
            <div class="entry-row" data-id="${entry.id}">
                <div class="col col-no">${entry.number}</div>
                <div class="col col-start">${entry.startTime}</div>
                <div class="col col-end">
                    ${endTimeContent}
                </div>
                <div class="col col-paused">
                    <span data-paused-id="${entry.id}">${pauseText}</span>
                    <button class="row-btn btn-delete" onclick="window.deleteEntry(${entry.id})">✕</button>
                </div>
            </div>
        `;
    });
    
    tableBody.innerHTML = html;
}

// Export to CSV
function exportCSV() {
    if (entries.length === 0) {
        alert('No data to export!');
        return;
    }
    
    // Calculate final paused times
    const exportData = entries.map(entry => {
        let pausedTime = entry.pausedTime;
        if (entry.isPaused && entry.pauseStartTime) {
            const pauseDuration = (Date.now() - entry.pauseStartTime) / 1000;
            const totalSeconds = Math.floor(entry.totalPauseSeconds + pauseDuration);
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;
            pausedTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        } else {
            const totalSeconds = Math.floor(entry.totalPauseSeconds);
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;
            pausedTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }
        
        return {
            'No.': entry.number,
            'Start Time': entry.startTime,
            'End Time': entry.isStopped ? entry.endTime : 'In Progress',
            'Paused Time': pausedTime
        };
    });
    
    // Create CSV
    const headers = ['No.', 'Start Time', 'End Time', 'Paused Time'];
    const csvRows = [];
    csvRows.push(headers.join(','));
    
    exportData.forEach(row => {
        const values = headers.map(header => {
            const value = row[header] || '';
            return `"${value}"`;
        });
        csvRows.push(values.join(','));
    });
    
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `stopwatch_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// Local Storage
function saveToLocalStorage() {
    try {
        const data = {
            entries: entries,
            counter: entryCounter
        };
        localStorage.setItem('stopwatchData', JSON.stringify(data));
    } catch (e) {
        console.error('Save error:', e);
    }
}

function loadFromLocalStorage() {
    try {
        const data = JSON.parse(localStorage.getItem('stopwatchData'));
        if (data) {
            entries = data.entries || [];
            entryCounter = data.counter || 0;
            
            // Restore pause timers if any
            entries.forEach(entry => {
                if (entry.isPaused && !entry.isStopped) {
                    entry.pauseStartTime = Date.now();
                    pauseTimers[entry.id] = setInterval(() => {
                        updatePauseDisplay(entry.id);
                    }, 1000);
                }
                // Ensure totalPauseSeconds exists
                if (typeof entry.totalPauseSeconds === 'undefined') {
                    entry.totalPauseSeconds = 0;
                }
            });
        }
    } catch (e) {
        console.error('Load error:', e);
        entries = [];
        entryCounter = 0;
    }
}

// Expose functions to global scope
window.addEntry = addEntry;
window.stopEntry = stopEntry;
window.togglePause = togglePause;
window.deleteEntry = deleteEntry;
window.clearHistory = clearHistory;
window.exportCSV = exportCSV;

// Event Listeners
addTimeBtn.addEventListener('click', addEntry);
clearHistoryBtn.addEventListener('click', clearHistory);
exportCSVBtn.addEventListener('click', exportCSV);