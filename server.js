const express = require('express')
const http = require('http')
const io = require('socket.io')
const path = require('path')
const cors = require('cors')
const stringify = require('querystring').stringify
const cookieParser = require('cookie-parser')
const request = require('request')
const redis = require('redis')

const { ApiClient } = require('@twurple/api')
const { RefreshingAuthProvider, exchangeCode, StaticAuthProvider, AppTokenAuthProvider } = require('@twurple/auth')
const HelixFollow = require('@twurple/api').HelixFollow
const HelixStream = require('@twurple/api').HelixStream
const HelixSubscriptionEvent = require('@twurple/api').HelixSubscriptionEvent
const { ReverseProxyAdapter, EventSubHttpListener } = require('@twurple/eventsub-http')

const { userId, clientId, secret } = require('./config')

let twitchAccessToken, twitchRefreshToken, twitchToken, authProvider, twitchClient

const app = express()
const server = http.createServer(app)
const socket = io(server, { origins: '*:*', cookie: false })

// const authProvider = new RefreshingAuthProvider({ clientId, secret })
// const twitchClient = new ApiClient({ authProvider })


// const authProvider = new RefreshingAuthProvider({
// 	clientId,
// 	secret,
// })


let redisClient = redis.createClient({
	port: 6379,
	host: 'localhost',
	password: process.env.REDIS_PASS,
})

redisClient.connect()

app.use(express.static(path.join(__dirname, 'out')))
app.use(cors())
app.use(cookieParser())

app.get('/twitch-login', function (_, res) {
	const url = 'https://id.twitch.tv/oauth2/authorize?'
	const queryParams = {
		client_id: clientId,
		redirect_uri: 'https://overlay.travisk.dev/twitch-callback',
		response_type: 'code',
		scope: 'channel:read:subscriptions channel:manage:broadcast moderator:read:followers',
	}

	//res.header('Access-Control-Allow-Origin', '*')
	res.redirect(url + stringify(queryParams))
})

app.get('/twitch-callback', (req, res) => {
	const code = req.query.code
	// twitchToken = await exchangeCode(clientId, secret, code, 'https://overlay.travisk.dev/twitch-callback')
	// await authProvider.addUser(userId, twitchToken)
	const authOptions = {
		url: 'https://id.twitch.tv/oauth2/token?',
		form: {
			client_id: clientId,
			client_secret: secret,
			code: code,
			grant_type: 'authorization_code',
			redirect_uri: 'https://overlay.travisk.dev/twitch-callback',
		},
	}

	request.post(authOptions, async (err, response, body) => {
		body = JSON.parse(body)
		twitchAccessToken = body.access_token
		twitchRefreshToken = body.refresh_token
		authProvider = new StaticAuthProvider(clientId, twitchAccessToken)
		twitchClient = new ApiClient({ authProvider })
		// twitchToken = {
		// 	accessToken: twitchAccessToken,
		// 	refreshToken: twitchRefreshToken,
		// 	expiresIn: 0,
		// 	obtainmentTimestamp: 0,
		// }
		// const authProvider = new RefreshingAuthProvider({ clientId, secret })
		// await authProvider.addUser(userId, twitchToken)
		// authProvider.onRefresh(async (userId, newToken) => {
		// 	twitchToken = newToken
		// })
		// const twitchClient = new ApiClient({ authProvider })
		// console.log('stream:', twitchClient.streams.getStreamByUserId(userId))
		// await getWebhookSubscriptions(twitchClient)

		res.redirect('/#')
	})
})

const webhookConfig = new ReverseProxyAdapter({
	hostName: 'twitchwebhook.travisk.dev',
	port: 7783,
})

const generateRandomString = (length) => {
	let text = ''
	let possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
	for (let i = 0; i < length; i++) {
		let randomIndex = Math.floor(Math.random() * possible.length)
		text += possible.charAt(randomIndex)
	}
	return text
}
const fixedStringSecret = generateRandomString(32)

async function getWebhookSubscriptions(client) {
	try {
		const listener = new EventSubHttpListener({
			apiClient: client,
			adapter: webhookConfig,
			secret: fixedStringSecret,
		})
		listener.start()
		const streamChangeSubscription = await listener.onChannelUpdate(
			userId,
			onStreamChange,
		)
		const followsSubscription = await listener.onChannelFollow(
			userId,
			userId,
			onNewFollow,
		)
		// const subscriptionsSubscription = await listener.subscribeToSubscriptionEvents(
		// 	userId,
		// 	onSubscriptionEvent,
		// )
		return [
			streamChangeSubscription,
			followsSubscription,
			// subscriptionsSubscription,
		]
	} catch (e) {
		console.log('getWebhookSubscriptions error', e.name, e.message)
	}
}

