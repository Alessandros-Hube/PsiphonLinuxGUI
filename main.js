// main.js

// Modules to control application life and create native browser window
const { app, BrowserWindow, shell } = require('electron')
const path = require('node:path')
const { exec, execSync } = require('child_process');
const { ipcMain } = require('electron');

const configPath = path.join(__dirname, 'configs');
const corePath = path.join(__dirname, 'psiphon-tunnel-core-x86_64');
const imagePath = path.join(__dirname, 'images');
const scriptPath = path.join(__dirname, 'scripts');

let restoreProxySettings = [];

const createWindow = () => {
    // Create the browser window.
    const mainWindow = new BrowserWindow({
        width: 1000,
        height: 800,
        icon: `${imagePath}/psiphonlinuxgui.png`,
        autoHideMenuBar: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: true,
            contextIsolation: false
        }
    })

    // and load the index.html of the app.
    mainWindow.loadFile('index.html')

    // Open the DevTools.
    // mainWindow.webContents.openDevTools()

    // Event-Handler für neue Fenster
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
    createWindow()

    app.on('activate', () => {
        // On macOS it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
    // Execute configuration commands
    if (process.platform !== 'darwin') app.quit()
})

// Event listener for the process exit event
process.on('exit', () => {
    // Iterate through the list of proxy settings to restore
    restoreProxySettings.forEach(restoreProxySetting => {
        // Execute a command to kill the psiphon-tunnel-core process
        exec('pkill -f psiphon-tunnel-core-x86_64', (error, stdout, stderr) => {
            if (error) {
                console.log('Failed to kill process:', error); // Log error if the process fails to terminate
            }
            if (stderr) {
                console.log(stderr); // Log any warnings from stderr
            }
            console.log('Process psiphon-tunnel-core-x86_64 killed:', stdout); // Log success message
        });
        // Execute a script to disable each proxy setting
        execSync(`bash ${scriptPath}/proxy-${restoreProxySetting}-off.sh`, (error, stdout, stderr) => {
            if (error) {
                console.error(`Failed to execute proxy-${restoreProxySetting}-off.sh:`, error); // Log error on script failure
            }
            if (stderr) {
                console.log(`Script proxy-${restoreProxySetting}-off.sh produced stderr:`, stderr); // Log any warnings from stderr
            }
            console.log(`Executed proxy-${restoreProxySetting}-off.sh:`, stdout); // Log success message
        });
    });

    // Execute a command to kill the psiphon-tunnel-core process
    exec('pkill -f psiphon-tunnel-core-x86_64', (error, stdout, stderr) => {
        if (error) {
            console.log('Failed to kill process:', error); // Log error if the process fails to terminate
        }
        if (stderr) {
            console.log(stderr); // Log any warnings from stderr
        }
        console.log('Process psiphon-tunnel-core-x86_64 killed:', stdout); // Log success message
    });
});

// Listener for starting the VPN/proxy server
ipcMain.on('start-vpn-proxy-server', () => {
    // Execute a command to start the psiphon-tunnel-core with a specific configuration
    exec(`${corePath} -config ${configPath}/psiphon.config`, (error, stdout, stderr) => {
        if (error) {
            console.log('Failed to run psiphon-tunnel-core-x86_64:', error); // Log error if execution fails
        }
        if (stderr) {
            console.log(stderr); // Log any warnings from stderr
        }
        console.log('Run psiphon-tunnel-core-x86_64 with this config configs/psiphon.config'); // Log success message
    });
});

// Listener for changing proxy settings
ipcMain.on('change-proxy-setting', (event, changeProxySettings) => {
    const notChangeProxySettings = changeProxySettings.filter(item => !restoreProxySettings.includes(item));

    // Iterate through the proxy settings and execute the corresponding script
    notChangeProxySettings.forEach(changeProxySetting => {
        exec(`bash ${scriptPath}/proxy-${changeProxySetting}-on.sh`, (error, stdout, stderr) => {
            if (error) {
                console.error(`Failed to execute proxy-${changeProxySetting}-on.sh:`, error); // Log error on failure
                if (error.message.includes("is not installed")) {
                    // Send a message back to the renderer process if a required dependency is missing
                    event.reply('proxy-setting-error', `${changeProxySetting}`);
                    return; // Exit the function if an error occurs
                }
            }
            if (stderr) {
                console.log(`Script proxy-${changeProxySetting}-on.sh produced stderr:`, stderr); // Log any warnings from stderr
            }
            console.log(`Executed proxy-${changeProxySetting}-on.sh successfully:`, stdout); // Log success message
        });
    });
    // Update the list of proxy settings that need to be restored
    restoreProxySettings = changeProxySettings;
});

// Listener for debug logging
ipcMain.on('debug', (event, args) => {
    // Log each debug argument to the console
    args.forEach(arg => {
        console.log(arg);
    });
});

// Listener for shutting down the VPN/proxy server
ipcMain.on('shutdown', () => {
    // Execute a command to kill the psiphon-tunnel-core process synchronously
    try {
        execSync('pkill -f psiphon-tunnel-core-x86_64');
        console.log('Process psiphon-tunnel-core-x86_64 killed');// Log success message
    } catch (error) {
        console.log('Failed to kill process:', error);// Log error if the process fails to terminate
    }
});

// Listener for restoring individual proxy settings
ipcMain.on('restore-setting', (event, args) => {
    // Iterate over each proxy setting to be restored
    args.forEach(arg => {
        // Remove the setting from the restore list
        restoreProxySettings.splice(restoreProxySettings.indexOf(arg), 1);

        // Execute a script to turn off the proxy setting
        exec(`bash ${scriptPath}/proxy-${arg}-off.sh`, (error, stdout, stderr) => {
            if (error) {
                console.error(`Failed to execute proxy-${arg}-off.sh:`, error); // Log error on failure
            }
            if (stderr) {
                console.log(`Script proxy-${arg}-off.sh produced stderr:`, stderr); // Log any warnings from stderr
            }
            console.log(`Executed proxy-${arg}-off.sh:`, stdout); // Log success message
        });
    });
});

// Listener for restoring all proxy settings
ipcMain.on('restore-settings', () => {
    // Iterate through all stored proxy settings
    restoreProxySettings.forEach(restoreProxySetting => {
        // Execute a script to turn off each proxy setting
        exec(`bash ${scriptPath}/proxy-${restoreProxySetting}-off.sh`, (error, stdout, stderr) => {
            if (error) {
                console.error(`Failed to execute proxy-${restoreProxySetting}-off.sh:`, error); // Log error on failure
            }
            if (stderr) {
                console.log(`Script proxy-${restoreProxySetting}-off.sh produced stderr:`, stderr); // Log any warnings from stderr
            }
            console.log(`Executed proxy-${restoreProxySetting}-off.sh:`, stdout); // Log success message
        });
    });
    // Clear the restore list
    restoreProxySettings = [];
});
