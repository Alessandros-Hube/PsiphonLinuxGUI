const fs = require('fs');
const path = require('path');
const os = require('os');

const appConfigPath = path.join(__dirname, 'configs', 'browser.config');
const userConfigDir = path.join(os.homedir(), '.config', 'PsiphonLinuxGUI');
const userConfigPath = path.join(userConfigDir, 'browser.config');

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

module.exports = {
    createBrowserList,
    appConfigPath,
    userConfigPath,
};