const ApiResource = require('./api_resource')
const PageableApiResource = require('./pageable_api_resource')
const Ftp = require('ftp')
const qs = require('qs')

/**
 * Class Video
 *
 * Implementation of Ustream's video API.
 *
 * @class
 * @link http://developers.Ustream.tv/broadcasting-api/channel.html
 */
class Video extends ApiResource {
  /**
   * Lists all videos on an account.
   *
   * @param {string} channelId - ID of a channel.
   * @param {Number} pageSize - The number of results to show per page.
   * @param {Number} page - The page to retrieve.
   *
   * @returns {Promise}
   */
  list (channelId, pageSize = 100, page = 1) {
    /** @var {{videos, paging}} res */
    return this.context.authRequest('get', `/channels/${channelId}/videos.json`,
      qs.stringify({pageSize, page}))
      .then((res) => {
        return Promise.resolve(new PageableApiResource(this.context, 'videos',
          res.videos, res.paging))
      })
  }

  /**
   * Get video fields, including title, description, url, etc.
   *
   * @param {Number} videoId - ID of existing video
   */
  get (videoId) {
    return this.context.authRequest('get', `/videos/${videoId}.json`)
      .then((res) => {
        return Promise.resolve(res.video)
      })
  }

  /**
   * Delete video from Ustream.
   *
   * @param {Number} videoId - ID of existing video
   */
  remove (videoId) {
    return this.context.authRequest('delete', `/videos/${videoId}.json`)
      .then((res) => {
        return Promise.resolve(res)
      })
  }

  /**
   * Check the status of an uploaded video.
   *
   * Possible returned statuses are:
   *    - initiated
   *    - transferred
   *    - queued
   *    - pending
   *    - transcoding
   *    - complete
   *    - error
   *
   * @param {Number} channelId
   * @param {Number} videoId
   */
  getStatus (channelId, videoId) {
    return this.context.authRequest('get',
      `/channels/${channelId}/uploads/${videoId}.json`)
  }

  /**
   * Uploads a video to Ustream.
   *
   * @param {Number} channelId
   * @param {{}} opts
   * @param {string} opts.title - (optional) Video title.
   * @param {string} opts.description - (optional) Video description.
   * @param {string} opts.protect - (optional) Protection level. Acceptable
   *  values are "public" or "private". Default value is "private".
   * @param {{originalname, stream}} file
   * @param {{stream}} file
   *
   * @return {Promise}
   */
  upload (channelId, file, opts) {
    const self = this
    let ext = file.originalname.substr(
      file.originalname.lastIndexOf('.') + 1)

    return this._initiateUpload(channelId, opts)
      .then((res) => {
        return self._ftpUpload(res.host, res.user, res.password, res.port,
          `${res.path}.${ext}`, file.stream)
          .then(() => {
            return self._completeUpload(channelId, res['videoId'], 'ready')
          })
      })
  }

  /**
   * Initiates a video upload.
   *
   * @param {Number} channelId - ID of a Ustream channel.
   * @param {{}} opts
   * @param {string} opts.title - (optional) Video title.
   * @param {string} opts.description - (optional) Video description.
   * @param {string} opts.protect - (optional) Protection level. Acceptable
   *  values are "public" or "private". Default value is "public".
   *
   * @return {Promise}
   *
   * @private
   */
  _initiateUpload (channelId, opts) {
    const params = qs.stringify({type: 'videoupload-ftp', ...opts})
    return this.context.authRequest('post',
      `/channels/${channelId}/uploads.json?type=videoupload-ftp`, params)
  }

  /**
   * Uploads video binary stream.
   *
   * The method _initiate upload must be executed immediately before this
   * method.
   *
   * @param {string} ftpHost - Remote host server.
   * @param {string} ftpUser - FTP username.
   * @param {string} ftpPass - FTP password.
   * @param {Number} ftpPort - FTP port.
   * @param {string} ftpDest - Destination on remote server.
   * @param {Stream} stream
   *
   * @return {Promise}
   *
   * @private
   */
  _ftpUpload (ftpHost, ftpUser, ftpPass, ftpPort, ftpDest, stream) {
    let ftp = new Ftp()

    return new Promise((resolve, reject) => {
      ftp.binary((err) => {
        if (err) {
          return reject(new Error('Failed to set FTP transfer type to' +
            'binary.'))
        }
      })

      ftp.on('ready', () => {
        ftp.put(stream, ftpDest, (err) => {
          ftp.end()

          if (err) {
            return reject(err)
          }

          return resolve()
        })
      })

      ftp.on('error', (err) => {
        return reject(err)
      })

      ftp.connect({
        host: `${ftpHost}`,
        port: ftpPort,
        user: ftpUser,
        password: ftpPass
      })
    })
  }

  /**
   * Signals that FTP file transfer is complete.
   *
   * Must be executed after _ftpUpload().
   *
   * @param {Number} channelId - ID of Ustream channel.
   * @param {Number} videoId - ID of Ustream video.
   * @param {string} status - Status of video. Default is "ready".
   *
   * @return {Promise}
   *
   * @private
   */
  _completeUpload (channelId, videoId, status) {
    status = (status !== null) ? status : 'ready'
    let payload = qs.stringify({status: status})

    return this.context.authRequest('put',
      `/channels/${channelId}/uploads/${videoId}.json`, payload)
      .then(() => {
        return Promise.resolve({channelId: channelId, videoId: videoId})
      })
  }

  /**
   * List all video metadata values
   *
   * @param {Number} videoId - ID of existing video.
   */
  listMetadata (videoId) {
    return this.context.authRequest('get', `/videos/${videoId}/custom-metadata.json`)
      .then((res) => {
        return Promise.resolve(res.metadata)
      })
  }

  /**
   * Set video metadata value
   * @param {Number} videoId - ID of existing video.
   * @param {Number} fieldId - ID of existing metadata field.
   * @param {*} value - Data to be stored in metadata field.
   */
  setMetadata (videoId, fieldId, value) {
    let payload = qs.stringify({
      value
    })

    return this.context.authRequest('put',
        `/videos/${videoId}/custom-metadata/${fieldId}.json`, payload)
      .then((res) => {
        return Promise.resolve(res)
      })
  }
}

module.exports = Video
