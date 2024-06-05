'use client'

import { useState, useEffect } from 'react'
import { io } from 'socket.io-client'

import MusicTicker from './components/MusicTicker'

const socket = io('https://overlay.travisk.dev')

const MarqueeItem = ({
  emojis,
  title,
  color,
  text,
  key,
}: any) => (
  <span key={key} className="marquee-item text-lg whitespace-nowrap pr-10">
    { emojis && emojis[0] ? <span className="marquee-item-emoji pr-1">{emojis[0]}</span> : null }
    { title ? <span className='marquee-item-title pr-1' style={ color ? { color } : { color: 'white' } }>{title}</span> : null }
    { emojis && emojis[1] ? <span className="marquee-item-emoji pr-1">{emojis[1]}</span> : null }
    { text ? <span className='marquee-item-text'>{text}</span> : null }
  </span>
)

export default function Overlay() {
  const [streamTitle, setStreamTitle] = useState('Stream title not fetched.')
  const [doingNow, setDoingNow] = useState('Working on stream overlay')
  const [doingLater, setDoingLater] = useState('Playing Cyberpunk 2077')
  const [currentStatus, setCurrentStatus] = useState({
	mood: 4,
	anxiety: 4,
	mental: 4,
	physical: 3,
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
			text: 'bottomTextFollowersNotFetched',
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
  })

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
			{/* {bottomMarqueeItems.map(item => <MarqueeItem {...item} key={item.text} />)} */}
			<MusicTicker />
		</span>
		<span id='marquee-top-2' className='flex absolute bottom-0 mb-3 animate-marquee-bottom-2'>
			{/* {bottomMarqueeItems.map(item => <MarqueeItem {...item} key={item.text} />)} */}
			<MusicTicker />
		</span>
		<span id='marquee-top-3' className='flex absolute bottom-0 mb-3 animate-marquee-bottom-3'>
			{/* {bottomMarqueeItems.map(item => <MarqueeItem {...item} key={item.text} />)} */}
			<MusicTicker />
		</span>
      </div>
	  <a id='twitch-login' href='https://overlay.travisk.dev/twitch-login'>Twitch Login</a>
    </main>
  )
}
