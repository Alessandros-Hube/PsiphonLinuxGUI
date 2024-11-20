// Import required modules from Electron and Node.js
const { ipcRenderer } = require('electron');
const fs = require('fs');
const http = require('http');
const net = require('net');

const path = require('path');
const configPath = path.join(__dirname, 'configs');

// Define the states the application can be in
const states = ['STOPPED', 'STARTING', 'STARTED'];

// Define an array of checkboxes with their properties
let checkboxes = [
    { id: 'firefox-checkbox', name: 'firefox', checked: false },
    { id: 'chrome-checkbox', name: 'chrome', checked: false },
    { id: 'opera-checkbox', name: 'opera', checked: false },
    { id: 'brave-checkbox', name: 'brave', checked: false },
    { id: 'edge-checkbox', name: 'edge', checked: false }
];

// Array to hold proxy settings changes
let changeProxySettings = [];

// Track the current state of the application and proxy changes
let currentStateIndex = 0;
let isProxySettingsChanging = false;

// Function to move to the next state in the application
function nextState() {
    currentStateIndex = (currentStateIndex + 1) % states.length; // Cycle through states
    updateStateDisplay(); // Update UI with the current state

    switch (currentStateIndex) {
        case 0: // STOPPED state
            ipcRenderer.send('shutdown'); // Notify main process to stop
            ipcRenderer.send('restore-settings'); // Restore original settings
            isProxySettingsChanging = false; // Reset flag
            updateButton(); // Update button label
            break;
        case 1: // STARTING state
            updateStateDisplay(); // Ensure UI reflects state change
            const country = document.getElementById('customSelect').getAttribute("data-value"); // Get selected country
            createConfig(country); // Create config based on the selected country
            ipcRenderer.send('start-vpn-proxy-server'); // Start the VPN/proxy server

            // Check if the HTTP and SOCKS proxies are available
            if (checkProxyAvailable('http', 'localhost', 8081)
                .then((isAvailable) => {
                    console.log(`HTTP proxy server is ${isAvailable ? 'available' : 'not available'}.`);
                })
                .catch((err) => {
                    console.error('Error checking HTTP proxy server:', err);
                }) && checkProxyAvailable('socks', 'localhost', 1081)
                    .then((isAvailable) => {
                        console.log(`SOCKS proxy server is ${isAvailable ? 'available' : 'not available'}.`);
                    })
                    .catch((err) => {
                        console.error('Error checking SOCKS proxy server:', err);
                    })) {
                setTimeout(() => {
                    nextState(); // Proceed to next state after delay if conditions are met
                }, 1000);
            } else {
                currentStateIndex = -1; // Reset to initial state on failure
                nextState();
            }
            break;
        case 2: // STARTED state
            if (!isProxySettingsChanging) {
                ipcRenderer.send('change-proxy-setting', changeProxySettings); // Apply new proxy settings
                isProxySettingsChanging = true; // Set flag
            }
            updateButton(); // Update button label
            break;
        default:
            break;
    }
    updateStateDisplay(); // Update UI at the end
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
});

// Function to change the country setting and reset the state if needed
function changeCountry() {
    if (currentStateIndex == 2) {
        currentStateIndex = 0; // Reset state to STOPPED
        ipcRenderer.send('shutdown'); // Notify main process to stop
        nextState(); // Proceed to next state
    }
}

