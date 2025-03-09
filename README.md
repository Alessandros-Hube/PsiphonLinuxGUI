# PsiphonLinuxGUI

**PsiphonLinuxGUI** is an unofficial frontend application for managing the Psiphon VPN on Linux. It uses the latest [psiphon-tunnel-core-binaries](https://github.com/Psiphon-Labs/psiphon-tunnel-core-binaries/tree/master/linux) as its backend. This application enables users to seamlessly start and stop the Psiphon proxy server and configure browser proxy settings.

## Features

- **Simple Connection Management:** Start and stop the Psiphon tunnel with a single button.
- **Proxy Configuration:** Easily manage proxy settings for supported browsers.
- **Dynamic Country Selection:** Choose from various countries to optimize your connection performance.

## Installation

### Option 1: Install via npm

1. **Clone the Repository**:
```
git clone https://github.com/Alessandros-Hube/PsiphonLinuxGUI.git
cd PsiphonLinuxGUI
```

2. **Grant executable permission:**
```
sudo chmod +x psiphon-tunnel-core-x86_64 
```

3. **Install dependencies:**
```
npm install
```

4. **Run the application:**
```
npm start
```

### Option 2: Install using the `.deb` Package

1. **Download the latest `.deb` package from the [Releases](https://github.com/Alessandros-Hube/PsiphonLinuxGUI/releases) page on GitHub.**

2. Install the package:
```
sudo dpkg -i psiphonlinuxgui_1.0.1_amd64.deb
```
3. **Launch the application:** Locate Psiphon Linux GUI in your applications menu, or start it via the terminal:
```
psiphonlinuxgui
```

### Option 3: Install using the `.rpm` Package

1. **Download the latest `.rpm` package from the [Releases](https://github.com/Alessandros-Hube/PsiphonLinuxGUI/releases) page on GitHub.**

2. Install the package:
```
sudo dnf install psiphonlinuxgui-1.0.1.x86_64.rpm
```
3. **Launch the application:** Locate Psiphon Linux GUI in your applications menu, or start it via the terminal:
```
psiphonlinuxgui
```

### Option 4: Install using the AUR (Arch User Repository)

1. Install the package:
```
yay -S psiphonlinuxgui
```

2. **Launch the application:** Launch the application: Locate Psiphon Linux GUI in your applications menu, or start it via the terminal:
```
psiphonlinuxgui
```

## Usage
1. **Launch the Application:** Open PsiphonLinuxGUI from your applications menu or terminal.
2. **Connect to Psiphon:** Click the **CONNECT** button to start the Psiphon tunnel.
3. **Manage proxy settings:** Use the checkboxes to configure proxy settings for supported browsers.
4. **Change connection region:** Select a country from the dropdown menu to enhance your connection.

## Notes
- The application restarts the selected browser when connecting or disconnecting from the proxy server.
- You can verify your IP change by visiting [WhatIsMyIPAddress](https://whatismyipaddress.com) or [BrowserLeaks](https://browserleaks.com/ip).

## Configuration
Configuration files are stored in the `configs` directory. Customize the base settings in `base.config` as required. The application generates a `psiphon.config` file based on your selected region.

## License

This project is licensed under the MIT License. See the [LICENSE](https://github.com/Alessandros-Hube/PsiphonLinuxGUI/blob/main/LICENSE) file for details.