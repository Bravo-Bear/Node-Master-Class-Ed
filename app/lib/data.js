// File for storing and editing data

// Dependecies

const fs = require('fs')
const path = require('path')
const helpers = require('./helpers')
// Container for Module
module.exports = lib = {
  // Base Directory of the data folder

  baseDir: path.join(__dirname, '/../.data/'),
  // Write data to file
  create(dir, file, data, callback) {
    // Open the file for Writing 
    fs.open(lib.baseDir + dir + '/' + file + '.json', 'wx', (err, fileDescr) => {
      if (!err && fileDescr) {
        // Convert Data to string
        const stringData = JSON.stringify(data)

        // Write to file and close it
        fs.writeFile(fileDescr, stringData, (err) => {
          if (!err) {
            fs.close(fileDescr, (err) => {
              if (!err) {
                callback(false)
              } else {
                callback('Error closing new file')
              }
            })
          } else {
            callback('Error wrting to new file')
          }
        })
      } else {
        callback('Could not create new file, it may already exist')
      }
    })
  },
  read(dir, file, callback) {
    fs.readFile(lib.baseDir + dir + '/' + file + '.json', 'utf8', (err, data) => {
      if (!err && data) {
        const parsedData = helpers.parseJSON(data);
        callback(false, parsedData)
      } else {
        callback(err, data)
      }
    })
  },
  update(dir, file, data, callback) {
    // Open the file
    fs.open(lib.baseDir + dir + '/' + file + '.json', 'r+', (err, fileDescr) => {
      if (!err && fileDescr) {
        // Convert Data to string
        const stringData = JSON.stringify(data)
        // Write to file and close it
        fs.truncate(fileDescr, (err) => {
          if (!err) {
            //  Write to the file and close it
            fs.writeFile(fileDescr, stringData, (err) => {
              if (!err) {
                fs.close(fileDescr, (err) => {
                  if (!err) {
                    callback(false)
                  } else {
                    callback('Error Closing File')
                  }
                })
              } else {
                callback('Error Writing to File')
              }
            })
          } else {
            callback('Could not truncate file')
          }
        })
      } else {
        callback('Could not update file, it may already exist')
      }
    })
  },
  // Delete a file in a folder
  // Requieres the folder and the file that you want to delete
  delete(dir, file, callback) {
    // Unlink file 
    fs.unlink(lib.baseDir + dir + '/' + file + '.json', (err) => {
      if (!err) {
        callback(false)
      } else {
        callback(err)
      }
    })
  },
  // List all files in a reposistory
  // Requires the folder you want to list
  list(dir, callback) {
    fs.readdir(lib.baseDir + dir + '/', (err, data) => {
      if (!err && data && data.length > 0) {
        const trimmedFiles = []
        data.forEach(fileName => {
          trimmedFiles.push(fileName.replace('.json', ''))
        });
        callback(false, trimmedFiles)
      } else {
        callback(err, data)
      }
    })
  }
}