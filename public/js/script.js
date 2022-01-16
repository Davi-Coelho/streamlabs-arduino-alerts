var streamLabs = null
let commands = []

let port = null
let encoder = null
let outputDone = null
let outputStream = null

const filters = [{ usbVendorId: 0x2341, usbProductId: 0x0043 }];
const btnWss = document.querySelector('.btn-wss-connect')
const btnDetect = document.querySelector('.btn-usb-detect')
const labelUsb = document.querySelector('.label-usb')
const labelToken = document.querySelector('.textarea-token')
const alertLabel = document.querySelector('.alert')
const sectionConnection = document.querySelector('.section-connection')
const sectionCommands = document.querySelector('.section-commands')
const btnNavConnection = document.querySelector('.btn-nav-connection')
const btnNavCommands = document.querySelector('.btn-nav-commands')
const tableBody = document.querySelector('.table-body')

btnNavConnection.onclick = loadSection
btnNavCommands.onclick = loadSection
btnWss.onclick = connectWss
btnDetect.onclick = detectUsb

async function loadConfig() {
    const token = await window.api.loadToken()
    commands = await window.api.loadAllCommands()

    if (token) {
        labelToken.value = token
    }

    commands.forEach(command => {
        const currentCommand = createCommandRow()
        currentCommand.commandLabel.innerHTML = command.commandName
        currentCommand.typeSelect.value = command.commandType
    })
}

function loadSection() {

    if (this == btnNavConnection) {
        sectionConnection.style.display = 'grid'
        sectionCommands.style.display = 'none'
    }
    else if (this == btnNavCommands) {
        sectionConnection.style.display = 'none'
        sectionCommands.style.display = 'grid'
    }
}

