/*
platform that offers a connection to a warmup4ie device.

this platform is inspired by the following code:
https://github.com/alex-0103/warmup4IE/blob/master/warmup4ie/warmup4ie.py

to setup this component, you need to register to warmup first.
see
https://my.warmup.com/login

Then add to your
configuration.yaml

climate:
  - platform: warmup4ie
    name: YOUR_DESCRIPTION
    username: YOUR_E_MAIL_ADDRESS
    password: YOUR_PASSWORD
    location: YOUR_LOCATION_NAME
    room: YOUR_ROOM_NAME

# the following issues are not yet implemented, since i have currently no need
# for them
# OPEN  - holiday mode still missing
#       - commands for setting/retrieving programmed times missing
*/

var debug = require('debug')('warmup4ie-lib');
var request = require('request');

const TOKEN_URL = 'https://api.warmup.com/apps/app/v1';
// const URL = 'https://apil.warmup.com/graphql';
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

var WarmupAccessToken = null;
var LocId;

module.exports = {
  Warmup4IE: Warmup4IE
};

/**
 * Warmup4IE - description
 *
 * @param  {type} options.user description
 * @param  {type} options.password description
 * @param  {type} options.location description
 * @param  {type} options.room description
 * @param  {type} options.target_temp description
 * @return {type}         description
 */

function Warmup4IE(options, callback) {
  // debug("Setting up Warmup4IE component", options);
  this._username = options.username;
  this._password = options.password;
  this._location_name = options.location;
  this._room_name = options.room;
  this._target_temperature = options.target_temp;
  this._refresh = options.refresh;
  this._duration = options.duration;
  this.room = [];

  this.LocId = null;
  this._room = null;
  this._current_temperature = 0;
  this._away = false;
  this._on = true;

  // debug("Setting up Warmup4IE component", this);
  this.setup_finished = false;
  _generate_access_token.call(this, function () {
    _getLocations.call(this, function (err, locations) {
      _getRooms.call(this, function (err, rooms) {
        callback(null, rooms);
      })
    }.bind(this));
  }.bind(this));

  setInterval(pollDevices.bind(this), this._refresh * 1000 / 2); // Poll every minute
}

function pollDevices() {
  // debug("Poll");
  _getRooms.call(this, function (err, rooms) {
  });
}