// Function to check if a proxy is available
function checkProxyAvailable(proxyType, proxyHost, proxyPort, retryInterval = 1000, maxAttempts = 5) {
    return new Promise((resolve, reject) => {
        let attempts = 0;

        const tryConnect = () => {
            attempts++;

            if (proxyType === 'http') {
                const options = {
                    host: proxyHost,
                    port: proxyPort,
                    method: 'CONNECT',
                    path: 'www.example.com:80', // Standard HTTP path for connection testing
                };

                const req = http.request(options);

                req.on('connect', (res, socket, head) => {
                    resolve(true); // Connection successful
                    socket.destroy(); // Close the socket
                });

                req.on('error', (err) => {
                    if (attempts < maxAttempts) {
                        setTimeout(tryConnect, retryInterval); // Retry connection
                    } else {
                        resolve(false); // Failed after max attempts
                    }
                });

                req.on('timeout', () => {
                    req.abort(); // Abort the request on timeout
                    if (attempts < maxAttempts) {
                        setTimeout(tryConnect, retryInterval);
                    } else {
                        resolve(false); // Failed after max attempts
                    }
                });

                req.setTimeout(retryInterval); // Set timeout for request
                req.end(); // End the request

            } else if (proxyType === 'socks') {
                const client = new net.Socket();

                client.connect(proxyPort, proxyHost, () => {
                    resolve(true); // Connection successful
                    client.destroy(); // Close the client
                });

                client.on('error', (err) => {
                    if (attempts < maxAttempts) {
                        setTimeout(tryConnect, retryInterval); // Retry connection
                    } else {
                        resolve(false); // Failed after max attempts
                    }
                });

                client.on('timeout', () => {
                    client.destroy(); // Close the client on timeout
                    if (attempts < maxAttempts) {
                        setTimeout(tryConnect, retryInterval);
                    } else {
                        resolve(false); // Failed after max attempts
                    }
                });

                client.setTimeout(retryInterval); // Set timeout for client
            } else {
                reject(new Error('Invalid proxy type. Use "http" or "socks".'));
            }
        };

        tryConnect(); // Initiate connection attempt
    });
}

// Function to update the display of the current state in the UI
function updateStateDisplay() {
    const currentStateElement = document.getElementById('currentState');
    currentStateElement.textContent = states[currentStateIndex]; // Display current state text

    const currentStateIconElement = document.getElementById('currentStateIcon');
    const currentStateIcon = "./images/" + states[currentStateIndex] + (states[currentStateIndex] == "STARTING" ? ".gif" : ".png");
    currentStateIconElement.setAttribute("src", currentStateIcon); // Set corresponding icon
}

// Function to update the button text based on current state
function updateButton() {
    const currentStateElement = document.getElementById('Button');
    if (currentStateIndex == 0) {
        currentStateElement.textContent = "CONNECT"; // Set button text for STOPPED state
    } else if (currentStateIndex == 2) {
        currentStateElement.textContent = "DISCONNECT"; // Set button text for STARTED state
    }
}

// Event listener for the button to switch states
document.getElementById('nextStateButton').addEventListener('click', nextState);

// Event listener for changing country options
document.getElementById('customOptions').addEventListener('click', changeCountry);

// Initial UI update
updateStateDisplay();
updateButton();

// Function to create a config file based on a selected country
function createConfig(country) {
    try {
        // Read the base config file
        let baseConfig = fs.readFileSync(`${configPath}/base.config`, 'utf-8');
        // Parse the content as JSON
        let configJson = JSON.parse(baseConfig);
        // Modify the EgressRegion property
        configJson.EgressRegion = country;
        // Convert JSON back to formatted string
        let newConfig = JSON.stringify(configJson, null, 2);
        // Write the new config to a file
        fs.writeFileSync(`${configPath}/psiphon.config`, newConfig, 'utf-8');
    } catch (e) {
        // Display an alert in case of an error
        alert('Failed to save the file! Error: ' + e.message);
    }
}

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

// Add event listeners to each checkbox for status checking
document.getElementById('firefox-checkbox').addEventListener('click', checkCheckboxStatus);
document.getElementById('chrome-checkbox').addEventListener('click', checkCheckboxStatus);
document.getElementById('opera-checkbox').addEventListener('click', checkCheckboxStatus);
document.getElementById('brave-checkbox').addEventListener('click', checkCheckboxStatus);
document.getElementById('edge-checkbox').addEventListener('click', checkCheckboxStatus);

// Initial call to set up checkbox status
checkCheckboxStatus();
