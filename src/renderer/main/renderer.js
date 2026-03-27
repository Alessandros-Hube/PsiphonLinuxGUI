// Import required modules from Electron and Node.js
const { ipcRenderer } = require('electron');
const { createBrowserList, createPsiphonConfig, getGUIUpdateInfo, initBackend, iconsDir, imagesDir } = require('../../util');

// Define the states the application can be in
const states = ['STOPPED', 'STARTING', 'STARTED'];

// Define an array of checkboxes with their properties
let checkboxes = [];

// Array to hold proxy settings changes
let changeProxySettings = [];

// Track the current state of the application and proxy changes
let currentStateIndex = 0;
let isProxySettingsChanging = false;
let isProxyServerRunning = false;
let isPortFree = true;
let proxyStartTimeout;

localStorage.setItem("currentStateIndex", currentStateIndex); // Save initial state to localStorage

// Function to move to the next state in the application
function nextState() {
    currentStateIndex = (currentStateIndex + 1) % states.length; // Cycle through states

    localStorage.setItem("currentStateIndex", currentStateIndex);// Save current state to localStorage

    switch (currentStateIndex) {
        case 0: // STOPPED state
            ipcRenderer.send('shutdown'); // Notify main process to stop
            ipcRenderer.send('restore-settings'); // Restore original settings
            isProxySettingsChanging = false; // Reset flag
            clearTimeout(proxyStartTimeout); // Clear any existing timeouts
            showProxyWarningText(false);
            updateSidebarInfo("---", "---", null, "---");
            break;
        case 1: // STARTING state
            const country = document.getElementById('customSelect').getAttribute("data-value"); // Get selected country
            if (localStorage.getItem("country") == "true") {
                localStorage.setItem("latestCountry", country);
            }

            // Create config based on the selected country and inti the backend
            const isBackendInit = initBackend();
            if (createPsiphonConfig(country) && isBackendInit) {
                isPortFree = true;
                updateSidebarInfo("Loading...", "Loading...", null, "Loading...");
                ipcRenderer.send('start-vpn-proxy-server'); // Start the VPN/proxy server

                isProxySettingsChanging = true;

                proxyStartTimeout = setTimeout(() => {
                    if (!isProxyServerRunning) {
                        showProxyWarning();
                    }
                }, 10000);
            } else {
                currentStateIndex = -1;
                nextState();
            }
            break;
        case 2: // STARTED state
            if (!isProxySettingsChanging) {
                ipcRenderer.send('change-proxy-setting', changeProxySettings); // Apply new proxy settings
                isProxySettingsChanging = true; // Set flag
            }
            if (localStorage.getItem("info") == "true") {
                fetchIPInfo();
                showProxyWarningText(changeProxySettings.length == 0);
            }
            if (!isProxyServerRunning) {
                nextState();
            }
            break;
        default:
            break;
    }
    updateStateDisplay(); // Update UI at the end
    updateButton(); // Update button label
    updateIcon(); // Update icon
    hideProxyWarning(); // Hide any proxy warnings
}

// Listener for handling proxy setting errors
ipcRenderer.on('proxy-setting-error', (event, changeProxySetting) => {
    changeProxySettings.splice(changeProxySettings.indexOf(changeProxySetting), 1); // Remove the failed setting
    if (currentStateIndex == 2) ipcRenderer.send('restore-setting', [changeProxySetting]); // Restore settings if in STARTED state
    // Update the checkbox status in the UI
    const htmlCheckboxes = document.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        if (checkbox.name == changeProxySetting) {
            checkbox.checked = false;
            htmlCheckboxes.forEach(htmlcheckbox => {
                if (htmlcheckbox.id == checkbox.id) {
                    htmlcheckbox.checked = false;
                }
            });
        }
    });

    alert(`${changeProxySetting} is not installed`);
    if (localStorage.getItem("info") == "true") {
        showProxyWarningText(changeProxySettings.length == 0);
    }
});

// Listener for handling server errors
ipcRenderer.on('server-error', (event, err) => {
    nextState();
    alert(`Failed to execute psiphon-tunnel-core-x86_64. The file is not executable. ${err.toString()}`);
});

// Listener for handling proxy watch responses
ipcRenderer.on('proxy-watch', (event, response) => {
    const res = response.toString();
    if (res === "HTTP:OK" && !isProxyServerRunning) {
        clearTimeout(proxyStartTimeout);
        isProxyServerRunning = true;
        isProxySettingsChanging = false;
        nextState();
    } else if (res != "HTTP:OK" && isProxyServerRunning && currentStateIndex != 0 && isPortFree) {
        isProxyServerRunning = false;
        currentStateIndex = 0;
        nextState();
    }
    document.getElementById('proxyWarning').innerHTML = res === "HTTP:DOWN" ? "The server from the selected country is currently unavailable." : "The device network is down. Please check your internet connection.";
});

// Listener for handling port errors
ipcRenderer.on('port-error', (event, err) => {
    isPortFree = false;
    nextState();
    alert(`${err.toString()}`);
});

