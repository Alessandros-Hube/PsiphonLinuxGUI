const { ipcRenderer } = require('electron');
const {
    checkBackendUpdate,
    createBrowserList,
    getAppVersion,
    getDefaultBrowserConfig,
    getConfig,
    getConfigPath,
    getGUIUpdateInfo,
    updateBackend,
    writeFileSafe
} = require('../../util');

const modal = document.getElementById('new-browser-modal');
const iconInput = document.getElementById('icon');

// Function to change the theme when the user selects an option
function changeTheme() {
    const theme = document.getElementById('themeSelector').selectedIndex;
    document.body.classList.remove("light", "dark", "auto");
    document.body.classList.add((theme == 1 ? "light" : (theme == 2 ? "dark" : "auto")));
    localStorage.setItem("theme", theme);
    ipcRenderer.send('theme-updated');
}

// Add a click event listener to the dropdown to trigger theme change
document.getElementById('themeSelector').addEventListener('click', changeTheme);

// Function to set the theme based on a saved value
function setTheme(theme) {
    document.body.classList.remove("light", "dark", "auto");
    document.body.classList.add((theme == 1 ? "light" : (theme == 2 ? "dark" : "auto")));
    document.getElementById('themeSelector').selectedIndex = theme;
}

// Load the saved theme from localStorage
const savedTheme = localStorage.getItem("theme");
setTheme(savedTheme);

// Function to initialize the general settings checkboxes
function initGeneral() {
    document.getElementById("browserScrips").checked = localStorage.getItem("browserScrips") == "true" ? true : false;
    document.getElementById("country").checked = localStorage.getItem("country") == "true" ? true : false;
    document.getElementById("info").checked = localStorage.getItem("info") == "true" ? true : false;
}
initGeneral();

// Add event listeners to each checkbox for status checking
function addEventListener() {
    ["browserScrips", "country", "info"].forEach(key => {
        document.getElementById(key).addEventListener('click', () => {
            localStorage.setItem(key, document.getElementById(key).checked);
            if (key === "country" && !document.getElementById(key).checked) {
                localStorage.removeItem("latestCountry");
            }
            if (key === "browserScrips" && !document.getElementById(key).checked) {
                const browserConfig = getConfig("browser.config");
                browserConfig.forEach(browser => {
                    localStorage.removeItem(browser.name);
                });
            }
            if (key === "info") {
                if (!document.getElementById(key).checked) {
                    localStorage.setItem("info", false);
                } else {
                    localStorage.setItem("info", true);
                }
                ipcRenderer.send('info-text-change');
            }
        });
    });
}
addEventListener();

// Drag & drop function 
document.addEventListener('DOMContentLoaded', () => {
    const list = document.querySelector('.setting-browser-list');

    if (!list) return;

    new Sortable(list, {
        animation: 150,
        handle: '.drag-handle',
        ghostClass: 'drag-ghost',
        onEnd: () => { document.querySelector('.save-btn').disabled = false; }
    });
});

// Create the browser-item HTML containers for the browserListSetting
function createBrowserListItem(browserConfig) {
    return browserConfig.map(browser => {
        let iconHTML = browser.icon.localPath ?
            `<span><img class="localPath" src="${browser.icon.localPath}" alt="${browser.name}"></span>` :
            `<span class="${browser.icon.css}"></span>`;

        return `
            <div class="browser-item">
                <span class="drag-handle"><i class="fas fa-grip-lines"></i></span>
                ${iconHTML}
                <div class="toggle-text">${browser.name}</div>
                <button class="remove-btn"><span class="fa-solid fa-x"></span></button>
            </div>`;
    }).join('');
}

createBrowserList(document.querySelector('.setting-browser-list'), createBrowserListItem);

// Function to save the new browser list
function saveBrowserList() {
    const order = [...document.querySelectorAll('.setting-browser-list .browser-item')]
        .map(
            item => item.querySelector('.toggle-text').innerText.replace(':', '')
        );

    const browserConfig = getConfig("browser.config");

    if (browserConfig) {
        browserConfig.forEach(browser => {
            if (localStorage.getItem("browserScrips") == "true") {
                localStorage.removeItem(browser.name);
            }
        });

        const browserMap = new Map(
            browserConfig.map(browser => [browser.name, browser])
        );

        const newConfig = order
            .filter(name => browserMap.has(name))
            .map(name => browserMap.get(name));

        if (newConfig.length !== browserConfig.length) {
            console.warn('Config length mismatch after reordering');
        }

        writeFileSafe(getConfigPath('browser.config'), JSON.stringify(newConfig, null, 2), 'utf-8');
        console.log('Browser config reordered and saved');

        ipcRenderer.send('browser-list-updated');
        document.querySelector('.save-btn').disabled = true;
    }
}
document.querySelector('.save-btn').addEventListener('click', saveBrowserList);

