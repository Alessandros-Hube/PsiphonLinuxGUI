const fs = require('fs');
const path = require('path');
const os = require('os');

const scriptPath = path.join(__dirname, '../scripts');

const assetsDir = path.join(__dirname, 'assets');
const iconsDir = path.join(assetsDir, 'icons');
const imagesDir = path.join(assetsDir, 'images');

const appConfigDir = path.join(__dirname, 'configs');
const userConfigDir = path.join(os.homedir(), '.config', 'psiphonlinuxgui');

// Function to get the default config
function getDefaultConfig(configFile) {
    let defaultConfig;
    switch (configFile) {
        case 'browser.config':
            defaultConfig = path.join(appConfigDir, 'browser.config');
            break;
        case 'psiphon.config':
            defaultConfig = path.join(appConfigDir, 'psiphon.config');
            break;
        default:
            throw `Error: There are not default config for ${configFile} definit.`;
    }
    return defaultConfig
}

// Function to read a file
function readFile(file) {
    return fs.readFileSync(file, 'utf-8');
}

// Function to write a file
function writeFile(file, data) {
    fs.writeFileSync(file, data, 'utf-8');
}

// Function to write a file safely
function writeFileSafe(file, data) {
    try {
        writeFile(file, data);
    } catch (e) {
        alert(
            'Failed to write file.\n\n' +
            'The file could not be saved.\n\n' +
            `Details: ${e.message || e}`
        );
    }
}

// Function to get the user config path file
function getConfigPath(configFile) {
    try {
        const userConfigFilePath = path.join(userConfigDir, configFile);
        // User config does not exist - copy from default
        if (!fs.existsSync(userConfigFilePath)) {
            const defaultConfigPath = getDefaultConfig(configFile);
            const defaultConfig = readFile(defaultConfigPath);
            writeFile(userConfigFilePath, defaultConfig);
        }

        return userConfigFilePath
    } catch (e) {
        alert(
            'Failed to load the configuration file.\n\n' +
            'Either no default configuration was defined for this config file, ' +
            'or the default configuration file could not be found.\n\n' +
            'The installation may be corrupted.\n\n' +
            `Details: ${e.message || e}`
        );
    }
}

// Function to get the user config as json
function getConfig(configFile) {
    // Create user config folder if it does not exist
    if (!fs.existsSync(userConfigDir)) {
        fs.mkdirSync(userConfigDir, { recursive: true });
    }
    try {
        const userConfigFilePath = getConfigPath(configFile);
        const fileContent = readFile(userConfigFilePath);

        return JSON.parse(fileContent);
    } catch (e) {
        alert(
            'Failed to read JSON file.\n\n' +
            `Details: ${e.message || e}`
        );
        return [];
    }
}

// Function to get the default browser config
function getDefaultBrowserConfig() {
    const defaultConfigPath = getDefaultConfig('browser.config');
    return JSON.parse(readFile(defaultConfigPath));
}

// Create the browser list
function createBrowserList(browserList, createBrowserListItem) {
    browserList.innerHTML = createBrowserListItem(getConfig('browser.config'));
}

// Create the psiphon config
function createPsiphonConfig(country) {
    try {
        const psiphonConfig = getConfig('psiphon.config');

        psiphonConfig.EgressRegion = country;

        const newPsiphonConfig = JSON.stringify(psiphonConfig, null, 2);

        writeFile(getConfigPath('psiphon.config'), newPsiphonConfig);
        return true;
    } catch (e) {
        // Display an alert in case of an error
        alert('Failed to save the file! Error: ' + e.message);
        return false;
    }
}

// Function to get start and stop script for changing browser settings
function getScript(name, scriptType) {
    try {
        const browserConfig = getConfig('browser.config')
        const browser = browserConfig.find(b => b.name === name);
        if (browser.scriptLocation == "interScript") {
            return `${scriptPath}/${browser[scriptType]}`;
        } else {
            return browser[scriptType];
        }
    } catch (e) {
        alert("An error occurred while loading the browser configuration. " + e.message);
    }
}

module.exports = {
    createBrowserList,
    createPsiphonConfig,
    getConfig,
    getDefaultBrowserConfig,
    getScript,
    getConfigPath,
    writeFileSafe,
    iconsDir,
    imagesDir,
};