async function connectWss() {

    await detectUsb()

    if (port) {

        if (labelToken.value !== '') {

            if (btnWss.innerHTML === 'Conectar') {

                const socketToken = labelToken.value

                streamLabs = io(`https://sockets.streamlabs.com?token=${socketToken}`, { transports: ['websocket'] })

                streamLabs.on('connect', async () => {

                    btnWss.innerHTML = 'Desconectar'
                    btnWss.classList.add('connected')
                    labelToken.disabled = true
                    btnDetect.disabled = true
                    showAlert('Conectado!', false)
                    await connectUsb()
                    window.api.saveToken(socketToken)
                })

                streamLabs.on('disconnect', async () => {

                    btnWss.innerHTML = 'Conectar'
                    btnWss.classList.remove('connected')
                    showAlert('Erro na conexão com o Streamlabs!')
                    labelToken.disabled = false
                    btnDetect.disabled = false
                })

                streamLabs.on('event', (eventData) => {

                    const event = eventData.message[0]

                    if (eventData.for === 'streamlabs' && eventData.type === 'donation') {
                        writeToStream(`${commands[5].commandType}-${event.formatted_amount}-${event.name}`)
                        console.log(`Muito obrigado pelo donate de ${event.formatted_amount}, ${event.name}!`)
                    }

                    if (eventData.for === 'twitch_account') {
                        switch (eventData.type) {
                            case 'follow':
                                writeToStream(`${commands[0].commandType}-${event.name}`)
                                console.log(`Obrigado pelo follow ${event.name}!`)
                                break
                            case 'subscription':
                                writeToStream(`${commands[1].commandType}-${event.months}-${event.name}`)
                                console.log(`Muito obrigado pelo sub de ${event.months} meses, ${event.name}!`)
                                break
                            case 'resub':
                                writeToStream(`${commands[2].commandType}-${event.streak_months}-${event.name}-${event.months}`)
                                console.log(`Muito obrigado pela sequência de ${event.streak_months} meses, ${event.name}! Um total de ${event.months}!`)
                                break
                            case 'host':
                                writeToStream(`${commands[3].commandType}-${event.viewers}-${event.name}`)
                                console.log(`Muito obrigado pelo host de ${event.viewers} viewers, ${event.name}!`)
                                break
                            case 'raid':
                                writeToStream(`${commands[3].commandType}-${event.raiders}-${event.name}`)
                                console.log(`Muito obrigado pela raid de ${event.raiders} raiders, ${event.name}!`)
                                break
                            case 'bits':
                                writeToStream(`${commands[4].commandType}-${event.amount}-${event.name}`)
                                console.log(`Obrigado pelos ${event.amount} bits, ${event.name}!!!`)
                                break
                        }
                    }
                })
            }
            else {

                streamLabs.disconnect()

                try {
                    await disconnectUsb()
                } catch (e) {
                    console.log(e)
                }

                labelToken.disabled = false
                btnDetect.disabled = false
                btnWss.classList.remove('connected')
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

function createCommandRow() {

    const rowIndex = tableBody.rows.length
    const commandRow = tableBody.insertRow(rowIndex)

    const commandCell = commandRow.insertCell(0)
    const typeCell = commandRow.insertCell(1)
    const actionCell = commandRow.insertCell(2)

    const commandLabel = document.createElement('span')
    const typeSelect = document.createElement('select')
    const saveButton = document.createElement('button')
    const editButton = document.createElement('button')

    commandCell.style.textAlign = 'left'

    saveButton.disabled = true
    typeSelect.disabled = true

    saveButton.onclick = () => saveCommand(commandRow, commandLabel, typeSelect, saveButton, editButton)
    editButton.onclick = () => editCommand(typeSelect, saveButton, editButton)

    typeSelect.classList.add('select-box')
    saveButton.classList.add('btn-row-command')
    editButton.classList.add('btn-row-command')

    typeSelect.innerHTML = `<option value="0" selected>Choose a option</option>
                            <option value="2">ON/OFF  (1)</option>
                            <option value="3">ON/OFF  (2)</option>
                            <option value="4">Light   (1)</option>
                            <option value="5">Light   (2)</option>
                            <option value="6">Trigger (1)</option>
                            <option value="7">Trigger (2)</option>`

    saveButton.innerHTML = `<i class="fas fa-save" title="Salvar"></i>`
    editButton.innerHTML = `<i class="fas fa-edit" title="Editar"></i>`

    commandCell.appendChild(commandLabel)
    typeCell.appendChild(typeSelect)
    actionCell.appendChild(saveButton)
    actionCell.appendChild(editButton)

    return { commandRow, commandLabel, typeSelect, saveButton, editButton }
}

function saveCommand(commandRow, commandLabel, typeSelect, saveButton, editButton) {

    const rowIndex = commandRow.rowIndex - 1
    const command = commandLabel.innerHTML
    const type = typeSelect.value
    let hasType = commands.findIndex((el, i) =>
        (el.commandType === type) && (el.commandType != '0') && (i !== rowIndex)
    )
    console.log(rowIndex)
    console.log(hasType)

    if (hasType === -1) {
        commands[rowIndex].commandName = command
        commands[rowIndex].commandType = type
        window.api.editCommand(rowIndex, commands[rowIndex])

        typeSelect.disabled = true
        saveButton.disabled = true
        editButton.disabled = false
    }
    else if (confirm(`Esse tipo já está sendo usado no comando ${commands[hasType].commandName}. Deseja sobrescrever o outro comando?`)) {
        commands[rowIndex].commandType = type
        commands[hasType].commandType = '0'

        window.api.editCommand(rowIndex, commands[rowIndex])
        window.api.editCommand(hasType, commands[hasType])
        tableBody.rows[hasType].cells[1].firstElementChild.value = '0'

        typeSelect.disabled = true
        saveButton.disabled = true
        editButton.disabled = false
    }
}

function editCommand(typeSelect, saveButton, editButton) {

    typeSelect.disabled = false
    saveButton.disabled = false
    editButton.disabled = true
}

loadConfig()