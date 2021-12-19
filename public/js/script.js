var streamLabs = null

let port = null
let reader = null
let encoder = null
let inputDone = null
let outputDone = null
let inputStream = null
let outputStream = null

const filters = [{ usbVendorId: 0x2341, usbProductId: 0x0043 }];
const btnWss = document.querySelector('.btn-wss-connect')
const btnDetect = document.querySelector('.btn-usb-detect')
const labelUsb = document.querySelector('.label-usb')
const labelToken = document.querySelector('.textarea-token')

const btnDisconnect = document.querySelector('.close-btn-disconnect')
const btnDangerUsb = document.querySelector('.close-btn-danger-usb')
const btnDangerToken = document.querySelector('.close-btn-danger-token')
const btnDangerConnectionUsb = document.querySelector('.close-btn-danger-connection-usb')
const btnDangerConnectionWss = document.querySelector('.close-btn-danger-connection-wss')
const btnSuccess = document.querySelector('.close-btn-success')

btnWss.onclick = connectWss
btnDetect.onclick = detectUsb

btnDisconnect.onclick = () => {
    btnDisconnect.parentElement.style.display = 'none';
}
btnDangerUsb.onclick = () => {
    btnDangerUsb.parentElement.style.display = 'none';
}
btnDangerToken.onclick = () => {
    btnDangerToken.parentElement.style.display = 'none';
}
btnDangerConnectionUsb.onclick = () => {
    btnDangerConnectionUsb.parentElement.style.display = 'none';
}
btnDangerConnectionWss.onclick = () => {
    btnDangerConnectionWss.parentElement.style.display = 'none';
}
btnSuccess.onclick = () => {
    btnSuccess.parentElement.style.display = 'none';
}

async function connectWss() {
    await detectUsb(false)
    if (port) {
        if (labelToken.value !== '') {
            if (btnWss.innerHTML === 'Conectar') {
                const socketToken = labelToken.value

                streamLabs = io(`https://sockets.streamlabs.com?token=${socketToken}`, { transports: ['websocket'] })

                streamLabs.on('connect', async () => {
                    btnWss.innerHTML = 'Desconectar'
                    btnSuccess.parentElement.style.display = 'block'
                    labelToken.disabled = true
                    btnDetect.disabled = true
                    await connectUsb()
                })

                streamLabs.on('disconnect', async () => {
                    btnWss.innerHTML = 'Conectar'
                    btnDisconnect.parentElement.style.display = 'block'
                    labelToken.disabled = false
                    btnDetect.disabled = false
                })

                streamLabs.on('event', (eventData) => {
                    const event = eventData.message[0]
                    if (eventData.for === 'streamlabs' && eventData.type === 'donation') {
                        writeToStream('donation')
                        console.log(`Muito obrigado pelo donate de ${event.formatted_amount}, ${event.name}!`)
                        console.log(event.message)
                    }
                    if (eventData.for === 'twitch_account') {
                        switch (eventData.type) {
                            case 'follow':
                                writeToStream('follow')
                                console.log(`Obrigado pelo follow ${event.name}!`)
                                break
                            case 'subscription':
                                writeToStream('subscription')
                                console.log(`Muito obrigado pelo sub de ${event.months} meses, ${event.name}!`)
                                console.log(event.message)
                                break
                            case 'resub':
                                writeToStream('resub')
                                console.log(`Muito obrigado pela sequência de ${event.streak_months} meses, ${event.name}! Um total de ${event.months}!`)
                                console.log(event.message)
                                break
                            case 'host':
                                writeToStream('host')
                                console.log(`Muito obrigado pelo host de ${event.viewers} viewers, ${event.name}!`)
                                break
                            case 'bits':
                                writeToStream('bits')
                                console.log(`Obrigado pelos ${event.amount} bits, ${event.name}!!!`)
                                console.log(event.message)
                                break
                            case 'raid':
                                writeToStream('raid')
                                console.log(`Muito obrigado pela raid de ${event.raiders} raiders, ${event.name}!`)
                                break
                        }
                    }
                })
            }
            else {
                streamLabs.disconnect()
                try {
                    await disconnectUsb()
                }
                catch (e) {
                    console.log(e)
                }
                labelToken.disabled = false
                btnDetect.disabled = false
                btnWss.innerHTML = 'Conectar'
                btnDisconnect.parentElement.style.display = 'block'
            }
        }
        else {
            btnDangerToken.parentElement.style.display = 'block'
        }
    }
    else {
        btnDangerUsb.parentElement.style.display = 'block'
    }
}

async function detectUsb(testDetect = true) {
    try {
        port = await navigator.serial.requestPort({ filters })
        if (testDetect) {
            labelUsb.style.color = 'green'
            labelUsb.textContent = 'Arduino Uno detectado!'
        }
    }
    catch (e) {
        console.log(e)
        btnDangerUsb.parentElement.style.display = 'block'
    }
}

async function clickConnect() {
    if (port) {
        try {
            await disconnectUsb()
        }
        catch (e) {
            console.log(e)
        }
        console.log('Desconectado!')
        return
    }
    await connectUsb()
}

async function connectUsb() {

    try {
        port = await navigator.serial.requestPort({ filters })
        await port.open({ baudRate: 9600 })
    }
    catch (e) {
        console.log(e)
    }

    console.log('Conectado!')

    encoder = new TextEncoderStream()
    outputDone = encoder.readable.pipeTo(port.writable)
    outputStream = encoder.writable

    writeToStream('connected')
}

async function disconnectUsb() {
    if (outputStream) {
        try {
            await outputStream.getWriter().close()
            await outputDone
        }
        catch (e) {
            console.log(e)
        }
        outputStream = null
        outputDone = null
    }

    try {
        await port.close()
    }
    catch (e) {
        console.log(e)
    }
    port = null
    console.log('Desconectado!')
}

function writeToStream(...lines) {
    const writer = outputStream.getWriter()
    lines.forEach(line => {
        console.log('[SEND]', line)
        writer.write(line + '\n')
    })
    writer.releaseLock()
}