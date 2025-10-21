// main.js

// Modules to control application life and create native browser window
const { app, BrowserWindow, shell } = require('electron')
const path = require('node:path')
const { exec, execSync, spawn } = require('child_process');
const { ipcMain } = require('electron');
const fs = require('fs');

const configPath = path.join(__dirname, 'configs');
const corePath = path.join(__dirname, 'psiphon-tunnel-core-x86_64');
const imagePath = path.join(__dirname, 'images');
const scriptPath = path.join(__dirname, 'scripts');

let restoreProxySettings = [];

const createWindow = () => {
    // Create the browser window.
    const mainWindow = new BrowserWindow({
        minWidth: 800,
        minHeight: 800,
        width: 1080,
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

// Function to get start and stop script for changing browser settings
function getScript(name, scriptType) {
    try {
        const fileContent = fs.readFileSync(`${configPath}/browser.config`, 'utf-8');
        const browserConfig = JSON.parse(fileContent);
        const browser = browserConfig.find(b => b.name === name);
        if (browser.scriptLocation == "interScript") {
            return `${scriptPath}/${browser[scriptType]}`;
        } else {
            return browser[scriptType];
        }
    } catch (e) {
        console.log("An error occurred while loading the browser configuration. " + e.message);
    }
}

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
ipcMain.on('start-vpn-proxy-server', (event) => {
    // Execute a command to start the psiphon-tunnel-core with a specific configuration
    const process = spawn(corePath, ['-config', `${configPath}/psiphon.config`]);

    console.log('Run psiphon-tunnel-core-x86_64 with this config configs/psiphon.config');

    process.stdout.on('data', (data) => {
        console.log(data.toString()); // Log any output from stdout
    });

    process.stderr.on('data', (data) => {
        console.log(data.toString()); // Log any warnings from stderr
    });

    process.on('close', (code) => {
        console.log(`Process to run psiphon-tunnel-core-x86_64 exited with code ${code}`); // Log exit code
    });

    process.once('error', (err) => {
        console.log(`Failed to run psiphon-tunnel-core-x86_64: ${err}`); // Log error if execution fails
        if (err.toString().includes("EACCES")) {
            event.reply('server-error', err);
            return;
        }
    });
});

// Listener for changing proxy settings
ipcMain.on('change-proxy-setting', (event, changeProxySettings) => {
    const notChangeProxySettings = changeProxySettings.filter(item => !restoreProxySettings.includes(item));

    // Iterate through the proxy settings and execute the corresponding script
    notChangeProxySettings.forEach(changeProxySetting => {
        let startScript = getScript(changeProxySetting, "startScript");

        const process = spawn("bash", [`${startScript}`]);

        let prefixOutPrinted = false;
        process.stdout.on('data', (data) => {
            if (!prefixOutPrinted) {
                console.log(`Executed ${startScript} successfully:`);
                prefixOutPrinted = true;
            }
            console.log(data.toString()); // Log any output from stdout
        });

        let prefixPrinted = false;
        process.stderr.on('data', (data) => {
            if (!prefixPrinted) {
                console.log(`Script ${startScript} produced stderr:`);
                prefixPrinted = true;
            }
            console.log(data.toString()); // Log any warnings from stderr
            if (data.toString().includes("is not installed")) {
                // Send a message back to the renderer process if a required dependency is missing
                event.reply('proxy-setting-error', `${changeProxySetting}`);
                return; // Exit the function if an error occurs
            }
        });

        process.on('close', (code) => {
            console.log(`Process to execute ${startScript} exited with code ${code}`); // Log exit code
        });

        process.on('error', (err) => {
            console.log(`Failed to execute ${startScript}: ${err}`); // Log error if execution fails
            if (err.toString().includes("is not installed")) {
                // Send a message back to the renderer process if a required dependency is missing
                event.reply('proxy-setting-error', `${changeProxySetting}`);
                return; // Exit the function if an error occurs
            }
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
    const process = spawn("pkill", ['-f', "psiphon-tunnel-core-x86_64"]);

    console.log('Process psiphon-tunnel-core-x86_64 killed');

    process.stdout.on('data', (data) => {
        console.log(data.toString()); // Log any output from stdout
    });

    process.stderr.on('data', (data) => {
        console.log(data.toString()); // Log any warnings from stderr
    });

    process.on('close', (code) => {
        console.log(`Process to kill psiphon-tunnel-core-x86_64 exited with code ${code}`); // Log exit code
    });

    process.on('error', (err) => {
        console.log(`Failed to kill psiphon-tunnel-core-x86_64: ${err}`); // Log error if execution fails
    });
});

// Listener for restoring individual proxy settings
ipcMain.on('restore-setting', (event, args) => {
    // Iterate over each proxy setting to be restored
    args.forEach(arg => {
        // Remove the setting from the restore list
        restoreProxySettings.splice(restoreProxySettings.indexOf(arg), 1);

        let stopScript = getScript(arg, "stopScript");

        // Execute a script to turn off the proxy setting
        const process = spawn("bash", [`${stopScript}`]);

        let prefixOutPrinted = false;
        process.stdout.on('data', (data) => {
            if (!prefixOutPrinted) {
                console.log(`Executed ${stopScript}:`);
                prefixOutPrinted = true;
            }
            console.log(data.toString()); // Log any output from stdout
        });

        let prefixPrinted = false;
        process.stderr.on('data', (data) => {
            if (!prefixPrinted) {
                console.log(`Script ${stopScript} produced stderr:`);
                prefixPrinted = true;
            }
            console.log(data.toString()); // Log any warnings from stderr
        });

        process.on('close', (code) => {
            console.log(`Process to execute ${stopScript} exited with code ${code}`); // Log exit code
        });

        process.on('error', (err) => {
            console.log(`Failed to execute ${stopScript}: ${err}`); // Log error if execution fails
        });
    });
});

// Listener for restoring all proxy settings
ipcMain.on('restore-settings', () => {
    // Iterate through all stored proxy settings
    restoreProxySettings.forEach(restoreProxySetting => {
        let stopScript = getScript(restoreProxySetting, "stopScript");

        // Execute a script to turn off each proxy setting
        const process = spawn("bash", [`${stopScript}`]);

        let prefixOutPrinted = false;
        process.stdout.on('data', (data) => {
            if (!prefixOutPrinted) {
                console.log(`Executed ${stopScript}:`);
                prefixOutPrinted = true;
            }
            console.log(data.toString()); // Log any output from stdout
        });

        let prefixPrinted = false;
        process.stderr.on('data', (data) => {
            if (!prefixPrinted) {
                console.log(`Script ${stopScript} produced stderr:`);
                prefixPrinted = true;
            }
            console.log(data.toString()); // Log any warnings from stderr
        });

        process.on('close', (code) => {
            console.log(`Process to execute ${stopScript} exited with code ${code}`); // Log exit code
        });

        process.on('error', (err) => {
            console.log(`Failed to execute ${stopScript}: ${err}`); // Log error if execution fails
        });
    });
    // Clear the restore list
    restoreProxySettings = [];
});

// Handler for an invoke the version number of the app
ipcMain.handle('get-version', async () => {
    return app.getVersion();
});