function _getRooms(callback) {
  // Update room/device data for the given room name.

  //
  // make sure the location is already configured
  if (!LocId || !WarmupAccessToken) {
    console.error("Missing LocId");
    callback(new Error("Missing LocId"));
  }

  var body = {
    "account": {
      "email": this._username,
      "token": WarmupAccessToken
    },
    "request": {
      "method": "getRooms",
      "locId": LocId
    }
  };

  // debug("_getRooms", JSON.stringify(body));
  // debug("_getRooms: URL", TOKEN_URL, "HEADER", HEADER, "body", body);
  request({
    method: 'POST',
    url: TOKEN_URL,
    timeout: 10000,
    strictSSL: false,
    headers: HEADER,
    body: JSON.stringify(body)
  }, function (err, response) {
    if (err || response.statusCode !== 200 || response.statusMessage !== "OK") {
      if (err) {
        console.error("Error: _getRooms", err);
        callback(err);
      } else {
        console.error("Error ", response.statusCode);
        callback(new Error("HTTP Error:", response.statusCode));
      }
    } else {
      var json;
      //    console.log(response.body);
      try {
        json = JSON.parse(response.body);
      } catch (ex) {
        //                console.error(ex);
        console.error(response.statusCode, response.statusMessage);
        console.error(response.body);
        //                console.error(response);
        callback(new Error("JSON Error:", response.body));
      }
      if (json) {
        debug("_getRooms", json.response.rooms);
        if (json.response.rooms) {
          var rooms = json.response.rooms;
          rooms.forEach(function (room) {
            // debug("diff %s = ", room.roomId, JSON.stringify(diff(this.room[room.roomId], room)));
            this.room[room.roomId] = room;
          }.bind(this));
          callback(null, rooms);
        } else {
          // debug("Response", JSON.stringify(json.response, null, 4));
          callback(new Error("JSON Error:", response.body));
        }
      }
    }
  }.bind(this));


}
function _generate_access_token(callback) {
  // retrieve access token from server
  // debug("_generate_access_token", this);
  var body = {
    'request': {
      'email': this._username,
      'password': this._password,
      'method': 'userLogin',
      'appId': 'WARMUP-APP-V001'
    }
  };

  // debug("URL", TOKEN_URL, "HEADER", HEADER, "body", body);
  request({
    method: 'POST',
    url: TOKEN_URL,
    timeout: 10000,
    strictSSL: false,
    headers: HEADER,
    body: JSON.stringify(body)
  }, function (err, response) {
    if (err || response.statusCode !== 200 || response.statusMessage !== "OK") {
      if (err) {
        console.error("Error: _generate_access_token", err);
        callback(err);
      } else {
        console.error("Error ", response.statusCode);
        callback(new Error("HTTP Error:", response.statusCode));
      }
    } else {
      var json;
      //    console.log(response.body);
      try {
        json = JSON.parse(response.body);
      } catch (ex) {
        //                console.error(ex);
        console.error(response.statusCode, response.statusMessage);
        console.error(response.body);
        //                console.error(response);
        callback(new Error("JSON Error:", response.body));
      }
      if (json) {
        debug("_generate_access_token ", response.body, json.response.token);
        WarmupAccessToken = json.response.token;
        callback(null);
      }
    }
  });
}

function _getLocations(callback) {
  // retrieve location ID that corrresponds to this._location_name
  // make sure we have an accessToken
  if (!WarmupAccessToken) {
    console.error("Missing access token.");
    callback(new Error("Missing access token."));
  }
  var body = {
    "account": {
      "email": this._username,
      "token": WarmupAccessToken
    },
    "request": {
      "method": "getLocations"
    }
  };

  // debug("_getLocations: URL", TOKEN_URL, "HEADER", HEADER, "body", body);
  request({
    method: 'POST',
    url: TOKEN_URL,
    timeout: 10000,
    strictSSL: false,
    headers: HEADER,
    body: JSON.stringify(body)
  }, function (err, response) {
    if (err || response.statusCode !== 200 || response.statusMessage !== "OK") {
      if (err) {
        console.error("Error: _generate_access_token", err);
        callback(err);
      } else {
        console.error("Error ", response.statusCode);
        callback(new Error("HTTP Error:", response.statusCode));
      }
    } else {
      var json;
      //    console.log(response.body);
      try {
        json = JSON.parse(response.body);
      } catch (ex) {
        //                console.error(ex);
        console.error(response.statusCode, response.statusMessage);
        console.error(response.body);
        //                console.error(response);
        callback(new Error("JSON Error:", response.body));
      }
      if (json) {
        debug("_getLocations", JSON.stringify(json, null, 4), json.response.locations[0].id);
        LocId = json.response.locations[0].id;
        callback(null);
      }
    }
  });
}

