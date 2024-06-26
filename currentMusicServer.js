import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path  from 'path'
const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
const __dirname = path.dirname(__filename); // get the name of the directory

const express = require('express') // Express web server framework
const request = require('request') // "Request" library
const cors = require('cors')
const stringify = require('querystring').stringify
const cookieParser = require('cookie-parser')
const spotifySecrets = require('./spotifySecrets.cjs')

const clientId = spotifySecrets.clientId
const clientSecret = spotifySecrets.clientSecret
const redirectURI = spotifySecrets.redirectURI

const generateRandomString = (length) => {
	let text = ''
	let possible =
		'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

	for (let i = 0; i < length; i++) {
		let randomIndex = Math.floor(Math.random() * possible.length)
		text += possible.charAt(randomIndex)
	}

	return text
}

const stateKey = 'spotify_auth_state'

const app = express()

app
	.use(express.static(__dirname + '/public'))
	.use(cors())
	.use(cookieParser())

app.get('/', (_, res) => {
	res.header('Access-Control-Allow-Origin', '*')
	res.redirect('/login')
})

app.get('/login', function (_, res) {
	const state = generateRandomString(16)
	const url = 'https://accounts.spotify.com/authorize?'
	const queryParams = {
		response_type: 'code',
		client_id: clientId,
		scope: 'user-read-playback-state',
		redirect_uri: redirectURI,
		state,
	}

	res.cookie(stateKey, state)
	res.header('Access-Control-Allow-Origin', '*')
	res.redirect(url + stringify(queryParams))
})

app.get('/callback', function (req, res) {
	const code = req.query.code || null
	const state = req.query.state || null
	const storedState = req.cookies ? req.cookies[stateKey] : null

	if (state === null || state !== storedState) {
		res.redirect('/#?error=state_mismatch')
		return
	}

	res.clearCookie(stateKey)

	const buffer = new Buffer(clientId + ':' + clientSecret)
	const headers = {
		'Access-Control-Allow-Origin': '*',
		Authorization: 'Basic ' + buffer.toString('base64'),
	}
	const form = {
		code,
		redirect_uri: redirectURI,
		grant_type: 'authorization_code',
	}
	const authOptions = {
		url: 'https://accounts.spotify.com/api/token',
		form,
		headers,
		json: true,
	}

	request.post(authOptions, (error, response, body) => {
		if (error || response.statusCode !== 200) {
			res.redirect('/overlay?error=invalid_token')
			return
		}

		const url =
			'/#' +
			stringify({
				access_token: body.access_token,
				refresh_token: body.refresh_token,
			})

		res.redirect(url)
	})
})

app.get('/refresh_token', function (req, res) {
	const buffer = new Buffer(clientId + ':' + clientSecret)
	const headers = {
		Authorization: 'Basic ' + buffer.toString('base64'),
	}
	const form = {
		grant_type: 'refresh_token',
		refresh_token: req.query.refresh_token,
	}
	let authOptions = {
		url: 'https://accounts.spotify.com/api/token',
		headers,
		form,
		json: true,
	}

	request.post(authOptions, function (error, response, body) {
		if (error || response.statusCode !== 200) return
		res.send({ access_token: body.access_token })
	})
})

console.log('Listening on 7791')
app.listen(7791)
