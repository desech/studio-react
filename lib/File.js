const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

module.exports = {
  readFolder (folder) {
    const results = []
    const entries = fs.readdirSync(folder, { withFileTypes: true })
    for (const entry of entries) {
      const data = this.readFolderEntry(entry, folder)
      results.push(data)
    }
    return results
  },

  readFolderEntry (entry, folder) {
    const absPath = path.resolve(folder, entry.name)
    return {
      name: entry.name,
      path: this.sanitizeFile(absPath),
      type: entry.isDirectory() ? 'folder' : 'file',
      extension: entry.isDirectory() ? '' : path.extname(entry.name).substring(1),
      children: entry.isDirectory() ? this.readFolder(absPath) : []
    }
  },

  sanitizeFile (absPath) {
    // fix windows separator
    return absPath.replace(/\\/g, '/')
  },

  async syncFolder (files, srcFolder, destFolder, checkIdentical = true) {
    for (const file of files) {
      await this.syncFile(file, srcFolder, destFolder, checkIdentical)
    }
  },

  async syncFile (file, srcFolder, destFolder, checkIdentical) {
    const destFile = file.path.replace(srcFolder, destFolder)
    if (file.type === 'folder' && !fs.existsSync(destFile)) {
      fs.mkdirSync(destFile)
    } else if (file.type === 'file' && (!fs.existsSync(destFile) ||
      (checkIdentical && !await this.areFilesIdentical(file.path, destFile)))) {
      fs.copyFileSync(file.path, destFile)
    }
    if (file.children) {
      await this.syncFolder(file.children, srcFolder, destFolder, checkIdentical)
    }
  },

  async areFilesIdentical (file1, file2) {
    const hash1 = await this.getFileHash(file1)
    const hash2 = await this.getFileHash(file2)
    return (hash1 === hash2)
  },

  getFileHash (file) {
    return new Promise((resolve, reject) => {
      try {
        const hash = crypto.createHash('sha256')
        const input = fs.createReadStream(file)
        input.on('readable', () => {
          const data = input.read()
          if (data) {
            hash.update(data)
          } else {
            return resolve(hash.digest('hex'))
          }
        }).on('error', error => {
          reject(error)
        })
      } catch (error) {
        reject(error)
      }
    })
  },

  writeToFile (file, content) {
    // make sure the dir exists
    this.createMissingDir(path.dirname(file))
    fs.writeFileSync(file, content)
  },

  createMissingDir (dir) {
    // create sub dirs too
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  },

  readFile (file) {
    return fs.readFileSync(file).toString()
  }
}
