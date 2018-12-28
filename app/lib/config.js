// Create and export config file


// Containter for Enviornments
const enviornments = {
  // Stagin Object (defualt)
  staging: {
    httpPort: 3000,
    httpsPort: 3001,
    envName: 'staging',
    hashingSecret: 'thisIsASecret',
    maxChecks: 5,
    twilio: {
      accountSid: 'ACe05ed41f6252c61f872577600f214fd0',
      authToken: '6d2bd41178035bbd759c2d27e578aa49',
      fromPhone: '7864087385'
    }
  },
  production: {
    httpport: 5000,
    httpsPort: 5001,
    envName: 'production',
    hashingSecret: 'thisIsASecret',
    maxChecks: 5,
    twilio: {
      accountSid: '',
      authToken: '',
      fromPhone: ''
    }
  },
  balls: {
    port: 4999,
    envName: 'balls'
  }
}

// determine enviornment

const currentEnv = typeof (process.env.NODE_ENV) == 'string' ?
  process.env.NODE_ENV.toLocaleLowerCase() : ''

// Check if current Env is euql to existing enviornment

let enviornmentExports = typeof (enviornments[currentEnv]) == 'object' ?
  enviornments[currentEnv] : enviornments.staging

// Export
module.exports = enviornmentExports