async function onStreamChange(stream) {
	console.log('onStreamChange')
	if (stream) {
		console.log('stream title changed')
		socket.emit('streamTitleChange', stream.title)
	}
}

let follows = []
const onNewFollow = async (follow = HelixFollow) => {
	console.log(follow)
	if (follow) {
		console.log('new follower')
		follows.unshift(follow)
		socket.emit('follows', follows)
	} else {
		console.log('unfollowed')
		follows.pop()
		socket.emit('follows', follows)
	}
}

let subscriptions = []
const onSubscriptionEvent = async (subscription = HelixSubscriptionEvent) => {
	console.log(subscription)
	if (subscription) {
		console.log('new subscription')
		subscriptions.unshift(subscription)
		socket.emit('subscriptions', subscriptions)
	} else {
		console.log('end subscription')
		subscriptions.pop()
		socket.emit('subscriptions', subscriptions)
	}
}

socket.on('connection', async (clientSocket) => {
	try {
		redisClient.get('doing-now', (err, value) => {
			if (err) throw new Error(err)
			clientSocket.emit('doing-now', value)
		})
		redisClient.get('doing-later', (err, value) => {
			if (err) throw new Error(err)
			clientSocket.emit('doing-later', value)
		})
		redisClient.get('mood', (err, value) => {
			if (err) throw new Error(err)
			clientSocket.emit('mood', value)
		})
		redisClient.get('anxiety', (err, value) => {
			if (err) throw new Error(err)
			clientSocket.emit('anxiety', value)
		})
		redisClient.get('energy-physical', (err, value) => {
			if (err) throw new Error(err)
			clientSocket.emit('energy-physical', value)
		})
		redisClient.get('energy-mental', (err, value) => {
			if (err) throw new Error(err)
			clientSocket.emit('energy-mental', value)
		})

		clientSocket.on('doing-now', (data) =>
			redisClient.set('doing-now', data, (err) => {
				if (err) throw new Error(err)
				clientSocket.broadcast.emit('doing-now', data)
			}),
		)
		clientSocket.on('doing-later', (data) =>
			redisClient.set('doing-later', data, (err) => {
				if (err) throw new Error(err)
				clientSocket.broadcast.emit('doing-later', data)
			}),
		)
		clientSocket.on('mood', (data) =>
			redisClient.set('mood', data, (err) => {
				if (err) throw new Error(err)
				clientSocket.broadcast.emit('mood', data)
			}),
		)
		clientSocket.on('anxiety', (data) =>
			redisClient.set('anxiety', data, (err) => {
				if (err) throw new Error(err)
				clientSocket.broadcast.emit('anxiety', data)
			}),
		)
		clientSocket.on('energy-physical', (data) =>
			redisClient.set('energy-physical', data, (err) => {
				if (err) throw new Error(err)
				clientSocket.broadcast.emit('energy-physical', data)
			}),
		)
		clientSocket.on('energy-mental', (data) =>
			redisClient.set('energy-mental', data, (err) => {
				if (err) throw new Error(err)
				clientSocket.broadcast.emit('energy-mental', data)
			}),
		)

		console.log('Socket connection established with client')
		const follows = await twitchClient.channels.getChannelFollowers(userId)
		followsString = ''
		follows.data.forEach((follow, i) => {
			if (i > 2) return
			followsString += `${follow.userDisplayName} • `
		})
		followsString = followsString.slice(0, -2)
		clientSocket.emit('follows', followsString)

		// const subscriptions = await twitchClient.subscriptions.getSubscriptionsPaginated(
		// 	userId,
		// )
		// //subscriptions = await paginatedSubscriptions.getAll()
		// console.log('subscriptions:', subscriptions)
		// clientSocket.emit('subscriptions', subscriptions)

		const stream = await twitchClient.streams.getStreamByUserId(userId)
		console.log(stream)
		if (stream) {
			clientSocket.emit('streamTitleChange', stream.title)
		}

		clientSocket.on('disconnect', async () => {
			try {
				console.log('disconnected')
				//subscriptions[0].stop()
				//subscriptions[1].stop()
			} catch (e) {
				console.log(e)
			}
		})
	} catch (e) {
		console.log('socket.on connection', e.name, e.message)
	}
})

server.listen(7790, () => console.log('listening on 7790'))