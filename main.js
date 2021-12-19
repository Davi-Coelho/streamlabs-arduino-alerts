const { app, BrowserWindow } = require('electron')
const env = process.env.NODE_ENV || 'development';
  
if (env === 'development') {
    try {
        require('electron-reloader')(module, {
            debug: true,
            watchRenderer: true
        });
    } catch (_) { console.log('Error'); }    
}

const createWindow = () => {
    const mainWindow = new BrowserWindow({
        width: 1400,
        height: 600,
        autoHideMenuBar: true
    })

    mainWindow.loadFile('index.html')
    mainWindow.webContents.openDevTools()
}

app.whenReady().then(() => {
    createWindow()

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow()
        }
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})