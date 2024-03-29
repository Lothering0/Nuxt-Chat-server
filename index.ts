import { Server, Socket } from 'socket.io'

const express = require('express')
const app = express()
const http = require('http')
const server = http.createServer(app)

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_ADDRESS,
    methods: ['GET', 'POST']
  }
})
const users = require('./users')()
const PORT = process.env.PORT || 9000

app.get('/', (req, res) => {
  res.send(`<h3>This is back-end server of nuxt-chat project. <a href="${process.env.FRONTEND_ADDRESS}">Click to go to the main page</a>.</h3>`)
})

io.on('connect_error', err => {
  console.log(`Connect error due to ${err}`)
})

io.on('connection', (socket: Socket) => {
  socket.on('userJoined', (data, cb) => {
    if (!data.name || !data.room) cb('Invalid credentials')

    socket.join(data.room)

    users.remove(socket.id)
    users.add({
      userId: socket.id,
      name: data.name,
      color: data.color,
      room: data.room
    })

    cb({ userId: socket.id })

    setTimeout(() => {
      io
        .to(data.room)
        .emit('updateUsers', users.getByRoom(data.room))

      socket.emit('newMessage', {
        name: 'Administrator',
        text: `Welcome, ${data.name}!`
      })
      socket.broadcast
        .to(data.room)
        .emit('newMessage', {
          name: 'Administrator',
          text: `User ${data.name} joined!`
        })
    }, 250)
  })

  socket.on('userLeft', (data) => {
    const user = users.remove(socket.id)
    socket.leave(data.room)
    if (user) {
      io
        .to(user.room)
        .emit('updateUsers', users.getByRoom(user.room))

      io
        .to(user.room)
        .emit('newMessage', {
          name: 'Administrator',
          text: `User ${user.name} left.`
        })
    }
  })

  // If user close the tab for example
  socket.on('disconnect', (data) => {
    const user = users.remove(socket.id)

    if (user) {
      io
        .to(user.room)
        .emit('updateUsers', users.getByRoom(user.room))

      io
        .to(user.room)
        .emit('newMessage', {
          name: 'Administrator',
          text: `User ${user.name} left`
        })
    }
  })

  socket.on('createMessage', ({ text, id }) => {
    try {
      if (!text) {
        throw new Error('Text is not should be empty')
      }

      const { name, color, room } = users.get(id)
      if (name && color && text && id && room) {
        io
          .to(room)
          .emit('newMessage', {
            name,
            color,
            text,
            id
          })
      }
    } catch (e) {
      console.log((e as Error).message)
    }
  })
})

server.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`)
})