// Function to show the proxy warning
function showProxyWarning() {
    const warning = document.getElementById("proxyWarning");
    if (warning) {
        warning.classList.remove("hidden");
        ipcRenderer.send('set-attention'); // Notify main process to set attention
    }
}

// Function to hide the proxy warning
function hideProxyWarning() {
    const warning = document.getElementById("proxyWarning");
    if (warning) {
        warning.classList.add("hidden");
    }
}


if (localStorage.getItem("country") == "true") {
    document.querySelectorAll('#customOptions div').forEach((option) => {
        var value = option.getAttribute('data-value');
        var icon = option.querySelector('i, .fi').className;
        var text = option.textContent.trim();
        if (localStorage.getItem("latestCountry") == value) {
            document.getElementById('customSelect').innerHTML = '<span class="' + icon + '"></span> ' + text + ' <button id="toggleButton"><i class="fa-solid fa-caret-down"></i></button>';
            document.getElementById('customSelect').setAttribute('data-value', value);
        }
    });
}

// Function to change the country setting and reset the state if needed
function changeCountry() {
    if (currentStateIndex == 1 || currentStateIndex == 2) {
        currentStateIndex = 0; // Reset state to STOPPED
        ipcRenderer.send('shutdown'); // Notify main process to stop
        updateIcon(); // Update icon
        nextState(); // Proceed to next state
    }
}

// Function to update the display of the current state in the UI
function updateStateDisplay() {
    const currentStateElement = document.getElementById('currentState');
    currentStateElement.textContent = states[currentStateIndex]; // Display current state text
    currentStateElement.style.color = (states[currentStateIndex] == "STARTED" ? "#229b40" : (states[currentStateIndex] == "STARTING" ? "#e9a442" : "#902232"));

    const currentStateIconElement = document.getElementById('currentStateIcon');
    const currentStateIcon = `${imagesDir}/` + states[currentStateIndex] + (states[currentStateIndex] == "STARTING" ? ".gif" : ".png");
    currentStateIconElement.setAttribute("src", currentStateIcon); // Set corresponding icon
}

// Function to update the button text based on current state
function updateButton() {
    const currentStateElement = document.getElementById('Button');
    if (currentStateIndex == 0) {
        currentStateElement.textContent = "CONNECT"; // Set button text for STOPPED state
        document.getElementById('nextStateButton').style.backgroundColor = "#229b40";
    } else if (currentStateIndex == 1) {
        currentStateElement.textContent = "STOP"; // Set button text for STARTING state
        document.getElementById('nextStateButton').style.backgroundColor = "#902232";
    } else if (currentStateIndex == 2) {
        currentStateElement.textContent = "DISCONNECT"; // Set button text for STARTED state
        document.getElementById('nextStateButton').style.backgroundColor = "#902232";
    }
}

// Function to update the icon
function updateIcon() {
    if (currentStateIndex != 2) {
        document.getElementById('icon').setAttribute("src", `${iconsDir}/psiphonlinuxgui-off.png`);
    } else if (currentStateIndex == 2) {
        document.getElementById('icon').setAttribute("src", `${iconsDir}/psiphonlinuxgui.png`);
    }
}

// Function to open the setting page
function openSettingsPage() {
    ipcRenderer.send('open-settings-page')
}

// Event listener for the button to switch states
document.getElementById('nextStateButton').addEventListener('click', nextState);

// Event listener for changing country options
document.getElementById('customOptions').addEventListener('click', changeCountry);

// Event listener for the button to open the setting page
document.getElementById('settingsBtn').addEventListener('click', openSettingsPage);

// Initial UI update
updateStateDisplay();
updateButton();
updateIcon();

// Function to get the status of a checkbox by its ID
function getCheckboxStatus(id) {
    return document.getElementById(id).checked; // Return the checked state of the checkbox
}

// Function to update the proxy settings array based on checkbox changes
function updateProxySettings(name, checked) {
    const proxySetting = `${name}`;

    if (checked) {
        changeProxySettings.push(proxySetting); // Add the setting if checked
    }

    if (isProxySettingsChanging) {
        isProxySettingsChanging = false; // Reset the flag if changing settings
    }
}

// Function to check the status of all checkboxes and update settings
function checkCheckboxStatus() {
    checkboxes.forEach(checkbox => {
        let newChecked = getCheckboxStatus(checkbox.id);

        if (localStorage.getItem("browserScrips") == "true") {
            localStorage.setItem(checkbox.name, newChecked);
        }

        if (!newChecked && checkbox.checked) {
            // Remove unchecked proxy setting if previously checked
            changeProxySettings.splice(changeProxySettings.indexOf(checkbox.name), 1);
            if (currentStateIndex == 2) ipcRenderer.send('restore-setting', [checkbox.name]); // Restore settings if in STARTED state
            checkbox.checked = newChecked;
        } else if (newChecked !== checkbox.checked) {
            // Update the checked state and settings
            checkbox.checked = newChecked;
            updateProxySettings(checkbox.name, newChecked);
        }
    });

    if (currentStateIndex === 2) {
        currentStateIndex = 1; // Switch state if needed
        nextState();
    }
}

