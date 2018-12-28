// Helpers for Various taks


// Dependecies
const crypto = require('crypto')
const config = require('./config')
const https = require('https')
const querystring = require('querystring')
// Containers for all the helpers
module.exports = helpers = {
  // Create a SHA256 hash
  hash(str) {
    if (typeof (str) === 'string' && str.length > 0) {
      return hash = crypto.createHmac('sha256', config.hashingSecret).update(str).digest('hex');
    } else {
      return false
    }
  },
  parseJSON(json) {
    try {
      return JSON.parse(json)
    } catch (e) {
      return {}
    }
  },
  createRandomString(max) {
    max = typeof (max) === 'number' && max > 0 ? max : false
    if (max) {
      const possibleChar = 'abcdefghijklmnopqrstuvwxyz0123456879'
      let randomString = '';

      for (let i = 0; i < max; i++) {
        // Get randome possible character
        let ranChar = possibleChar.charAt(Math.floor(Math.random() * possibleChar.length))

        // Append to randome string
        randomString += ranChar
      }
      return randomString
    } else {
      return false
    }
  },
  sendSMS(phone, msg, callback) {
    phone = typeof (phone) === 'string' && phone.trim().length === 10 ? phone : false
    msg = typeof (msg) === 'string' && msg.trim().length > 0 && msg.trim().length <= 1600 ? msg.trim() : false

    if (phone && msg) {
      // Configure the request payload
      // For the connection with the thrid party API twilio
      const payload = {
        From: config.twilio.fromPhone,
        To: `+1${phone}`,
        Body: msg
      }

      // Stringify the payload
      let stringPayload = querystring.stringify(payload)

      // Configure the rquest details
      const requestDetails = {
        protocal: 'https:',
        hostname: 'api.twilio.com',
        method: 'POST',
        path: `/2010-04-01/Accounts/${config.twilio.accountSid}/Messages.json`,
        auth: config.twilio.accountSid + ':' + config.twilio.authToken,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(stringPayload)
        }
      }

      // Create the request to twilio with our finalized data
      const req = https.request(requestDetails, (res) => {
        // Grab the status of the sent request
        const status = res.statusCode

        // Give a responce based on the status code returned
        if (status === 200 || status === 201) {
          callback(false)
        } else {
          callback(`Status code returned was: ${status}`)
        }
      })
      // Bind to error event so it doesn't get thrown
      req.on('error', (e) => {
        callback(e)
      })
      // Add pay load to request
      req.write(stringPayload)

      // End the Request
      req.end()

    } else {
      callback('Given phone and message are missing or invalid')
    }
  }
}