Warmup4IE.prototype.setTargetTemperature = function (roomId, value, callback) {
  // method: "setOverride", rooms: ["$device.deviceNetworkId"], type: 3, temp: getBoostTempValue(), until: getBoostEndTime()
  var oldDateObj = new Date();
  var today = new Date(oldDateObj.getTime() + this._duration * 60000);
  var until = ("00" + today.getHours()).slice(-2) + ":" + ("00" + today.getMinutes()).slice(-2);
  var body = {
    "account": {
      "email": this._username,
      "token": WarmupAccessToken
    },
    "request": {
      "method": "setOverride",
      "rooms": [roomId],
      "type": 3,
      "temp": parseInt(value * 10),
      "until": until
    }
  };
  // {"runMode":"override","overrideTemp":190,"overrideDur":9999}
  debug("setTargetTemperature", JSON.stringify(body));
  this.room[roomId] = null; // clear cache
  request({
    method: 'POST',
    url: TOKEN_URL,
    timeout: 10000,
    strictSSL: false,
    headers: HEADER,
    body: JSON.stringify(body)
  }, function (err, response) {
    if (err || response.statusCode !== 200 || response.statusMessage !== "OK") {
      if (err) {
        console.error("Error: setTargetTemperature", err);
        callback(err);
      } else {
        console.error("Error ", response.statusCode);
        callback(new Error("HTTP Error:", response.statusCode));
      }
    } else {
      var json;
      //    console.log(response.body);
      try {
        json = JSON.parse(response.body);
      } catch (ex) {
        //                console.error(ex);
        console.error(response.statusCode, response.statusMessage);
        console.error(response.body);
        //                console.error(response);
        callback(new Error("JSON Error:", response.body));
      }
      if (json) {
        debug("Response", JSON.stringify(json, null, 4));
        // LocId = json.response.locations[0].id;
        callback(null);
      }
    }
  });
};


Warmup4IE.prototype.setRoomAuto = function (roomId, callback) {
  // set device to automatic mode
  // make sure the room/device is already configured
  var body = {
    "account": {
      "email": this._username,
      "token": WarmupAccessToken
    },
    "request": {
      "method": "setProgramme",
      "roomId": roomId,
      "roomMode": "prog"
    }
  };

  this.room[roomId] = null; // clear cache
  request({
    method: 'POST',
    url: TOKEN_URL,
    timeout: 10000,
    strictSSL: false,
    headers: HEADER,
    body: JSON.stringify(body)
  }, function (err, response) {
    if (err || response.statusCode !== 200 || response.statusMessage !== "OK") {
      if (err) {
        console.error("Error: setRoomAuto", err);
        callback(err);
      } else {
        console.error("Error ", response.statusCode);
        callback(new Error("HTTP Error:", response.statusCode));
      }
    } else {
      var json;
      //    console.log(response.body);
      try {
        json = JSON.parse(response.body);
      } catch (ex) {
        //                console.error(ex);
        console.error(response.statusCode, response.statusMessage);
        console.error(response.body);
        //                console.error(response);
        callback(new Error("JSON Error:", response.body));
      }
      if (json) {
        debug("Response", JSON.stringify(json, null, 4));
        // LocId = json.response.locations[0].id;
        callback(null);
      }
    }
  });
};

Warmup4IE.prototype.setRoomOverRide = function (roomId, callback) {
  // set device to manual mode
  // make sure the room/device is already configured

  // method: "setOverride", rooms: ["$device.deviceNetworkId"], type: 3, temp: getBoostTempValue(), until: getBoostEndTime()

  var body = {
    "account": {
      "email": this._username,
      "token": WarmupAccessToken
    },
    "request": {
      "method": "setProgramme",
      "roomId": roomId,
      "roomMode": "override"
    }
  };

  // debug("setRoomOn", JSON.stringify(body));
  this.room[roomId] = null; // clear cache
  request({
    method: 'POST',
    url: TOKEN_URL,
    timeout: 10000,
    strictSSL: false,
    headers: HEADER,
    body: JSON.stringify(body)
  }, function (err, response) {
    if (err || response.statusCode !== 200 || response.statusMessage !== "OK") {
      if (err) {
        console.error("Error: setRoomOn", err);
        callback(err);
      } else {
        console.error("Error ", response.statusCode);
        callback(new Error("HTTP Error:", response.statusCode));
      }
    } else {
      var json;
      //    console.log(response.body);
      try {
        json = JSON.parse(response.body);
      } catch (ex) {
        //                console.error(ex);
        console.error(response.statusCode, response.statusMessage);
        console.error(response.body);
        //                console.error(response);
        callback(new Error("JSON Error:", response.body));
      }
      if (json) {
        debug("Response", JSON.stringify(json, null, 4));
        // LocId = json.response.locations[0].id;
        callback(null);
      }
    }
  });

};

