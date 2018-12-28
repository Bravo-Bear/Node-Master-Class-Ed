const url = require('url')
const { StringDecoder } = require('string_decoder');
const router = require('./router')
const helpers = require('./helpers')

module.exports = server = (req, res) => {
  // Get Url and Parse it
  const parsedURL = url.parse(req.url, true)

  // Get Path from URl
  const path = parsedURL.pathname
  const trimmedPath = path.replace(/^\/+|\/+$/g, '');

  // Get Query string object
  const queryStringObject = parsedURL.query

  // Get HTTP Method
  const method = req.method.toLowerCase()

  // Get Headers as an Object
  const headers = req.headers

  // Get Payload
  const decoder = new StringDecoder('utf8');
  let buffer = '';

  req.on('data', function (data) {
    buffer += decoder.write(data)
  });
  // End Buffer with final piece of data 
  req.on('end', function () {
    buffer += decoder.end()

    // Choose Hanler 
    const choosenHandler = typeof (router[trimmedPath]) !== undefined
      ? router[trimmedPath] : handlers.notFound

    // Construct Data Object to send to Handler
    const data = {
      trimmedPath,
      queryStringObject,
      method,
      headers,
      payload: helpers.parseJSON(buffer),
    }

    // Route request to choosen handler

    choosenHandler(data, function (statusCode = 200, payload = {}) {

      // Conver Payload to string
      let payloadString = JSON.stringify(payload)
      // Send the Responce
      res.setHeader('Content-Type', 'application/json')
      res.writeHead(statusCode)
      res.end(payloadString)

      // Log the request path
      console.log('---------------------------------------------');
      console.log('And with the Following response:', statusCode, payloadString);
    })
  })
}