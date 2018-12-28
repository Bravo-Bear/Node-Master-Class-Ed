// These are worker tasks


// Dependecies
const _data = require('./data')
const http = require('http')
const https = require('https')
const helpers = require('./helpers')
const url = require('url')
const _logs = require('./logs')


// The workers object
module.exports = workers = {

  startWorker() {
    // Do all Checks Immediatly
    this.gatherAllChecks()

    console.log('\x1b[33m%s\x1b[0m', "Workers are running");

    // Repeat each check
    this.loop()

    // Compress all the logs
    // this.rotateLogs()
    // Call the compression loop so it logs will compress everyday
    this.logRotationLoop()
  },
  // Gather All checks that need to be run
  gatherAllChecks() {
    // Get all existing checks
    _data.list('checks', (err, checks) => {
      if (!err && checks && checks.length > 0) {
        checks.forEach(check => {
          // Read in the check data
          _data.read('checks', check, (err, originCheckData) => {
            if (!err && originCheckData) {
              // Pass it to the check validator, and let that function continue
              this.validateCheckData(originCheckData)
            } else {
              console.log("Error: Could not read one or more of the check's data");
            }
          })
        });
      } else {
        console.log('Error: could not find any checks to process');
      }
    })
  },
  // Timer to execute the worker-progress once per minute 
  loop() {
    setInterval(() => {
      this.gatherAllChecks()
    }, 1000 * 60)
  },
  validateCheckData(originCheckData) {
    originCheckData = typeof (originCheckData) === 'object' && originCheckData !== null ? originCheckData : {}
    originCheckData.id = typeof (originCheckData.id) === 'string' && originCheckData.id.length === 20 ? originCheckData.id : false
    originCheckData.userPhone = typeof (originCheckData.userPhone) === 'string' && originCheckData.userPhone.length === 10 ? originCheckData.userPhone : false
    originCheckData.protocol = typeof (originCheckData.protocol) === 'string' && ['http', 'https'].indexOf(originCheckData.protocol) > -1 ? originCheckData.protocol : false
    originCheckData.url = typeof (originCheckData.url) === 'string' && originCheckData.url.length > 0 ? originCheckData.url : false
    originCheckData.method = typeof (originCheckData.method) === 'string' && ['post', 'get', 'put', 'delete'].indexOf(originCheckData.method) > -1 ? originCheckData.method : false
    originCheckData.successCodes = typeof (originCheckData.successCodes) === 'object' && originCheckData.successCodes instanceof Array && originCheckData.successCodes.length > 0 ? originCheckData.successCodes : {}
    originCheckData.timeout = typeof (originCheckData.timeout) === 'number' && originCheckData.timeout % 1 === 0 && originCheckData.timeout >= 1 && originCheckData.timeout <= 5 ? originCheckData.timeout : false


    // Set the keys that may not be set if the workers have never seen the check before
    originCheckData.state = typeof (originCheckData.state) === 'string' && ['up', 'down'].indexOf(originCheckData.state) > -1 ? originCheckData.state : 'down'
    originCheckData.lastCheck = typeof (originCheckData.lastCheck) === 'number' && originCheckData.lastCheck > 0 ? originCheckData.lastCheck : false

    // If all checks pass the checks along to the next steps in the process
    if (
      originCheckData.id &&
      originCheckData.userPhone &&
      originCheckData.protocol &&
      originCheckData.url &&
      originCheckData.method &&
      originCheckData.successCodes &&
      originCheckData.timeout) {

      this.performCheck(originCheckData)

    } else {
      console.log(`Error: One of the checks is not properly formated. Skipping Check with Id ${originCheckData.id} `);
    }
  },
  // Performe the check
  performCheck(originCheckData) {
    // Prepare the inital check outcome
    const checkOutcome = {
      error: false,
      responce: false
    }

    // Set weather outcome has been sent or not
    let outcomeSent = false

    // Parse the host Name and the path out of the original check data
    const parsedUrl = url.parse(originCheckData.protocol + '://' + originCheckData.url, true)
    const hostname = parsedUrl.hostname
    const path = parsedUrl.path // Note we use path because we wantt the query string

    // Construct the request
    const requestDetails = {
      protocol: originCheckData.protocol + ':',
      hostname,
      method: originCheckData.method.toUpperCase(),
      path,
      timeout: originCheckData.timeout * 1000
    }

    // Instantial the request Object using the appropriate protical

    const moduleToUse = originCheckData.protocol == 'http' ? http : https

    const req = moduleToUse.request(requestDetails, (res) => {
      // Grab the status from the resonce
      const statusBack = res.statusCode

      checkOutcome.responce = statusBack
      if (!outcomeSent) {
        this.processCheckData(originCheckData, checkOutcome)
        outcomeSent = true
      }
    })
    // Bind to error event so it doesn't throw
    req.on('error', (err) => {
      checkOutcome.error = {
        error: true,
        value: err
      }
      if (!outcomeSent) {
        this.processCheckData(originCheckData, checkOutcome)
        outcomeSent = true
      }
    })
    // Bind to timeout eventlastCheck
    req.on('timeout', (err) => {
      checkOutcome.error = {
        error: true,
        value: 'timeout'
      }
      if (!outcomeSent) {
        this.processCheckData(originCheckData, checkOutcome)
        outcomeSent = true
      }
    })

    // End the request
    req.end()

  },
  // Process the check outcome and update the check data as needed, trigger an alert if needed
  // Special logic for the first check on a server
  processCheckData(originCheckData, checkOutcome) {
    // Devcide if the check is up or down
    const state = !checkOutcome.error && checkOutcome.responce && originCheckData.successCodes.indexOf(checkOutcome.responce) > -1 ? 'up' : 'down'

    // Decide weather an alert is warented
    const alertWarranted = originCheckData.lastCheck && originCheckData.state !== state ? true : false

    // Update the check data
    const newCheckData = originCheckData
    newCheckData.state = state
    newCheckData.lastCheck = Date.now()

    // Log the outcome of the check
    this.log(originCheckData, checkOutcome, state, alertWarranted, newCheckData.lastCheck);

    // Save the Update
    _data.update('checks', newCheckData.id, newCheckData, (err) => {
      if (!err) {
        // Send the check down to the next step
        if (alertWarranted) {
          this.alertUser(newCheckData)
        } else {
          console.log('Check outcome has not changed, no alert needed', newCheckData.state);
        }
      } else {
        console.log("Error trying to save updates to one of the checks");
      }
    })
  },
  // Alert a user as to a change in there request status
  alertUser(newCheckData) {
    // Create request to send out to user by text
    const msg = `Alert: Your check for ${newCheckData.method.toUpperCase()}${newCheckData.protocol}://${newCheckData.url} is currently ${newCheckData.state}`

    helpers.sendSMS(newCheckData.userPhone, msg, (err) => {
      if (!err) {
        console.log("Success: User was alerted to a status change in their check", msg);
      } else {
        console.log("Error: Could not send sms aler to user who's check was down");
      }
    })
  },
  log(originCheckData, checkOutcome, state, alertWarranted, time) {
    // Form the log data
    const logData = {
      originCheckData,
      checkOutcome,
      state,
      alertWarranted,
      time
    }

    // Convert Object to string
    const logString = JSON.stringify(logData)

    // Determine the name of log file
    const logFileName = originCheckData.id

    // Append the log string to the file 
    _logs.append(logFileName, logString, (err) => {
      if (!err) {
        console.log('\x1b[32m%s\x1b[0m', 'Success: Able to log File');
      } else {
        console.log('Error: Unable to log File');
      }
    })
  },
  // Compress all logs imediatly
  rotateLogs() {
    // Listing all non-compressed log files
    _logs.list(false, (err, logs) => {
      if (!err && logs && logs.length > 0) {
        logs.forEach((logName) => {
          // Compress the data to a diffrent file
          const logId = logName.replace('.log', '')
          const newFileId = logName + '-' + Date.now()

          _logs.compress(logId, newFileId, (err) => {
            if (!err) {
              // Truncate the log, Empty uncompressed file
              _logs.truncate(logId, (err) => {
                if (!err) {
                  console.log('Success truncating LogFile');
                } else {
                  console.log('Error truncating Logfile');
                }
              })

            } else {
              console.log('Error compressing one of the log files', err);
            }
          })
        })
      } else {
        console.log('Error: Could not find any logs to rotate');
      }
    })
  },
  // Call the compression loop for later compression
  logRotationLoop() {
    setInterval(() => {
      this.rotateLogs()
    }, 1000 * 60 * 60 * 24)
  }
}