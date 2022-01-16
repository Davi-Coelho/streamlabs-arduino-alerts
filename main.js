const { app, BrowserWindow, Menu, ipcMain } = require('electron')
const Store = require('electron-store')
const path = require('path')
const env = process.env.NODE_ENV || 'development';

const store = new Store()

const defaultCommands = [
    {commandName: 'Follow', commandType: '0'},
    {commandName: 'Subscription', commandType: '0'},
    {commandName: 'Resub', commandType: '0'},
    {commandName: 'Host/Raid', commandType: '0'},
    {commandName: 'Bits', commandType: '0'},
    {commandName: 'Donation', commandType: '0'}
]

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
        width: 1300,
        height: 500,
        autoHideMenuBar: true,
        resizable: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    })

    mainWindow.setMenu(new Menu())

    mainWindow.webContents.session.on('select-serial-port', (event, portList, webContents, callback) => {

        event.preventDefault()
        if (portList && portList.length > 0) {
            callback(portList[0].portId)
        } else {
            callback('')
        }
    })

    mainWindow.webContents.session.on('serial-port-added', (event, port) => {
        console.log('serial-port-added FIRED WITH', port)
    })

    mainWindow.webContents.session.on('serial-port-removed', (event, port) => {
        console.log('serial-port-removed FIRED WITH', port)
    })

    mainWindow.webContents.session.setPermissionCheckHandler((webContents, permission, requestingOrigin, details) => {

        if (permission === 'serial' && details.securityOrigin === 'file:///') {
            return true
        }
    })

    mainWindow.webContents.session.setDevicePermissionHandler((details) => {
        
        if (details.deviceType === 'serial' && details.origin === 'file://') {
            return true
        }
    })

    mainWindow.loadFile('index.html')
    mainWindow.webContents.openDevTools()
}

const createCommands = () => {

    const commands = store.get('commands')

    if (!commands) {
        store.set('commands', defaultCommands)
    }
}

app.whenReady().then(() => {

    createWindow()
    createCommands()

    ipcMain.handle('store-save-token', (event, socketToken) => {

        store.set('socketToken', socketToken)
        return
    })

    ipcMain.handle('store-load-token', async (event) => {
        return store.get('socketToken')
    })

    ipcMain.handle('store-load-commands', async (event) => {
        return store.get('commands')
    })

    ipcMain.handle('store-edit-command', (event, commandIndex, command) => {

        const commands = store.get('commands')

        commands[commandIndex].commandName = command.commandName
        commands[commandIndex].commandType = command.commandType

        store.set('commands', commands)

        return
    })

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