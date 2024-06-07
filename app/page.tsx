'use client'

import { useState, useEffect } from 'react'
import { io } from 'socket.io-client'

import MusicTicker from './components/MusicTicker'
import { MarqueeItem } from './components/TickerItem'

const socket = io('https://overlay.homaro.co')

export default function Overlay() {
  const [streamTitle, setStreamTitle] = useState('Stream title not fetched.')
  const [followers, setFollowers] = useState('bottomTextFollowersNotFetched')
  const [doingNow, setDoingNow] = useState('Doing now not set')
  const [doingLater, setDoingLater] = useState('Doing later not set')
  const [currentStatus, setCurrentStatus] = useState({
	mood: 0,
	anxiety: 0,
	mental: 0,
	physical: 0,
  })
  

  const topMarqueeItems = [
    {
      text: streamTitle,
    },
		{
			emojis: ['🕒'],
			title: 'Doing Now:',
			text: doingNow,
			color: 'lightskyblue',
		},
		{
			emojis: ['🕒'],
			title: 'Doing Later:',
			text: doingLater,
			color: 'lightskyblue',
		},
		{
			title: 'mention me @homaro_co in chat to get my attention',
			color: 'springgreen',
		},
		{
			emojis: ['📢'],
			title: 'Announcement:',
			text: 'Looking to hire an intermediate dev? https://hire.travisk.dev',
			color: 'red',
		},
		{
			emojis: ['👀'],
			title: `1.8 average viewers (3 to get affiliate!)`,
			color: 'rgb(255, 150, 150)',
		},
    {
      text: 'Come and chat in our discord! http://chat.homaro.co'
    },
		{
			emojis: ['📢'],
			title: 'Announcement:',
			text: 'please let me know if the stream is having any technical issues!',
			color: 'red',
		},
  ]
  const bottomMarqueeItems = [
    	{
			emojis: ['🧡', '🧡'],
			title: 'Latest Subscribers',
			text: 'bottomTextSubscribersNotFetched',
			color: 'orange',
		},
		{
			emojis: ['💜', '💜'],
			title: 'Latest Followers',
			text: followers,
			color: 'violet',
		},
		{
			emojis: ['🍅', '🍅'],
			title: 'Pomodoro Technique',
			text: '1) work for 25 minutes 2) break for 5 minutes 3) repeat!',
			color: 'red',
		},
		{
			emojis: ['👩🏼', '🤔', '📊'],
			title: 'Current Status',
			text: `Mood: ${currentStatus.mood}/6  Anxiety: ${currentStatus.anxiety}/6  Energy (Mental): ${currentStatus.mental}/6  Energy (Physical): ${currentStatus.physical}/6 `,
			color: '#ff5080',
		},
  ]

  useEffect(() => {
    socket.on('streamTitleChange', data => setStreamTitle(data))
	socket.on('follows', data => setFollowers(data))
	socket.on('mood', data => setCurrentStatus(currentStatus => ({
		...currentStatus,
		mood: data,
	})))
	socket.on('anxiety', data => setCurrentStatus(currentStatus => ({
		...currentStatus,
		anxiety: data,
	})))
	socket.on('energy-physical', data => setCurrentStatus(currentStatus => ({
		...currentStatus,
		physical: data,
	})))
	socket.on('energy-mental', data => setCurrentStatus( currentStatus => ({
		...currentStatus,
		mental: data,
	})))
  }, [])

  return (
    <main className='flex flex-col items-start justify-between'>
      <div id='marquee-top'>
				{/* Cannot loop because programmatic string interp breaks the tailwind animation */}
				<span id='marquee-top-1' className='flex absolute top-0 mt-3 animate-marquee-top-1'>
					{topMarqueeItems.map(item => <MarqueeItem {...item} key={item.text} />)}
				</span>
				<span id='marquee-top-2' className='flex absolute top-0 mt-3 animate-marquee-top-2'>
					{topMarqueeItems.map(item => <MarqueeItem {...item} key={item.text} />)}
				</span>
				<span id='marquee-top-3' className='flex absolute top-0 mt-3 animate-marquee-top-3'>
					{topMarqueeItems.map(item => <MarqueeItem {...item} key={item.text} />)}
				</span>
      </div>
	  	<div id='marquee-bottom'>
				<span id='marquee-top-1' className='flex absolute bottom-0 mb-3 animate-marquee-bottom-1'>
					{bottomMarqueeItems.map(item => <MarqueeItem {...item} key={item.text} />)}
					<MusicTicker />
				</span>
				<span id='marquee-top-2' className='flex absolute bottom-0 mb-3 animate-marquee-bottom-2'>
					{bottomMarqueeItems.map(item => <MarqueeItem {...item} key={item.text} />)}
					<MusicTicker />
				</span>
				<span id='marquee-top-3' className='flex absolute bottom-0 mb-3 animate-marquee-bottom-3'>
					{bottomMarqueeItems.map(item => <MarqueeItem {...item} key={item.text} />)}
					<MusicTicker />
				</span>
      </div>
			<div id='controls'>
				<div id='logins'>
					<a id='twitch-login' href='https://overlay.travisk.dev/twitch-login'>Twitch Login</a>
					<a id='spotify-login' href='https://overlay.travisk.dev/login'>Spotify Login</a>
				</div>
				<div id='current-status-fields'>
					<input type='number' min='1' max='6' id='mood' value={currentStatus.mood} onChange={e => {
						const mood = Number(e.target.value)
						setCurrentStatus({ ...currentStatus, mood })
						socket.emit('mood', mood)
					}} />
					<input type='number' min='1' max='6' id='anxiety' value={currentStatus.anxiety} onChange={e => {
						const anxiety = Number(e.target.value)
						setCurrentStatus({ ...currentStatus, anxiety })
						socket.emit('anxiety', anxiety)
					}} />
					<input type='number' min='1' max='6' id='mental' value={currentStatus.mental} onChange={e => {
						const mental = Number(e.target.value)
						setCurrentStatus({ ...currentStatus, mental })
						socket.emit('energy-mental', mental)
					}} />
					<input type='number' min='1' max='6' id='physical' value={currentStatus.physical} onChange={e => {
						const physical = Number(e.target.value)
						setCurrentStatus({ ...currentStatus, physical })
						socket.emit('energy-physical', physical)
					}} />
				</div>
				<div id='doing-now-container'>
					<input id='doing-now' placeholder='Doing now' value={doingNow} onChange={e => {
						setDoingNow(e.target.value)
						socket.emit('doing-now', e.target.value)
					}}/>
				</div>
				<div id='doing-later-container'>
					<input id='doing-later' placeholder='Doing later' value={doingLater} onChange={e => {
						setDoingLater(e.target.value)
						socket.emit('doing-later', e.target.value)
					}}/>
				</div>
			</div>
    </main>
  )
}
