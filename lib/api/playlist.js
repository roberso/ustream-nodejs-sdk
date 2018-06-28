const ApiResource = require('./api_resource')
const PageableApiResource = require('./pageable_api_resource')
const qs = require('qs')

/**
 * @class Channel
 */
class Playlist extends ApiResource {
  /**
   * Retrieves flag if playlist is available for a specific channel.
   *
   * @param {Number}    channelId
   *
   * @returns {*}
   */
  isEnabled(channelId) {
    return new Promise((resolve, reject) => {
      this.context.authRequest('get', `/channels/${channelId}/settings/playlists.json`).then((res) => {
        resolve(res.is_enabled)
      }).catch((err) => {
        reject(err)
      })
    })
  }

  /**
   * Lists all Playlists on an channel.
   *
   * @param {Number} pageSize - The number of results to show per page.
   * @param {Number} page     - The page to retrieve.
   * @returns {Promise}
   */
  list(channelId, pageSize = 50, page = 1, filter = 'include_empty') {
    return new Promise((resolve, reject) => {
      /**
       * @var {{channels, paging}} res
       */
      this.context.authRequest('get', `/channels/${channelId}/playlists.json?pagesize=${pageSize}&page=${page}&filter=${filter}`)
        .then((res) => {
          resolve(new PageableApiResource(this.context, 'channels', res.playlists, res.paging))
        })
        .catch((err) => {
          try {
            if (err.response.status === 404) {
              resolve(new PageableApiResource(this.context, 'channels', {}, {
                item_count: 0,
                page_count: 0
              }))
            }
            reject(err)
          } catch (error) {
            reject(error)
          }
        })
    })
  }
}

  /**
   * Creates a new playlist.
   *
   * @param {string}    title - The title of the playlist.
   * @param {Number}    channelId
   * @param {{}}        opts
   * @param {Number}    opts.is_enabled - Whether the playlist is enabled or not. Values: 1 (enabled), 0 (disabled). (1 by default)
   *
   * @returns {*}
   */
  create (channelId, title, opts = {}) {
    opts.title = title
    return new Promise((resolve, reject) => {
      this.context.authRequest('post', `/channels/${channelId}/playlists.json`, qs.stringify(opts)).then((res) => {
        resolve(res.channel)
      }).catch((err) => {
        reject(err)
      })
    })
  }

module.exports = Playlist