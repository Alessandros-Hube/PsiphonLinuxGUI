const { ipcRenderer, shell } = require('electron');
const { createBrowserList, appConfigPath, userConfigPath } = require('../../util');

const fs = require('fs');

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


function initGeneral() {
    document.getElementById("browserScrips").checked = localStorage.getItem("browserScrips") == "true" ? true : false;
    document.getElementById("country").checked = localStorage.getItem("country") == "true" ? true : false;
}

initGeneral();


// Initial call to add EventListener
addEventListener();

// Add event listeners to each checkbox for status checking
function addEventListener() {
    ["browserScrips", "country"].forEach(key => {
        document.getElementById(key).addEventListener('click', () => {
            localStorage.setItem(key, document.getElementById(key).checked);
        });
    });
}

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

    try {
        const fileContent = fs.readFileSync(userConfigPath, 'utf-8');
        const browserConfig = JSON.parse(fileContent);

        const browserMap = new Map(
            browserConfig.map(browser => [browser.name, browser])
        );

        const newConfig = order
            .filter(name => browserMap.has(name))
            .map(name => browserMap.get(name));

        if (newConfig.length !== browserConfig.length) {
            console.warn('Config length mismatch after reordering');
        }

        fs.writeFileSync(userConfigPath, JSON.stringify(newConfig, null, 2), 'utf-8');
        console.log('Browser config reordered and saved');

        ipcRenderer.send('browser-list-updated');
        document.querySelector('.save-btn').disabled = true;
    } catch (e) {
        console.error('Failed to save browser order:', e);
    }
}
document.querySelector('.save-btn').addEventListener('click', saveBrowserList);

// Function to reset the browser list
function resetBrowserList() {
    const browserList = document.querySelector('.setting-browser-list');
    try {
        const defaultConfig = fs.readFileSync(appConfigPath, 'utf-8');
        const browserConfig = JSON.parse(defaultConfig);

        browserList.innerHTML = createBrowserListItem(browserConfig);

        fs.writeFileSync(userConfigPath, JSON.stringify(browserConfig, null, 2), 'utf-8');

        ipcRenderer.send('browser-list-updated');
        document.querySelector('.save-btn').disabled = true;
    } catch (e) {
        browserList.innerHTML = "An error occurred while loading the browser configuration.<br><br>" + e.message;
    }
}
document.querySelector('.reset-btn').addEventListener('click', resetBrowserList);

// Function to remove browser entry
document.querySelector('.setting-browser-list').addEventListener('click', (e) => {
    const removeBtn = e.target.closest('.remove-btn');
    if (!removeBtn) return;

    const item = removeBtn.closest('.browser-item');
    if (!item) return;

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

    try {
        const fileContent = fs.readFileSync(userConfigPath, 'utf-8');
        const browserConfig = JSON.parse(fileContent);

        browserConfig.push(entry)
        fs.writeFileSync(userConfigPath, JSON.stringify(browserConfig, null, 2), 'utf-8');

        createBrowserList(document.querySelector('.setting-browser-list'), createBrowserListItem);

        ipcRenderer.send('browser-list-updated');

        modal.classList.add('hidden');
    } catch (e) {
        console.log("Failed to create a new entry: " + e.message);
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
