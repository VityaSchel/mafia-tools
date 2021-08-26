import net from 'net'
import JSON5 from 'json5'
import JSONSplitStream from 'json-split-stream'

const options = {
	port: 8090,
	host: '46.175.171.134'
}

export function connect() {
	return new Promise((resolve, reject) => {
		let client = {}
		client = net.connect(options, () => {
			client.response = () => {}
			client.write('helloworld\n')
		})
		client.on("data", chunk => client.response(chunk))
		client.on("connect", () => {
			console.log("connected")
			resolve(client)
		})
		client.on("end", () => {
			console.log("disconnected")
		})
	})
}

export function sendToAPI(client, writeabledata, newStreamListener = true) {
	return new Promise((resolve, reject) => {
		if(!client) { return }
		if(newStreamListener) { // if false, promise will never resolve. Useful for chats
			client.response = data => {
				data = data.toString().replace(/\0.*$/g,'')
				let parsed
				try {
					parsed = JSON5.parse(data)
				} catch (e) {
					console.error('Could not parse server response: ', e, data)
				}
				if(parsed) {
					resolve(parsed)
				}
				client.response = () => {}
			}
		}
		client.write(writeabledata+'\n')
	})
}

export function subscribeToAPI(client, writeabledata, callback) {
	if(!client) { return }
	client.response = data => {
		data = data?.toString()
		let chunk = data?.split && data.split(/\0/g)[0]
		chunk = chunk.replace(/^,{/, '{')
		if(!chunk) { return }
		let chunker = new JSONSplitStream()
		chunker.write(chunk)
		let chunkData
		while(chunkData = chunker.read()) {
			let parsed
			try {
				parsed = JSON5.parse(chunkData.replace(/\0/g, ''))
				callback(parsed)
			} catch (e) {
				console.error('Could not parse server response: ', e, chunkData)
			}
		}
	}
	client.write(writeabledata+'\n')
	return () => {
		client.response = () => {}
	}
}
