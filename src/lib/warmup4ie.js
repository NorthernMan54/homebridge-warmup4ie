const debug = require('debug')('warmup4ie-lib');
const request = require('request');

const TOKEN_URL = 'https://api.warmup.com/apps/app/v1';
const APP_TOKEN = 'M=;He<Xtg"$}4N%5k{$:PD+WA"]D<;#PriteY|VTuA>_iyhs+vA"4lic{6-LqNM:';
const HEADER = {
  'user-agent': 'WARMUP_APP',
  'accept-encoding': 'br, gzip, deflate',
  'accept': '*/*',
  'Connection': 'keep-alive',
  'content-type': 'application/json',
  'app-token': APP_TOKEN,
  'app-version': '1.8.1',
  'accept-language': 'de-de'
};

let WarmupAccessToken = null;
let LocId = null;

class Warmup4IE {
  constructor(options, callback) {
    this._username = options.username;
    this._password = options.password;
    this._location_name = options.location;
    this._room_name = options.room;
    this._target_temperature = options.target_temp;
    this._refresh = options.refresh;
    this._duration = options.duration;
    this.room = {};

    this.setup_finished = false;

    this._generateAccessToken(() => {
      this._getLocations(() => {
        this._getRooms((err, rooms) => {
          callback(null, rooms);
        });
      });
    });

    setInterval(this.pollDevices.bind(this), (this._refresh * 1000) / 2);
  }

  pollDevices() {
    this._getRooms(() => { });
  }

  _sendRequest(body, callback) {
    request({
      method: 'POST',
      url: TOKEN_URL,
      timeout: 10000,
      strictSSL: false,
      headers: HEADER,
      body: JSON.stringify(body)
    }, (err, response) => {
      if (err || response.statusCode !== 200) {
        const error = err || new Error(`HTTP Error: ${response.statusCode}`);
        console.error(error);
        return callback(error);
      }

      try {
        const json = JSON.parse(response.body);
        callback(null, json);
      } catch (ex) {
        console.error('JSON Parsing Error:', ex);
        callback(ex);
      }
    });
  }

  _generateAccessToken(callback) {
    const body = {
      request: {
        email: this._username,
        password: this._password,
        method: 'userLogin',
        appId: 'WARMUP-APP-V001'
      }
    };

    this._sendRequest(body, (err, json) => {
      if (err) return callback(err);

      WarmupAccessToken = json.response.token;
      callback(null);
    });
  }

  _getLocations(callback) {
    if (!WarmupAccessToken) return callback(new Error('Missing access token.'));

    const body = {
      account: {
        email: this._username,
        token: WarmupAccessToken
      },
      request: {
        method: 'getLocations'
      }
    };

    this._sendRequest(body, (err, json) => {
      if (err) return callback(err);

      LocId = json.response.locations[0]?.id;
      callback(null);
    });
  }

  _getRooms(callback) {
    if (!LocId || !WarmupAccessToken) return callback(new Error('Missing LocId or AccessToken.'));

    const body = {
      account: {
        email: this._username,
        token: WarmupAccessToken
      },
      request: {
        method: 'getRooms',
        locId: LocId
      }
    };

    this._sendRequest(body, (err, json) => {
      if (err) return callback(err);

      const rooms = json.response.rooms || [];
      rooms.forEach(room => {
        this.room[room.roomId] = room;
      });
      callback(null, rooms);
    });
  }

  _setRoomMode(roomId, mode, callback) {
    const body = {
      account: {
        email: this._username,
        token: WarmupAccessToken
      },
      request: {
        method: 'setProgramme',
        roomId,
        roomMode: mode
      }
    };

    this.room[roomId] = null;
    this._sendRequest(body, callback);
  }

  setTargetTemperature(roomId, value, callback) {
    const until = new Date(Date.now() + this._duration * 60000).toISOString().slice(11, 16);
    const body = {
      account: {
        email: this._username,
        token: WarmupAccessToken
      },
      request: {
        method: 'setOverride',
        rooms: [roomId],
        type: 3,
        temp: parseInt(value * 10, 10),
        until
      }
    };

    this.room[roomId] = null;
    this._sendRequest(body, callback);
  }

  setRoomAuto(roomId, callback) {
    this._setRoomMode(roomId, 'prog', callback);
  }

  setRoomOverride(roomId, callback) {
    this._setRoomMode(roomId, 'override', callback);
  }

  setRoomFixed(roomId, callback) {
    this._setRoomMode(roomId, 'fixed', callback);
  }

  setRoomOff(roomId, callback) {
    const body = {
      account: {
        email: this._username,
        token: WarmupAccessToken
      },
      request: {
        method: 'setModes',
        values: {
          locId: LocId,
          locMode: 'off'
        }
      }
    };

    this.room[roomId] = null;
    this._sendRequest(body, callback);
  }
}

module.exports = { Warmup4IE };
