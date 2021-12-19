var streamLabs = null
const btnWss = document.querySelector('.btn-wss-connect')
const connectWssLight = document.querySelector('.connect-wss-light')

btnWss.onclick = connectWss

function connectWss() {
    if (btnWss.innerHTML === 'Conectar') {
        const socketToken = document.getElementById('socketToken').value

        streamLabs = io(`https://sockets.streamlabs.com?token=${socketToken}`, { transports: ['websocket'] })

        streamLabs.on('connect', () => {
            btnWss.innerHTML = 'Desconectar'
            connectWssLight.style.color = 'green'
        })

        streamLabs.on('disconnect', () => {
            btnWss.innerHTML = 'Conectar'
            connectWssLight.style.color = 'red'
        })

        streamLabs.on('event', (eventData) => {
            const event = eventData.message[0]
            if (eventData.for === 'streamlabs' && eventData.type === 'donation') {
                console.log(`Muito obrigado pelo donate de ${event.formatted_amount}, ${event.name}!`)
                console.log(event.message)
            }
            if (eventData.for === 'twitch_account') {
                switch (eventData.type) {
                    case 'follow':
                        console.log(`Obrigado pelo follow ${event.name}!`)
                        break
                    case 'subscription':
                        console.log(`Muito obrigado pelo sub de ${event.months} meses, ${event.name}!`)
                        console.log(event.message)
                        break
                    case 'resub':
                        console.log(`Muito obrigado pela sequência de ${event.streak_months} meses, ${event.name}! Um total de ${event.months}!`)
                        console.log(event.message)
                        break
                    case 'host':
                        console.log(`Muito obrigado pelo host de ${event.viewers} viewers, ${event.name}!`)
                        break
                    case 'bits':
                        console.log(`Obrigado pelos ${event.amount} bits, ${event.name}!!!`)
                        console.log(event.message)
                        break
                    case 'raid':
                        console.log(`Muito obrigado pela raid de ${event.raiders} raiders, ${event.name}!`)
                        break
                }
            }
        })
    }
    else {
        streamLabs.disconnect()
        btnWss.innerHTML = 'Conectar'
    }
}