// Modules to control application life and create native browser window
const { app, BrowserWindow, shell } = require('electron')
const path = require('node:path')
const { execSync, spawn } = require('child_process');
const { ipcMain } = require('electron');
const { getScript, iconsDir } = require('./util');

const appBackendDir = path.join(__dirname, 'backend');
const psiphonPath = path.join(appBackendDir, 'psiphon.sh');
const corePath = path.join(appBackendDir, 'psiphon-tunnel-core-x86_64');
const checkPort = path.join(appBackendDir, 'check-port.sh');
const proxyWatch = path.join(appBackendDir, 'proxy-watch.sh');

let restoreProxySettings = [];
let isPortFree = false;

let mainWindow = null;
let childWindow = null;

const createWindow = () => {
    // Create the browser window.
    mainWindow = new BrowserWindow({
        minWidth: 800,
        minHeight: 800,
        width: 1080,
        height: 800,
        icon: `${iconsDir}/psiphonlinuxgui.png`,
        autoHideMenuBar: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    })

    // and load the index.html of the app.
    mainWindow.loadFile('src/renderer/main/index.html')

    // Open the DevTools.
    // mainWindow.webContents.openDevTools()

    // Event handler for new windows
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });
}

function createSettingsWindow() {
    // Create the setting window.
    childWindow = new BrowserWindow({
        title: "Setting",
        width: 700,
        height: 600,

        minimizable: false,
        maximizable: false,
        resizable: false,

        autoHideMenuBar: true,
        parent: mainWindow,
        modal: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    // and load the settings.html of the app.
    childWindow.loadFile('src/renderer/settings/settings.html');

    // Open the DevTools.
    // childWindow.webContents.openDevTools();

    // Event handler for new windows
    childWindow.webContents.setWindowOpenHandler(({ url }) => {
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


// Function to run a process with given command and arguments
function runProcess({ command, args = [], label = '', onStdOut, onStdErr, onError, event }) {
    const process = spawn(command, args);

    let stdoutPrinted = false;
    let stderrPrinted = false;

    process.stdout.on('data', data => {
        if (!stdoutPrinted && label) {
            console.log(`Executed ${label}:`);
            stdoutPrinted = true;
        }

        const msg = data.toString();
        console.log(msg);

        if (onStdOut) onStdOut(msg, event);
    });

    process.stderr.on('data', data => {
        if (!stderrPrinted && label) {
            console.log(`stderr from ${label}:`);
            stderrPrinted = true;
        }

        const msg = data.toString();
        console.log(msg);

        if (onStdErr) onStdErr(msg, event);
    });

    process.on('close', code => {
        console.log(`Process ${label} exited with code ${code}`);
    });

    process.on('error', err => {
        console.log(`Failed to execute ${label}: ${err}`);
        if (onError) onError(err, event);
    });
}

// Function to execute start/stop scripts for changing proxy settings
function executeScripts(proxySettings, scriptType, event) {
    // Iterate through the proxy settings and execute the corresponding script
    proxySettings.forEach(proxySetting => {
        const script = getScript(proxySetting, scriptType);

        runProcess({
            command: 'bash',
            args: [script],
            label: script,
            event,
            onStdErr: (msg, event) => {
                if (event && msg.includes('is not installed')) {
                    event.reply('proxy-setting-error', proxySetting);
                }
            },
            onError: (err, event) => {
                if (event && err.toString().includes('is not installed')) {
                    event.reply('proxy-setting-error', proxySetting);
                }
            }
        });
    });
}

// Function to execute start/stop script for changing proxy settings
function executeStartStopScript(command, args, event) {
    runProcess({
        command,
        args,
        label: `${command} ${args[0]}`,
        event,
        onError: (err, event) => {
            if (event && err.toString().includes('EACCES')) {
                event.reply('server-error', err);
            }
        }
    });
}

// Function to execute the proxy watch script
function executeProxyWatchScript(event) {
    runProcess({
        command: 'bash',
        args: [proxyWatch],
        label: 'Proxy Watcher',
        event,
        onStdOut: (msg, event) => {
            if (event && msg.includes('HTTP:OK') && msg.includes('DEVICE:OK')) {
                // Send a message back to the renderer process if the process started
                event.reply('proxy-watch', "HTTP:OK");
            } else if (event && msg.includes('HTTP:DOWN') && msg.includes('DEVICE:OK')) {
                // Send a message back to the renderer process if the process stopped
                event.reply('proxy-watch', "HTTP:DOWN");
            } else if (event && msg.includes('DEVICE:DOWN')) {
                // Send a message back to the renderer process if the device network is down
                event.reply('proxy-watch', "DEVICE:DOWN");
            }
        }
    });
}

// Function to execute the check port script
function executeCheckPortScript(event) {
    runProcess({
        command: 'bash',
        args: [checkPort],
        label: 'Check Port',
        event,
        onStdOut: (msg, event) => {
            if (event && msg.toString().includes("to connect to proxy server is occupied")) {
                event.reply('port-error', msg);
            }
        }
    });
}

// Function to get IP info via curl
function fetchIPInfoViaCurl(event) {
    runProcess({
        command: 'bash',
        args: ['-c', 'curl -s --max-time 10 --proxy http://127.0.0.1:8081 http://ip-api.com/json/'],
        label: 'Fetch IP Info',
        event,
        onStdOut: (msg, event) => {
            try {
                const data = JSON.parse(msg.toString());
                if (data.status === 'success' && event) {
                    event.reply('ip-info-result', {
                        ip: data.query,
                        country: data.country,
                        countryCode: data.countryCode,
                        city: data.city
                    });
                } else {
                    if (event) event.reply('ip-info-result', {
                        ip: '---', country: '---', countryCode: null, city: '---'
                    });
                }
            } catch (e) {
                if (event) event.reply('ip-info-result', {
                    ip: '---', country: '---', countryCode: null, city: '---'
                });
            }
        },
        onStdErr: (msg, event) => {
            if (event) event.reply('ip-info-result', {
                ip: '---', country: '---', countryCode: null, city: '---'
            });
        },
        onError: (err, event) => {
            if (event) event.reply('ip-info-result', {
                ip: '---', country: '---', countryCode: null, city: '---'
            });
        }
    });
}

// Event listener for the process exit event
process.on('exit', () => {
    // Iterate through the list of proxy settings to restore
    restoreProxySettings.forEach(restoreProxySetting => {
        // Execute a command to kill the psiphon-tunnel-core process synchronously
        executeStartStopScript(psiphonPath, ['stop'], null);

        let stopScript = getScript(restoreProxySetting, "stopScript");

        // Execute a script to disable each proxy setting
        execSync(`bash ${stopScript}`, (error, stdout, stderr) => {
            if (error) {
                console.error(`Failed to execute ${stopScript}:`, error); // Log error on script failure
            }
            if (stderr) {
                console.log(`Script ${stopScript} produced stderr:`, stderr); // Log any warnings from stderr
            }
            console.log(`Executed ${stopScript}:`, stdout); // Log success message
        });
    });

    // Execute a command to kill the psiphon-tunnel-core process synchronously
    executeStartStopScript(psiphonPath, ['stop'], null);
});

// Listener for debug logging
ipcMain.on('debug', (_, args) => {
    // Log each debug argument to the console
    args.forEach(arg => {
        console.log(arg);
    });
});

// Listener for opening the settings page
ipcMain.on('open-settings-page', () => {
    createSettingsWindow();
});

// Listener for getting IP info 
ipcMain.on('fetch-ip-info', (event) => {
    fetchIPInfoViaCurl(event);
});

// Listener for starting the VPN/proxy server
ipcMain.on('start-vpn-proxy-server', (event) => {
    if (!isPortFree) {
        // Start the check port script to check the connection port
        executeCheckPortScript(event);
    }
    isPortFree = true;

    // Start the proxy watch script to monitor the connection status
    executeProxyWatchScript(event);

    // Execute a command to start the psiphon-tunnel-core with a specific configuration
    executeStartStopScript(psiphonPath, ['start', `${corePath}`], event);
});

// Listener for shutting down the VPN/proxy server
ipcMain.on('shutdown', () => {
    // Execute a command to kill the psiphon-tunnel-core process synchronously
    executeStartStopScript(psiphonPath, ['stop'], null);
});

// Listener for changing proxy settings
ipcMain.on('change-proxy-setting', (event, changeProxySettings) => {
    // Determine which proxy settings are new and need to be started
    let notChangeProxySettings = changeProxySettings.filter(item => !restoreProxySettings.includes(item));

    // Execute the start script for the new proxy settings
    executeScripts(notChangeProxySettings, "startScript", event);

    // Update the list of proxy settings that need to be restored
    restoreProxySettings = changeProxySettings;
});

// Listener for restoring individual proxy settings
ipcMain.on('restore-setting', (_, args) => {
    // Execute the stop script for the specified proxy settings
    executeScripts(args, "stopScript", null);

    // Update the restore list by removing the restored settings
    args.forEach(arg => {
        // Remove the setting from the restore list
        restoreProxySettings.splice(restoreProxySettings.indexOf(arg), 1);
    });
});

// Listener for restoring all proxy settings
ipcMain.on('restore-settings', (_) => {
    // Execute the stop script for all proxy settings in the restore list
    executeScripts(restoreProxySettings, "stopScript", null);

    // Clear the restore list
    restoreProxySettings = [];
});

// Listener to refresh the browser list 
ipcMain.on('browser-list-updated', () => {
    if (mainWindow) {
        mainWindow.webContents.send('refresh-browser-list');
    }
});

// Listener to refresh the browser list 
ipcMain.on('info-text-change', () => {
    if (mainWindow) {
        mainWindow.webContents.send('refresh-info-text');
    }
});

// Listener to refresh the theme 
ipcMain.on('theme-updated', () => {
    if (mainWindow) {
        mainWindow.webContents.send('refresh-theme');
    }
});

// Listener to set attention to the app window
ipcMain.on('set-attention', () => {
    if (!mainWindow) return;

    mainWindow.flashFrame(true);
});

// Handler for an invoke the version number of the app
ipcMain.handle('get-version', async () => {
    return app.getVersion();
});
