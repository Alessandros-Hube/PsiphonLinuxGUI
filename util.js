const fs = require('fs');
const path = require('path');
const os = require('os');

const appConfigPath = path.join(__dirname, 'configs', 'browser.config');
const appPsiphonConfigPath = path.join(__dirname, 'configs', 'psiphon.config');
const userConfigDir = path.join(os.homedir(), '.config', 'psiphonlinuxgui');
const userConfigPath = path.join(userConfigDir, 'browser.config');
const userPsiphonConfigPath = path.join(userConfigDir, 'psiphon.config');

// Create the user browser config
function ensureUserBrowserConfig() {
    // Create user config folder if it does not exist
    if (!fs.existsSync(userConfigDir)) {
        fs.mkdirSync(userConfigDir, { recursive: true });
    }

    // User config does not exist - copy from default
    if (!fs.existsSync(userConfigPath)) {
        const defaultConfig = fs.readFileSync(appConfigPath, 'utf-8');
        fs.writeFileSync(userConfigPath, defaultConfig, 'utf-8');
        console.log('User browser.config created from default');
    }

    return userConfigPath;
}

// Create the browser list
function createBrowserList(browserList, createBrowserListItem) {
    try {
        const configFile = ensureUserBrowserConfig();
        const fileContent = fs.readFileSync(configFile, 'utf-8');
        const browserConfig = JSON.parse(fileContent);

        browserList.innerHTML = createBrowserListItem(browserConfig);
    } catch (e) {
        browserList.innerHTML = "An error occurred while loading the browser configuration.<br><br>" + e.message;
    }
}

// Create the user psiphon config
function ensureUserPsiphonConfig() {
    // Create user config folder if it does not exist
    if (!fs.existsSync(userConfigDir)) {
        fs.mkdirSync(userConfigDir, { recursive: true });
    }

    // User config does not exist - copy from default
    if (!fs.existsSync(userPsiphonConfigPath)) {
        const defaultConfig = fs.readFileSync(appPsiphonConfigPath, 'utf-8');
        fs.writeFileSync(userPsiphonConfigPath, defaultConfig, 'utf-8');
        console.log('User psiphon.config created from default');
    }

    return userPsiphonConfigPath;
}

// Create the psiphon config
function createPsiphonConfig(country) {
    try {
        const configFile = ensureUserPsiphonConfig();
        const fileContent = fs.readFileSync(configFile, 'utf-8');
        const configJson = JSON.parse(fileContent);

        configJson.EgressRegion = country;

        const newConfig = JSON.stringify(configJson, null, 2);

        fs.writeFileSync(configFile, newConfig, 'utf-8');
    } catch (e) {
        // Display an alert in case of an error
        alert('Failed to save the file! Error: ' + e.message);
    }
}

module.exports = {
    createBrowserList,
    createPsiphonConfig,
    appConfigPath,
    userConfigPath,
};