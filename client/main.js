const { app, BrowserWindow } = require('electron')
const createWindow = () => {
    const win = new BrowserWindow({
      webPreferences: { webSecurity: false },
      width: 800,
      height: 600,
      webgl: true
    })
    win.webContents.openDevTools()
    win.loadFile('./index.html')
}

app.commandLine.appendSwitch('--no-sandbox');
app.commandLine.appendSwitch('ignore-gpu-blacklist')

app.whenReady().then(() => {
    createWindow()
})