// Function to reset the browser list
function resetBrowserList() {
    const browserList = document.querySelector('.setting-browser-list');

    const browserConfig = getDefaultBrowserConfig();
    if (browserConfig) {
        browserConfig.forEach(browser => {
            if (localStorage.getItem("browserScrips") == "true") {
                localStorage.removeItem(browser.name);
            }
        });

        browserList.innerHTML = createBrowserListItem(browserConfig);

        writeFileSafe(getConfigPath('browser.config'), JSON.stringify(browserConfig, null, 2), 'utf-8');

        ipcRenderer.send('browser-list-updated');
        document.querySelector('.save-btn').disabled = true;
    }
}
document.querySelector('.reset-btn').addEventListener('click', resetBrowserList);

// Function to remove browser entry
document.querySelector('.setting-browser-list').addEventListener('click', (e) => {
    const removeBtn = e.target.closest('.remove-btn');
    if (!removeBtn) return;

    const item = removeBtn.closest('.browser-item');
    if (!item) return;

    if (localStorage.getItem("browserScrips") == "true") {
        localStorage.removeItem(item.querySelector('.toggle-text').innerText);
    }

    item.remove();

    document.querySelector('.save-btn').disabled = false;
});

// Open the dialog to create a new browser entry
document.querySelector('.new-btn').addEventListener('click', () => {
    modal.classList.remove('hidden');
});

// Close the dialog to create a new browser entry
document.querySelector('.cancel-btn').addEventListener('click', () => {
    modal.classList.add('hidden');
});

// Function to change ui on radio selection
function changeOnRadioButton(iconType) {
    const preview = document.getElementById('icon-preview');

    if (iconType === 'css') {
        iconInput.placeholder = "fab fa-firefox";
        preview.className = iconInput.value;
        preview.innerHTML = '';
    } else {
        iconInput.placeholder = "/home/user/icons/firefox.png";
        preview.className = '';
        preview.innerHTML = iconInput.value ? `<img class="localPath" src="${iconInput.value}" />` : '';
    }
    document.getElementById('icon-preview-placeholder').style.display = iconInput.value ? 'none' : 'block';
}

document.querySelectorAll('input[name="iconType"]').forEach(radio => {
    radio.addEventListener('change', () => {
        const iconType = radio.value;
        iconInput.value = '';
        changeOnRadioButton(iconType);
    });
});

document.getElementById('icon').addEventListener('input', () => {
    const iconType = document.querySelector('input[name="iconType"]:checked').value;
    changeOnRadioButton(iconType);
});

// Create a new browser entry
function createNewBrowserEntry() {
    const iconType = document.querySelector('input[name="iconType"]:checked').value;
    const entry = {
        name: document.getElementById('browser-name').value,
        icon: {
            css: iconType === 'css' ? iconInput.value : null,
            localPath: iconType === 'local' ? iconInput.value : null
        },
        scriptLocation: 'externalScript',
        startScript: document.getElementById('start-script').value,
        stopScript: document.getElementById('stop-script').value
    };

    const browserConfig = getConfig("browser.config");

    if (browserConfig) {
        browserConfig.push(entry)
        writeFileSafe(getConfigPath('browser.config'), JSON.stringify(browserConfig, null, 2), 'utf-8');

        createBrowserList(document.querySelector('.setting-browser-list'), createBrowserListItem);

        ipcRenderer.send('browser-list-updated');

        modal.classList.add('hidden');
    }
}
modal.querySelector('.create-btn').addEventListener('click', createNewBrowserEntry);

// Function to check is whether the input field filled
function isFilled(input) {
    return input && input.value.trim().length > 0;
}

//  Function to validate create form
function validateCreateForm() {
    const nameValid = isFilled(document.getElementById('browser-name'));
    const startValid = isFilled(document.getElementById('start-script'));
    const stopValid = isFilled(document.getElementById('stop-script'));
    const iconValid = isFilled(document.getElementById('icon'));

    document.querySelector('.create-btn').disabled = !(nameValid && startValid && stopValid && iconValid);
}
modal.querySelectorAll('input').forEach(input => {
    input.addEventListener('input', validateCreateForm);
});

// Disable settings if not in STOPPED state
if (localStorage.getItem("currentStateIndex") != 0) {
    document.getElementById("hint1").style.display = 'block';
    document.querySelector(".settings-actions").style = 'margin-top: 10px';
    document.querySelector(".setting-browser-list").style.height = "450px";
    document.querySelector(".new-btn").disabled = true;
    document.querySelector(".reset-btn").disabled = true;
    document.querySelector(".save-btn").disabled = true;
    document.querySelectorAll(".remove-btn").forEach(btn => btn.disabled = true);
    document.querySelectorAll(".drag-handle").forEach(handle => handle.style.display = "none");
}

// Function to set status badge
function setBadge(id, state) {
    const el = document.getElementById(id);
    if (!el) return;
    el.className = 'status-badge';
    const map = {
        checking: { cls: '', text: 'checking…' },
        'up-to-date': { cls: 'up-to-date', text: '✓ up to date' },
        'update-available': { cls: 'update-available', text: '↑ update available' },
        error: { cls: 'error', text: 'error' },
    };
    const s = map[state] || map.checking;
    if (s.cls) el.classList.add(s.cls);
    el.textContent = s.text;
}

