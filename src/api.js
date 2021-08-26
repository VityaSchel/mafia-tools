import { connect, sendToAPI, subscribeToAPI } from './tcp.js'
import User from './user.js'
import JSON5 from 'json5'

export default class API {
  async init(options) {
    this.client = await connect()
    this.userID = options.userID
    this.token = options.token
    this.email = options.email
    this.password = options.password
  }

  async newSession(request) {
    let response = await sendToAPI(this.client, request)
    if(response.ty === 'siner') {
      let error
      switch(response.e) {
        case -4:
          error = 'Token incorrect'
          break

        default:
          error = 'Unknown error'
          break
      }
      throw `Login to Mafia Online failed. Error: ${error}; server response: ${JSON.stringify(response)}`
    } else {
      this.token = response.uu.t
      this.userID = response.uu.o
    }
    return response
  }

  async loginWithToken() {
    let request = JSON.stringify({
  		d: 'd104f9b6412335d2', // deviceID
  		t: this.token,
  		ty: 'sin', // type of action: login
  		e: '', pwd: '', // login && password
  		o: this.userID
  	})
    return await this.newSession(request)
  }

  async loginWithEmailPassword() {
    let request = JSON.stringify({
  		d: 'd104f9b6412335d2', // deviceID
  		ty: 'sin', // type of action: login
  		e: this.email, pw: this.password, // email && password
  	})
    return await this.newSession(request)
  }

  subscribeToChat(callback) {
    let timeout, unsubscribe
    const subscribeToPublicChat = () => {
      let request = JSON.stringify({
        ty: 'acc',
        t: this.token,
        uo: this.userID
      })
      console.log('subscribed to public chat', request)
      unsubscribe = subscribeToAPI(this.client, request, messages => {
        switch(messages.ty) {
          case 'u':
            return

          case 'm':
            callback(messages.m)
            break

          case 'ms':
            messages.ms.forEach(callback)
            break
        }

        setAPItimeout()
      })
      const setAPItimeout = () => {
        clearInterval(timeout)
        timeout = setInterval(() => { unsubscribe(); subscribeToPublicChat() }, 6500)
      }
      setAPItimeout()
    }
    subscribeToPublicChat()
    let client = { client: this.client }
    return () => {
      clearInterval(timeout)
      unsubscribe()
      getMe()
    }
  }

  async sendToPublicChat(text) {
    let request = JSON.stringify({
      ty: 'cmc',
      m: {
        tx: text
      }
    })
    let response = await sendToAPI(this.client, request, false)
    return response
  }

  async signUp(options) {
    let responseRaw = await fetch('46.175.171.134:8008', {
      method: 'POST',
      body: new URLSearchParams({
          'email': options.email,
          'username': options.username ?? '',
          'password': options.password,
          'deviceId': 'd104f9b6412335d2',
          'lang': options.lang ?? 'RUS'
      }),
      headers: {
        'Authorization': 'м',
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    })
    return await responseRaw.json()
  }

  async getMe() {
    let request = JSON.stringify({
  		t: this.token,
  		ty: 'acd',
  		uo: this.userID
  	})
    let response = await sendToAPI(this.client, request)
    if(response.uud) {
      return new User(response.uud)
    } else {
      throw `Getting information from Mafia Online failed. Server response: ${JSON.stringify(response)}`
    }
  }
}
