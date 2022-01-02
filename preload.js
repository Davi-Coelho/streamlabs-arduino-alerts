const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
    saveToken: (socketToken) => {
        
        ipcRenderer.invoke('store-save-token', socketToken)

        return
    },
    loadToken: async () => {
        
        return await ipcRenderer.invoke('store-load-token')
    },
})