Warmup4IE.prototype.setRoomFixed = function (roomId, callback) {
  // set device to manual mode
  // make sure the room/device is already configured

  // method: "setOverride", rooms: ["$device.deviceNetworkId"], type: 3, temp: getBoostTempValue(), until: getBoostEndTime()

  var body = {
    "account": {
      "email": this._username,
      "token": WarmupAccessToken
    },
    "request": {
      "method": "setProgramme",
      "roomId": roomId,
      "roomMode": "fixed"
    }
  };

  // debug("setRoomOn", JSON.stringify(body));
  this.room[roomId] = null; // clear cache
  request({
    method: 'POST',
    url: TOKEN_URL,
    timeout: 10000,
    strictSSL: false,
    headers: HEADER,
    body: JSON.stringify(body)
  }, function (err, response) {
    if (err || response.statusCode !== 200 || response.statusMessage !== "OK") {
      if (err) {
        console.error("Error: setRoomOn", err);
        callback(err);
      } else {
        console.error("Error ", response.statusCode);
        callback(new Error("HTTP Error:", response.statusCode));
      }
    } else {
      var json;
      //    console.log(response.body);
      try {
        json = JSON.parse(response.body);
      } catch (ex) {
        //                console.error(ex);
        console.error(response.statusCode, response.statusMessage);
        console.error(response.body);
        //                console.error(response);
        callback(new Error("JSON Error:", response.body));
      }
      if (json) {
        debug("Response", JSON.stringify(json, null, 4));
        // LocId = json.response.locations[0].id;
        callback(null);
      }
    }
  });


};

Warmup4IE.prototype.setRoomOff = function (roomId, callback) {
  //  turn off device
  // make sure the room/device is already configured
  var body = {
    "account": {
      "email": this._username,
      "token": WarmupAccessToken
    },
    "request": {
      "method": "setModes",
      "values": {
        "holEnd": "-",
        "fixedTemp": "",
        "holStart": "-",
        "geoMode": "0",
        "holTemp": "-",
        "locId": LocId,
        "locMode": "off"
      }
    }
  };

  // debug("setRoomOff", JSON.stringify(body));
  this.room[roomId] = null; // clear cache
  request({
    method: 'POST',
    url: TOKEN_URL,
    timeout: 10000,
    strictSSL: false,
    headers: HEADER,
    body: JSON.stringify(body)
  }, function (err, response) {
    if (err || response.statusCode !== 200 || response.statusMessage !== "OK") {
      if (err) {
        console.error("Error: setRoomOff", err);
        callback(err);
      } else {
        console.error("Error ", response.statusCode);
        callback(new Error("HTTP Error:", response.statusCode));
      }
    } else {
      var json;
      //    console.log(response.body);
      try {
        json = JSON.parse(response.body);
      } catch (ex) {
        //                console.error(ex);
        console.error(response.statusCode, response.statusMessage);
        console.error(response.body);
        //                console.error(response);
        callback(new Error("JSON Error:", response.body));
      }
      if (json) {
        debug("Response", JSON.stringify(json, null, 4));
        // LocId = json.response.locations[0].id;
        callback(null);
      }
    }
  });
};

function isEmptyObject(obj) {
  var name;
  for (name in obj) {
    return false;
  }
  return true;
}

function diff(obj1, obj2) {
  var result = {};
  var change;
  for (var key in obj1) {
    if (typeof obj2[key] === 'object' && typeof obj1[key] === 'object') {
      change = diff(obj1[key], obj2[key]);
      if (isEmptyObject(change) === false) {
        result[key] = change;
      }
    } else if (obj2[key] !== obj1[key]) {
      result[key] = obj2[key];
    }
  }
  return result;
}