// Listener for handling refresh theme
ipcRenderer.on('refresh-theme', () => {
    const savedTheme = localStorage.getItem("theme");
    setTheme(savedTheme);
});

// Function to set the theme based on a saved value
function setTheme(theme) {
    document.body.classList.remove("light", "dark", "auto");
    document.body.classList.add((theme == 1 ? "light" : (theme == 2 ? "dark" : "auto")));
}

// Load the saved theme from localStorage
const savedTheme = localStorage.getItem("theme");
setTheme(savedTheme);

// Initial call to create browserList
createBrowserList(document.getElementById('browserList'), createBrowserListItem);

// Listener for handling refresh browser list
ipcRenderer.on('refresh-browser-list', () => {
    checkboxes.forEach(checkbox => {
        document.getElementById(checkbox.id).removeEventListener('click', checkCheckboxStatus);
    });
    changeProxySettings = [];
    checkboxes = [];
    createBrowserList(document.getElementById('browserList'), createBrowserListItem);
    addEventListener();
});

// Listener for handling refresh info text
ipcRenderer.on('refresh-info-text', () => {
    changeInfoText();
});

// Function to change info text
function changeInfoText() {
    if (localStorage.getItem("info") == "true") {
        document.getElementById('ip-info').style = "display:block";
        document.getElementById('info-text').style = "display:none";
        if (currentStateIndex == 2) {
            fetchIPInfo();
            showProxyWarningText(changeProxySettings.length == 0);
        }
    } else {
        document.getElementById('ip-info').style = "display:none";
        document.getElementById('info-text').style = "display:block";
        showProxyWarningText(false);
    }
}
changeInfoText();

// Create the browserToggles HTML containers for the browserList
function createBrowserListItem(browserConfig) {
    return browserConfig.map((browser, id) => {
        let iconHTML =
            browser.icon.localPath ?
                `<span><img class="localPath" src="${browser.icon.localPath}" alt="${browser.name}"></span>` :
                `<span class="${browser.icon.css}"></span>`;

        id += 1;
        checkboxes.push({ id: `${id}`, name: browser.name, checked: false });

        return `
            <div class="toggle-container">
              ${iconHTML}
              <div class="toggle-text">${browser.name}:</div>
              <label class="switch">
                <input type="checkbox" id="${id}">
                <span class="slider"></span>
              </label>
            </div>`;
    }).join('');
}

// Initial call to add EventListener
addEventListener();

// Add event listeners to each checkbox for status checking
function addEventListener() {
    checkboxes.forEach(checkbox => {
        if (localStorage.getItem("browserScrips") == "true") {
            document.getElementById(checkbox.id).checked = localStorage.getItem(checkbox.name) == "true" ? true : false;
        }
        document.getElementById(checkbox.id).addEventListener('click', checkCheckboxStatus);
    });
}

// Initial call to set up checkbox status
checkCheckboxStatus();

// Run update check on startup
checkForUpdate();

// Function to check if a new version of the app is available on GitHub
async function checkForUpdate() {
    const result = await getGUIUpdateInfo();
    if (!result && result.hasUpdate) {
        notifyBtn.style.display = "inline";
        bannerText.textContent = `Version ${result.latestVersion} of PsiphonLinuxGUI is available!`;
    } else {
        notifyBtn.style.display = "none";
    }
}

// Listener for handling ip info
ipcRenderer.on('ip-info-result', (event, { ip, country, countryCode, city }) => {
    updateSidebarInfo(ip, country, countryCode, city);
});

// Function to get IP info
function fetchIPInfo() {
    ipcRenderer.send('fetch-ip-info');
}

// Set IP & Country in the sidebar
function updateSidebarInfo(ip, country, countryCode, city) {
    document.getElementById('current-ip').textContent = ip || '---';
    document.getElementById('current-country').textContent = country || '---';
    document.getElementById('current-city').textContent = city || '---';

    const flagIcon = document.getElementById('flag-icon');

    if (countryCode) {
        flagIcon.className = `fi fi-${countryCode.toLowerCase()}`;
        flagIcon.style.display = 'inline-block';
    } else {
        flagIcon.className = '';
        flagIcon.style.display = 'none';
    }
}

// Display a warning box if NO app proxy setting is active
function showProxyWarningText(show) {
    document.getElementById('proxy-warning-box').style.display = show ? 'block' : 'none';
}

// Modal open
document.getElementById('btn-show-manual-instructions').addEventListener('click', () => {
    document.getElementById('manual-proxy-modal').style.display = 'flex';
});

// Modal close
document.getElementById('btn-close-modal').addEventListener('click', () => {
    document.getElementById('manual-proxy-modal').style.display = 'none';
});

// Optional: Clicking the overlay closes the modal
document.getElementById('manual-proxy-modal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
        e.currentTarget.style.display = 'none';
    }
});
