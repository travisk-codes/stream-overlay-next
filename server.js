import { createRequire } from 'module';
const require = createRequire(import.meta.url);

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

import { userId, clientId, secret } from './config.js'
import { fileURLToPath } from 'url'

let twitchAccessToken, twitchRefreshToken, twitchToken, authProvider, twitchClient

const app = express()
const server = http.createServer(app)
const socket = io(server, { cors: { origin: ['http://localhost:3000'] }})

let redisClient = await redis.createClient({
	port: 6379,
	host: 'localhost',
	password: process.env.REDIS_PASS,
}).on('error', err => console.log('Redis Client Error', err)).connect()

const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
const __dirname = path.dirname(__filename); // get the name of the directory

app.use(express.static(path.join(__dirname, 'out')))
app.use(cors())
app.use(cookieParser())

app.get('/twitch-login', function (_, res) {
	const url = 'https://id.twitch.tv/oauth2/authorize?'
	const queryParams = {
		client_id: clientId,
		redirect_uri: 'https://overlay.homaro.co/twitch-callback',
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
			redirect_uri: 'https://overlay.homaro.co/twitch-callback',
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
	hostName: 'twitchwebhook.homaro.co',
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
	console.log('Socket connection established with client')
	clientSocket.on('mood', async data => {
		await redisClient.set('mood', data)
	})
	clientSocket.on('anxiety', async data => {
		await redisClient.set('anxiety', data)
	})
	clientSocket.on('energy-mental', async data => {
		await redisClient.set('energy-mental', data)
	})
	clientSocket.on('energy-physical', async data => {
		await redisClient.set('energy-physical', data)
	})
	clientSocket.on('doing-now', async data => {
		await redisClient.set('doing-now', data)
	})
	clientSocket.on('doing-later', async data => {
		await redisClient.set('doing-later', data)
	})

	try {
		const mood = await redisClient.get('mood')
		clientSocket.emit('mood', mood)
		const anxiety = await redisClient.get('anxiety')
		clientSocket.emit('anxiety', anxiety)
		const mental = await redisClient.get('energy-mental')
		clientSocket.emit('energy-mental', mental)
		const physical = await redisClient.get('energy-physical')
		clientSocket.emit('energy-physical', physical)
		const doingNow = await redisClient.get('doing-now')
		clientSocket.emit('doing-now', doingNow)
		const doingLater = await redisClient.get('doing-later')
		clientSocket.emit('doing-later', doingLater)

		const follows = await twitchClient.channels.getChannelFollowers(userId)
		let followsString = ''
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