// Function to format date
function formatDate(isoString) {
    if (!isoString) return '–';
    try {
        return new Date(isoString).toLocaleDateString(undefined, {
            year: 'numeric', month: 'short', day: 'numeric'
        });
    } catch { return isoString; }
}

// Function to check if a new version of the app is available on GitHub
async function checkForUpdateGUI() {
    setBadge('gui-status-badge', 'checking');

    try {
        const appVersion = await getAppVersion();
        document.getElementById('gui-current').textContent = appVersion ? `v${appVersion}` : '–';

        const result = await getGUIUpdateInfo();
        if (!result) throw new Error('no result');

        document.getElementById('gui-latest').textContent = result.latestVersion ? `v${result.latestVersion}` : '–';

        if (result.hasUpdate) {
            if (localStorage.getItem("currentStateIndex") != 0) {
                document.getElementById("hint2").style.display = 'block';
            }
            setBadge('gui-status-badge', 'update-available');
            document.getElementById('gui-update-btn').disabled = localStorage.getItem("currentStateIndex") != 0;
            document.getElementById('gui-update-info').textContent = 'A new version is available on GitHub.';
        } else {
            setBadge('gui-status-badge', 'up-to-date');
            document.getElementById('gui-update-info').textContent = 'You are on the latest version.';
        }
    } catch (err) {
        setBadge('gui-status-badge', 'error');
        document.getElementById('gui-latest').textContent = 'unavailable';
        document.getElementById('gui-update-info').textContent = 'Could not check for updates.';
        console.error('[About] GUI version check failed:', err);
    }
}
checkForUpdateGUI();

// Function to check if a new version of the backend binary is available on GitHub
async function checkForUpdateBackend() {
    setBadge('backend-status-badge', 'checking');

    try {
        // Lokal gespeicherte Version anzeigen
        const local = getConfig('backendVersion.config');
        if (!local) throw new Error('no result');

        if (local.sha) {
            document.getElementById("backend-current").innerHTML = `Commit: ${local.sha}<br> (${formatDate(local.date)})`;
        } else {
            document.getElementById('backend-current').textContent = 'unknown';
        }

        // Remote prüfen
        const result = await checkBackendUpdate();
        if (!result) throw new Error('no result');

        document.getElementById("backend-latest").innerHTML = `Commit: ${result.latestVersion.sha}<br> (${formatDate(result.latestVersion.date)})`;

        if (result.hasUpdate) {
            if (localStorage.getItem("currentStateIndex") != 0) {
                document.getElementById("hint2").style.display = 'block';
            }
            setBadge('backend-status-badge', 'update-available');
            document.getElementById('backend-update-btn').disabled = localStorage.getItem("currentStateIndex") != 0;
            document.getElementById('backend-update-info').textContent = 'A newer backend binary is available.';
        } else {
            setBadge('backend-status-badge', 'up-to-date');
            document.getElementById('backend-update-info').textContent = 'Backend is up to date.';
        }
    } catch (err) {
        setBadge('backend-status-badge', 'error');
        document.getElementById('backend-latest').textContent = 'unavailable';
        document.getElementById('backend-update-info').textContent = 'Could not check for updates.';
        console.error('[About] Backend version check failed:', err);
    }
}
checkForUpdateBackend();

// Function to update backend 
document.getElementById('backend-update-btn').addEventListener('click', async () => {
    const btn = document.getElementById('backend-update-btn');
    const infoEl = document.getElementById('backend-update-info');
    const wrapEl = document.getElementById('backend-progress-wrap');
    const barEl = document.getElementById('backend-progress-bar');
    const labelEl = document.getElementById('backend-progress-label');

    btn.classList.add('loading');
    btn.disabled = true;
    wrapEl.style.display = 'flex';
    infoEl.textContent = '';
    infoEl.style.display = 'none';

    try {
        // Register a progress listener
        const handler = (pct) => {
            // progress: 0–100
            barEl.style.width = `${pct}%`;
            labelEl.textContent = pct < 100
                ? `Downloading… ${pct}%`
                : 'Applying update…';
        };

        await updateBackend(handler);

        barEl.style.width = '100%';
        labelEl.textContent = 'Done!';
        infoEl.style.display = 'block';
        infoEl.textContent = 'Backend updated successfully.';
        setBadge('backend-status-badge', 'up-to-date');

        const newVersion = getConfig("backendVersion.config");
        if (!newVersion) throw new Error('no result');
        document.getElementById("backend-current").innerHTML = `Commit: ${newVersion.sha}<br> (${formatDate(newVersion.date)})`;

        barEl.style.width = '0%';
        labelEl.textContent = '';
        wrapEl.style.display = 'none';
    } catch (err) {
        barEl.style.width = '0%';
        labelEl.textContent = '';
        wrapEl.style.display = 'none';
        infoEl.style.display = 'block';
        infoEl.textContent = `Update failed: ${err.message ?? 'unknown error'}`;
        btn.classList.remove('loading');
        btn.disabled = false;
        console.error('[About] Backend update failed:', err);
    }
});
