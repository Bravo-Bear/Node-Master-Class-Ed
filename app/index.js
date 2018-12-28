// Primary File For API


// Dependency
const http = require('http')
const https = require('https')
const config = require('./lib/config')
const serverMain = require('./lib/server')
const fs = require('fs')
const workers = require('./lib/workers')

// HTTP Server
const httpServer = http.createServer((req, res) => {
  serverMain(req, res)
})

// Start the HTTP server
httpServer.listen(config.httpPort, () => {
  console.log('\x1b[36m%s\x1b[0m', `The Server is running on port ${config.httpPort} in ${config.envName} mode.`);
})

// HTTPS Server Option Keys
// const httpsServerOptions = {
//   key: fs.readFileSync('./https/key.pem').toString('utf8'),
//   passphrase: fs.readFileSync('./https/cert.perm').toString('utf8')
// }

// Start HTTPS Server
// const httpsServer = https.createServer(httpsServerOptions, (req, res) => {
//   serverMain(req, res)
// })

// Start the HTPPS server
// httpsServer.listen(config.httpsPort, () => {
//   console.log(`The Server is running on port ${config.httpsPort} in ${config.envName} mode.`);
// })

// Start workers

workers.startWorker()