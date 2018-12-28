// Libary for storing and loging requests

// Dependencies
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')


module.exports = {
  baseDir: path.join(__dirname, '/../.logs/'),
  // Append string to a file, or create a file if it doesn't exist
  append(file, string, callback) {
    fs.open(this.baseDir + file + '.log', 'a', (err, fileDescr) => {
      if (!err && fileDescr) {
        // APpend to the file and close it
        fs.appendFile(fileDescr, string + '\n', (err) => {
          if (!err) {
            fs.close(fileDescr, (err) => {
              if (!err) {
                callback(false)
              } else {
                callback('Error: Unable to close file')
              }
            })
          } else {
            callback('Error: Unable to append file')
          }
        })
      } else {
        callback('Could not open file for appending')
      }
    })
  },
  list(includeCompressed, callback) {
    fs.readdir(this.baseDir, (err, data) => {
      if (!err && data && data.length > 0) {
        const trimmedFileNames = []
        data.forEach(fileName => {
          // Add the .log to files
          if (fileName.indexOf('.log') > -1) {
            trimmedFileNames.push(fileName.replace('.log', ''))
          }

          // Add on the .gz files
          if (fileName.indexOf('.gz.b64') > -1 && includeCompressed) {
            trimmedFileNames.push(fileName.replace('.gz.b64', ''))
          }
          callback(false, trimmedFileNames)
        });
      } else {
        callback(err, data)
      }
    })
  },
  // Compress the contents of one .olog file into a .gz.b64 file within the same folder
  compress(logId, newField, callback) {
    const sourseFile = logId + '.log'
    const destFile = newField + '.gz.b64'

    // Read the sourse file
    fs.readFile(this.baseDir + sourseFile, 'utf8', (err, inputString) => {
      if (!err && inputString) {
        // compress the data uding gzip
        zlib.gzip(inputString, (err, buffer) => {
          if (!err && buffer) {
            fs.open(this.baseDir + destFile, 'wx', (err, fileDescr) => {
              if (!err && fileDescr) {
                fs.writeFile(fileDescr, buffer.toString('base64'), (err) => {
                  if (!err) {
                    fs.close(fileDescr, (err) => {
                      if (!err) {
                        callback(false)
                      } else {
                        callback(err)
                      }
                    })
                  } else {
                    callback(err)
                  }
                })
              } else {
                callback(err)
              }
            })
          } else {
            callback(err)
          }
        })
      } else {
        callback(err)
      }
    })
  },
  // Decompress the contents of a .gz.b64 file
  decompress(fileId, callback) {
    const fileName = fileId + '.gz.b64'
    fs.readFile(this.baseDir + fileName, 'utf8', (err, str) => {
      if (!err && str) {
        // decompress the data
        const inputBuffer = Buffer.from(str, 'base64')
        zlib.unzip(inputBuffer, (err, outputBuffer) => {
          if (!err && outputBuffer) {
            // callBack
            const str = outputBuffer.toString()
            callback(false, str)
          } else {
            callback(err)
          }
        })
      } else {
        callback(err)
      }
    })
  },
  // Truncating a log file (remove the stuff in it once it has been compressed)
  truncate(logId, callback) {
    fs.truncate(this.baseDir + logId + '.log', 0, (err) => {
      if (!err) {
        callback(false)
      } else {
        callback(err)
      }
    })
  }
}