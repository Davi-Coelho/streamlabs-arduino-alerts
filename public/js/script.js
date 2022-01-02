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
const alertLabel = document.querySelector('.alert')

btnWss.onclick = connectWss
btnDetect.onclick = detectUsb

async function connectWss() {

    await detectUsb()

    if (port) {

        if (labelToken.value !== '') {

            if (btnWss.innerHTML === 'Conectar') {

                const socketToken = labelToken.value

                streamLabs = io(`https://sockets.streamlabs.com?token=${socketToken}`, { transports: ['websocket'] })

                streamLabs.on('connect', async () => {

                    btnWss.innerHTML = 'Desconectar'
                    labelToken.disabled = true
                    btnDetect.disabled = true
                    showAlert('Conectado!', false)
                    await connectUsb()
                })

                streamLabs.on('disconnect', async () => {

                    btnWss.innerHTML = 'Conectar'
                    showAlert('Erro na conexão com o Streamlabs!')
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
                showAlert('Desconectado!')
            }
        }
        else {
            showAlert('Token vazio ou inválido!')
        }
    }
    else {
        showAlert('Erro! Nenhum Arduino detectado!')
    }
}

async function detectUsb() {

    try {
        port = await navigator.serial.requestPort({ filters })
        labelUsb.style.color = 'green'
        labelUsb.textContent = 'Arduino Uno detectado!'
    }
    catch (e) {
        console.log(e)
        labelUsb.style.color = 'red'
        labelUsb.textContent = 'Nenhum Arduino detectado'
        showAlert('Erro! Nenhum Arduino detectado!')
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
        writer.write(line + '\n')
    })
    writer.releaseLock()
}

function showAlert(message, red = true) {

    if (red) {
        alertLabel.style.backgroundColor = '#F44336'
    }
    else {
        alertLabel.style.backgroundColor = '#04AA6D'
    }
    unfade(alertLabel)
    alertLabel.innerHTML = `<strong>${message}</strong>`
    setTimeout(() => {
        fade(alertLabel)
    }, 2000);
}

function fade(element) {

    var opacity = 1
    var timer = setInterval(() => {

        if (opacity <= 0.1) {
            clearInterval(timer)
            element.style.display = 'none'
        }
        element.style.opacity = opacity
        element.style.filter = 'alpha(opacity=' + opacity * 100 + ")"
        opacity -= opacity * 0.1
    }, 50)
}

function unfade(element) {

    var opacity = 0.1
    element.style.display = 'block'
    var timer = setInterval(() => {

        if (opacity >= 1) {
            clearInterval(timer)
        }
        element.style.opacity = opacity
        element.style.filter = 'alpha(opacity=' + opacity * 100 + ")"
        opacity += opacity * 0.1
    }, 10)
}