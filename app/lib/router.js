// Handlers


// Depndency
_data = require('./data.js')
const helpers = require('./helpers')
const config = require('./config')

// Define the Handlers
const handlers = {
  ping(data, callback) {
    // Call Back Http Status and PayLoad
    callback(200)
  },
  notFound(data, callback) {

    callback(404)
  },
  users(data, callback) {
    const acceptMethods = ['post', 'get', 'put', 'delete']
    if (acceptMethods.indexOf(data.method) > -1) {
      handlers._users[data.method](data, callback)
    } else {
      callback(405)
    }
  },
  _users: {
    // User - require firstname, lastname, phone, password, toAgreement
    post(data, callback) {
      const firstName = typeof (data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false
      const lastName = typeof (data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false
      const phone = typeof (data.payload.phone) == 'string' && data.payload.phone.trim().length === 10 ? data.payload.phone.trim() : false
      const password = typeof (data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false
      const tosAgreement = typeof (data.payload.tosAgreement) == 'boolean' && data.payload.tosAgreement === true ? data.payload.tosAgreement : false


      if (firstName && lastName && phone && password && tosAgreement) {
        // Make sure user deosn't already exist
        _data.read('users', phone, (err, data) => {
          if (err) {
            // Hash the password
            const hashPassword = helpers.hash(password)

            if (hashPassword) {
              // Create the user object
              const userObject = {
                firstName,
                lastName,
                phone,
                hashPassword,
                tosAgreement: true,
              }

              // Store the User
              _data.create('users', phone, userObject, (err) => {
                if (!err) {
                  callback(200)
                } else {
                  console.log(err);
                  callback(500, { Error: ' Could not create new User' })
                }
              })
            } else {
              callback(500, { Error: 'Could not hash User Password' })
            }
          } else {
            callback(480, { Error: 'A user with that phone number already exists' })
          }
        })
      } else {
        callback(400, { Error: 'missing require fields' })
      }
    },
    // Requeire data: phone
    // Optiona; data: none
    get(data, callback) {
      const phone = typeof (data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length === 10 ? data.queryStringObject.phone.trim() : false
      if (phone) {
        // Get Token form the header 
        let token = typeof (data.headers.token) === 'string' ? data.headers.token : false

        // Verify that the givens token is valid for the phone number
        handlers._tokens.checkToken(token, phone, (tokenValid) => {
          if (tokenValid) {
            // Look up the user
            _data.read('users', phone, (err, data) => {
              if (!err && data) {
                // Remove Password from User OBject
                delete data.hashPassword
                callback(200, data)
              } else {
                callback(404)
              }
            })
          } else {
            callback(404, { Error: 'Missing required token in the header, or token is expired' })
          }
        })
      } else {
        callback(400, { Error: 'Invalid Phone Number ' })
      }
    },
    // Requeire data: phone
    // Optiona; data: everything else
    put(data, callback) {
      // Check for required field
      const phone = typeof (data.payload.phone) == 'string' && data.payload.phone.trim().length === 10 ? data.payload.phone.trim() : false

      // Get Token form the header 
      let token = typeof (data.headers.token) === 'string' ? data.headers.token : false

      // Check for OPtional Field
      const firstName = typeof (data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false
      const lastName = typeof (data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false
      const password = typeof (data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false

      // error if phone invalid otherwise
      handlers._tokens.checkToken(token, phone, (tokenValid) => {
        if (tokenValid) {
          // Look up the user
          if (phone && firstName || lastName || password) {
            _data.read('users', phone, (err, data) => {
              if (!err && data) {

                if (firstName) {
                  data.firstName = firstName
                }
                if (lastName) {
                  data.lastName = lastName
                }
                if (password) {
                  data.password = password
                }
                // Store the new updates
                _data.update('users', phone, data, (err) => {
                  if (!err) {
                    callback(200)
                  } else {
                    console.log(err);
                    callback(500, { Error: 'Could not update the user' })
                  }
                })
              } else {
                callback(400, { Error: "User does not exist" })
              }
            })
          } else {
            callback(400, { Error: 'Need Valid Phone Number and at Least one optional Field' })
          }
        } else {
          callback(404, { Error: 'Missing required token in the header, or token is expired' })
        }
      })
    },
    // Requeire data: phone
    // Optiona; data: nothing
    // TODO Delete any other files associated to this user
    delete(data, callback) {
      const phone = typeof (data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length === 10 ? data.queryStringObject.phone.trim() : false

      let token = typeof (data.headers.token) === 'string' ? data.headers.token : false

      handlers._tokens.checkToken(token, phone, (tokenValid) => {
        if (tokenValid) {
          // Delete each of the checks associated with the user
          _data.read('users', phone, (err, userData) => {
            if (!err) {
              // Delete the user
              _data.delete('users', phone, (err) => {
                if (!err) {
                  // Delete each of the checks associated with the user
                  const userChecks = typeof (userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : []
                  const checksToDelete = userChecks.length

                  if (checksToDelete > 0) {
                    let checksDeleted = 0
                    const deletedErrors = false

                    // Loop through the Array and delete all the given checks
                    userChecks.forEach(check => {
                      _data.delete('checks', check, (err) => {
                        if (err) {
                          deletedErrors = true
                        }
                        checksDeleted++
                        if (checksDeleted === checksToDelete) {
                          if (!deletedErrors) {
                            callback(200)
                          } else {
                            callback(500, { Error: 'Checks deleted do not equal checks to delete' })
                          }
                        }
                      })
                    });
                  } else {
                    callback(200)
                  }
                } else {
                  callback(404)
                }
              })
            } else {
              callback(400, { Error: 'Invalid Phone Number for user' })
            }
          })
        } else {
          callback(404, { Error: 'Missing required token in the header, or token is expired' })
        }
      })
    }
  },
  // Tokens
  tokens(data, callback) {
    const acceptMethods = ['post', 'get', 'put', 'delete']
    if (acceptMethods.indexOf(data.method) > -1) {
      handlers._tokens[data.method](data, callback)
    } else {
      callback(405)
    }
  },
  _tokens: {
    // Require Phone and Password
    post(data, callback) {
      const phone = typeof (data.payload.phone) == 'string' && data.payload.phone.trim().length === 10 ? data.payload.phone.trim() : false
      const password = typeof (data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false

      if (phone && password) {
        _data.read('users', phone, (err, data) => {
          if (!err && data) {
            // Compare Passwords
            let hashedPassword = helpers.hash(password)

            if (hashedPassword == data.hashPassword) {
              // If Valid, create new token with a randome name
              const tokenId = helpers.createRandomString(20);
              const expires = Date.now() + 1000 * 60 * 60
              const tokenObj = {
                phone,
                tokenId,
                expires
              }
              // Store the data
              _data.create('tokens', tokenId, tokenObj, (err) => {
                if (!err) {
                  callback(200, tokenObj)
                } else {
                  callback(500, { Error: 'Could not create new token' })
                }
              })
            } else {
              callback(400, { Error: 'Passwords do not match' })
            }
          } else {
            callback(400, { Error: 'Unable to locate User' })
          }
        })
      } else {
        callback(400, { Error: 'Missing required fields' })
      }
    },
    get(data, callback) {
      const id = typeof (data.queryStringObject.id) == 'string' && data.queryStringObject.id ? data.queryStringObject.id : false
      if (id) {
        _data.read('tokens', id, (err, tokenData) => {
          if (!err && tokenData) {
            callback(200, tokenData)
          } else {
            callback(404)
          }
        })
      } else {
        callback(400, { Error: 'Invalid ID Number ' })
      }
    },
    // required id, extend
    put(data, callback) {
      // Check for required field
      const tokenId = typeof (data.payload.tokenId) === 'string' ? data.payload.tokenId : false
      const extend = typeof (data.payload.extend) === 'boolean' && data.payload.extend === true ? true : false

      // error if tokenId invalid otherwise 
      if (tokenId && extend) {
        _data.read('tokens', tokenId, (err, data) => {
          if (!err && data) {
            // Check to see if token is still valid
            if (data.expires > Date.now()) {
              // Extend one hour
              data.expires = Date.now() + 1000 * 60 * 60;
            } else {
              callback(400, { Error: "Token is already expired" })
            }

            // Store teh new Updates
            _data.update('tokens', tokenId, data, (err) => {
              if (!err) {
                callback(200)
              } else {
                console.log(err);
                callback(500, { Error: 'Could not update the token' })
              }
            })
          } else {
            callback(400, { Error: "Unable to Locate Given token" })
          }
        })
      } else {
        callback(400, { Error: 'Need Valid id Number' })
      }
    },
    delete(data, callback) {
      const id = typeof (data.queryStringObject.id) == 'string' ? data.queryStringObject.id : false

      if (id) {
        _data.delete('tokens', id, (err, tokenData) => {
          if (!err && tokenData) {
            callback(200, tokenData)
          } else {
            callback(404)
          }
        })
      } else {
        callback(400, { Error: 'Invalid Phone Number' })
      }
    },
    checkToken(id, phone, callback) {
      _data.read('tokens', id, (err, data) => {
        if (!err && data) {
          // Check if token matches user phone
          if (phone === data.phone && data.expires > Date.now()) {
            callback(true)
          } else {
            callback(false)
          }
        } else {
          callback(false)
        }
      })
    }
  },
  // Checks
  checks(data, callback) {
    const acceptMethods = ['post', 'get', 'put', 'delete']
    if (acceptMethods.indexOf(data.method) > -1) {
      handlers._checks[data.method](data, callback)
    } else {
      callback(405)
    }
  },
  _checks: {
    // Required data: protocol, url, method, successCodes, timeout seconds
    post(data, callback) {
      const protocol = typeof (data.payload.protocal) == 'string' && ['https', 'http'].indexOf(data.payload.protocal) ? data.payload.protocal : false
      const url = typeof (data.payload.url) == 'string' ? data.payload.url : false
      const method = typeof (data.payload.method) == 'string' && ['post', 'get', 'put', 'delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false
      const successCodes = typeof (data.payload.successCodes) == 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false
      const timeout = typeof (data.payload.timeout) == 'number' && data.payload.timeout % 1 === 0 && data.payload.timeout >= 1 && data.payload.timeout <= 5 ? data.payload.timeout : false

      if (protocol && url && method && successCodes && timeout) {
        // Check token for headers
        let token = typeof (data.headers.token) === 'string' ? data.headers.token : false

        _data.read('tokens', token, (err, tokenData) => {
          if (!err && tokenData) {
            const userPhone = tokenData.phone

            // Locate User Data
            _data.read('users', userPhone, (err, userData) => {
              if (!err && tokenData) {
                const userChecks = typeof (userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : []

                // Verify if User has reached Max checks
                if (userChecks.length < config.maxChecks) {
                  const checkId = helpers.createRandomString(20)

                  // Create the check object and include the user's phone
                  const checkObject = {
                    id: checkId,
                    protocol,
                    userPhone,
                    url,
                    method,
                    successCodes,
                    timeout
                  }

                  _data.create('checks', checkId, checkObject, (err) => {
                    if (!err) {
                      // Add check id to the user's object
                      userData.checks = userChecks
                      userData.checks.push(checkId)
                      // Update User
                      _data.update('users', userPhone, userData, (err) => {
                        if (!err) {
                          console.log('You did it');
                          callback(200, checkObject)
                        } else {
                          callback(500, { Error: 'Unable to Update User Checks' })
                        }
                      })
                    } else {
                      callback(500, { Error: 'Unable to create checks' })
                    }
                  })
                } else {
                  callback(500, { Error: 'User has reached max ammount of checks' })
                }
              } else {
                callback(403)
              }
            })
          } else {
            callback(403)
          }
        })
      } else {
        callback(400, { Error: 'Missing Required Inputs, or Inputs are invalid' })
      }
    },
    get(data, callback) {
      const id = typeof (data.queryStringObject.id) === 'string' && data.queryStringObject.id.length === 20 ? data.queryStringObject.id.trim() : false
      if (id) {
        // Look the check
        _data.read('checks', id, (err, checkData) => {
          if (!err && checkData) {
            // Get Token form the header 
            let token = typeof (data.headers.token) === 'string' ? data.headers.token : false

            // Verify that the givens token is valid for the id number
            handlers._tokens.checkToken(token, checkData.userPhone, (tokenValid) => {
              if (tokenValid) {
                // Look up the user
                callback(200, checkData)
              } else {
                callback(403)
              }
            })
          } else {
            callback(404)
          }
        })
      } else {
        callback(400, { Error: 'Invalid id Number' })
      }
    },
    // required id, extend
    put(data, callback) {
      // Check for required field
      const id = typeof (data.payload.id) == 'string' && data.payload.id.trim().length === 20 ? data.payload.id.trim() : false


      // Check for Optional Fields, at least one must be provided
      const protocol = typeof (data.payload.protocal) == 'string' && ['https', 'http'].indexOf(data.payload.protocal) ? data.payload.protocal : false
      const url = typeof (data.payload.url) == 'string' ? data.payload.url : false
      const method = typeof (data.payload.method) == 'string' && ['post', 'get', 'put', 'delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false
      const successCodes = typeof (data.payload.successCodes) == 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false
      const timeout = typeof (data.payload.timeout) == 'number' && data.payload.timeout % 1 === 0 && data.payload.timeout >= 1 && data.payload.timeout <= 5 ? data.payload.timeout : false

      // Look up the user
      if (id && protocol || url || method || successCodes || timeout) {
        // Read check file
        _data.read('checks', id, (err, data) => {
          // Get Token form the header 
          let token = typeof (data.headers.token) === 'string' ? data.headers.token : false

          // Verify token information
          if (!err && data) {
            handlers._tokens.checkToken(token, data.userPhone, (tokenValid) => {
              if (tokenValid) {
                // Make changes based on given data
                if (protocol) {
                  data.protocol = protocol
                }
                if (url) {
                  data.url = url
                }
                if (method) {
                  data.method = method
                }
                if (successCodes) {
                  data.successCodes = successCodes
                }
                if (timeout) {
                  data.timeout = timeout
                }

                // Store the new updates
                _data.update('checks', id, data, (err) => {
                  if (!err) {
                    callback(200)
                  } else {
                    console.log(err);
                    callback(500, { Error: 'Could not update the user' })
                  }
                })
              } else {
                callback(403, { Error: 'Token is not valid or has expired' })
              }
            })
          } else {
            callback(403, { Error: "User does not exist" })
          }
        })
      } else {
        callback(400, { Error: 'Need Valid Id Number and at Least one optional Field' })
      }
    },
    // Reuqires Id in the header and valid token for user who created check
    delete(data, callback) {
      const id = typeof (data.queryStringObject.id) === 'string' && data.queryStringObject.id.length === 20 ? data.queryStringObject.id.trim() : false

      if (id) {
        // Look the check
        _data.read('checks', id, (err, checkData) => {
          if (!err && checkData) {
            // Get Token form the header 
            let token = typeof (data.headers.token) === 'string' ? data.headers.token : false

            // Verify that the givens token is valid for the id number
            handlers._tokens.checkToken(token, checkData.userPhone, (tokenValid) => {
              if (tokenValid) {
                // Delete Check
                _data.delete('checks', id, (err) => {
                  if (!err) {
                    // Delete check from User
                    _data.read('users', checkData.userPhone, (err, userData) => {
                      if (!err && userData) {
                        const userChecks = typeof (userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : []
                        const checkPosition = userChecks.indexOf(id)

                        // Remove Delete check from list of user Checks
                        // Data is referntial so userChecks refers to a property of userData
                        // So when we update the user we are able to pass userData because we have modified userChecks
                        if (checkPosition > -1) {
                          userChecks.splice(checkPosition, 1)
                          // Update new data 
                          _data.update('users', checkData.userPhone, userData, (err) => {
                            if (!err) {
                              callback(200)
                            } else {
                              callback(500, { Error: 'Could not update user check list' })
                            }
                          })
                        } else {
                          callback(500, { Error: "Could not locate check data on list of User's checks" })
                        }
                      } else {
                        callback(500, { Error: 'Unable to locate user check' })
                      }
                    })
                  } else {
                    callback(500, { Error: 'Unable to delete check' })
                  }
                })
              } else {
                callback(403, { Error: 'Given token is not valid or may be expired' })
              }
            })
          } else {
            callback(404, { Error: 'Unable to locate check with given id' })
          }
        })
      } else {
        callback(400, { Error: 'Invalid id Number' })
      }
    }
  }
}

// Defineing a router
module.exports = router = {
  ping: handlers.ping,
  users: handlers.users,
  tokens: handlers.tokens,
  checks: handlers.checks
}