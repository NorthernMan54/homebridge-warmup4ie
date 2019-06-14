/*
platform that offers a connection to a warmup4ie device.

this platform is inspired by the following code:
https://github.com/alyc100/SmartThingsPublic/tree/master/devicetypes/alyc100/\
warmup-4ie.src

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

var debug = require('debug')('warmup4ie');
var request = require('request');

const TOKEN_URL = 'https://api.warmup.com/apps/app/v1';
const URL = 'https://apil.warmup.com/graphql';
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
const RUN_MODE = {
  0: 'off',
  1: 'prog',
  3: 'fixed',
  4: 'frost',
  5: 'away'
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

function Warmup4IE(options) {
  debug("Setting up Warmup4IE component")
  this._user = options.user;
  this._password = options.password;
  this._location_name = options.location
  this._room_name = options.room
  this._target_temperature = options.target_temp

  this._warmup_access_token = None
  this._loc_id = None
  this._room = None
  this._current_temperature = 0
  this._away = False
  this._on = True

  this.setup_finished = False
  var token_ok = this._generate_access_token()

  var location_ok = this._get_locations()

  var room_ok = this.update_room()
  if (token_ok && location_ok && room_ok) {
    this.setup_finished = True
  }

  function get_run_mode(self):
  // return current mode, e.g. 'off', 'fixed', 'prog'.
  if this._room is None:
    return 'off'
  return this.RUN_MODE[this._room['runModeInt']]

  function update_room(self):
  // Update room/device data for the given room name.

  //
  // make sure the location is already configured
  if this._loc_id is None or\
  this._warmup_access_token is None or\
  this._room_name is None:
    return False

  body = {
    "query": "query QUERY{ user{ currentLocation: location { id name rooms{ id roomName runModeInt targetTemp currentTemp thermostat4ies {minTemp maxTemp}}  }}  } "
  }
  header_with_token = this.HEADER.copy()
  header_with_token['warmup-authorization'] = str(this._warmup_access_token)
  response = requests.post(url = this.URL, headers = header_with_token, json = body)
  // check if request was acceppted and if request was successful
  if response.status_code != 200 or\
  response.json()['status'] != 'success':
    debug("updating new room failed, %s", response);
  return False
  // extract and store roomId for later use
  rooms = response.json()['data']['user']['currentLocation']['rooms']
  room_updated = False
  for room in rooms:
    if room['roomName'] == this._room_name:
    this._room = room
  debug("Successfully updated data for room '%s' "
    "with ID %s", this._room['roomName'],
    this._room['id']);
  room_updated = True
  break
  if not room_updated:
    return False
  // update temperatures values
  this._target_temperature = int(this._room['targetTemp']) / 10
  this._target_temperature_low = int(this._room['thermostat4ies'][0]['minTemp']) / 10
  this._target_temperature_high = int(this._room['thermostat4ies'][0]['maxTemp']) / 10
  this._current_temperature = int(this._room['currentTemp']) / 10
  return True ''
  '

  function update_room(self):
  // Update room/device data for the given room name.

  //
  // make sure the location is already configured
  if this._loc_id is None or\
  this._warmup_access_token is None or\
  this._room_name is None:
    return False

  body = {
    "account": {
      "email": this._user,
      "token": this._warmup_access_token
    },
    "request": {
      "method": "getRooms",
      "locId": this._loc_id
    }
  }
  response = requests.post(url = this.TOKEN_URL, headers = this.HEADER, json = body)
  // check if request was acceppted and if request was successful
  if response.status_code != 200 or\
  response.json()['status']['result'] != 'success':
    debug("updating room failed, %s", response);
  return False
  // extract and store roomId for later use
  rooms = response.json()['response']['rooms']
  room_updated = False
  for room in rooms:
    if room['roomName'] == this._room_name:
    this._room = room
  debug("Successfully updated data for room '%s' "
    "with ID %s", this._room['roomName'],
    this._room['roomId'])
  room_updated = True
  break
  if not room_updated:
    return False
  // update temperatures values
  this._target_temperature = int(this._room['targetTemp']) / 10
  this._target_temperature_low = int(this._room['minTemp']) / 10
  this._target_temperature_high = int(this._room['maxTemp']) / 10
  this._current_temperature = int(this._room['currentTemp']) / 10
  return True ''
  '

  function get_target_temmperature(self):
  // return target temperature
  return this._target_temperature

  function get_current_temmperature(self):
  // return currrent temperature
  return this._current_temperature

  function get_target_temperature_low(self):
  // return minimum temperature
  return this._target_temperature_low

  function get_target_temperature_high(self):
  // return maximum temperature
  return this._target_temperature_high

  function _generate_access_token(callback) {
    // retrieve access token from server
    body = {
      'request': {
        'email': this._user,
        'password': this._password,
        'method': 'userLogin',
        'appId': 'WARMUP-APP-V001'
      }
    };

    request({
      method: 'POST',
      url: this.TOKEN_URL,
      timeout: 1000,
      strictSSL: false,
      headers: this.HEADER,
      body: body
    }, function(err, response) {
      if (err || response.statusCode != 200 || response.statusMessage != "OK") {
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
          console.log("Response ", response.body);
          this._warmup_access_token = json.token;
          callback(null);
        }
      }
    });

    /*
    response = requests.post(url = this.TOKEN_URL, headers = this.HEADER, json = body)
    // check if request was acceppted and if request was successful
    if response.status_code != 200 or\
    response.json()['status']['result'] != 'success':
      debug("generating AccessToken failed, %s", response)
    return False
    // extract and store access token for later use
    this._warmup_access_token = response.json()['response']['token']
    return True
    */
  }

  function _get_locations(callback) {
  // retrieve location ID that corrresponds to this._location_name
  // make sure we have an accessToken
  if (!this._warmup_access_token) {
    console.error("Missing access token.");
    callback(new Error("Missing access token."));
  }
    return False
  body = {
    "account": {
      "email": this._user,
      "token": this._warmup_access_token
    },
    "request": {
      "method": "getLocations"
    }
  }

  request({
    method: 'POST',
    url: this.TOKEN_URL,
    timeout: 1000,
    strictSSL: false,
    headers: this.HEADER,
    body: body
  }, function(err, response) {
    if (err || response.statusCode != 200 || response.statusMessage != "OK") {
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
        console.log("Response ", response.body);
        this._warmup_access_token = json.token;
        callback(null);
      }
    }
  });
  /*
  response = requests.post(url = this.TOKEN_URL, headers = this.HEADER, json = body)
  // check if request was acceppted and if request was successful
  if response.status_code != 200 or\
  response.json()['status']['result'] != 'success':
    debug("initialising failed, %s", response)
  return False
  // extract and store locationId for later use
  locations = response.json()['response']['locations']
  for loc in locations:
    if loc['name'] == this._location_name:
    this._loc_id = loc['id']
  debug(
    "Successfully fetched location ID %s for location '%s'",
    this._loc_id, this._location_name)
  break
  if this._loc_id is None:
    return False
  return True
  */
}

  function set_new_temperature(self, new_temperature):
  // set new target temperature
  // make sure the room/device is already configured
  if this._room is None or this._warmup_access_token is None:
    return
  body = {
    "account": {
      "email": this._user,
      "token": this._warmup_access_token
    },
    "request": {
      "method": "setProgramme",
      "roomId": this._room['id'],
      "roomMode": "fixed",
      "fixed": {
        "fixedTemp": "{:03d}".format(int(new_temperature * 10))
      }
    }
  }
  response = requests.post(url = this.TOKEN_URL, headers = this.HEADER, json = body)
  // check if request was acceppted and if request was successful
  if response.status_code != 200 or\
  response.json()['status']['result'] != 'success':
    debug(
      "Setting new target temperature failed, %s", response)
  return
  response_temp = response.json()["message"]["targetTemp"]
  if new_temperature != int(response_temp) / 10:
    debug("Server declined to set new target temperature "
      "to %.1f°C; response from server: '%s'",
      new_temperature, response.text)
  return
  this._target_temperature = new_temperature
  debug("Successfully set new target temperature to %.1f°C; "
    "response from server: '%s'",
    this._target_temperature, response.text)

  function set_temperature_to_auto(self):
  // set device to automatic mode
  // make sure the room/device is already configured
  if this._room is None or this._warmup_access_token is None:
    return
  body = {
    "account": {
      "email": this._user,
      "token": this._warmup_access_token
    },
    "request": {
      "method": "setProgramme",
      "roomId": this._room['id'],
      "roomMode": "prog"
    }
  }
  response = requests.post(url = this.TOKEN_URL, headers = this.HEADER, json = body)
  // check if request was acceppted and if request was successful
  if response.status_code != 200 or\
  response.json()['status']['result'] != 'success':
    debug(
      "Setting new target temperature to auto failed, %s", response)
  return
  debug("Successfully set new target temperature to auto, "
    "response from server: '%s'", response.text)

  function set_temperature_to_manual(self):
  // set device to manual mode
  // make sure the room/device is already configured
  if this._room is None or this._warmup_access_token is None:
    return
  body = {
    "account": {
      "email": this._user,
      "token": this._warmup_access_token
    },
    "request": {
      "method": "setProgramme",
      "roomId": this._room['id'],
      "roomMode": "fixed"
    }
  }
  response = requests.post(url = this.TOKEN_URL, headers = this.HEADER, json = body)
  // check if request was acceppted and if request was successful
  if response.status_code != 200 or\
  response.json()['status']['result'] != 'success':
    debug(
      "Setting new target temperature to "
      "manual failed, %s", response)
  return

  debug("Successfully set new target temperature to manual, "
    "response from server: '%s'", response.text)

  function set_location_to_frost(self):
  // set device to frost protection mode
  // make sure the room/device is already configured
  if this._loc_id is None or this._warmup_access_token is None:
    return
  body = {
    "account": {
      "email": this._user,
      "token": this._warmup_access_token
    },
    "request": {
      "method": "setModes",
      "values": {
        "holEnd": "-",
        "fixedTemp": "",
        "holStart": "-",
        "geoMode": "0",
        "holTemp": "-",
        "locId": this._loc_id,
        "locMode": "frost"
      }
    }
  }
  response = requests.post(url = this.TOKEN_URL, headers = this.HEADER, json = body)
  // check if request was acceppted and if request was successful
  if response.status_code != 200 or\
  response.json()['status']['result'] != 'success':
    debug(
      "Setting location to frost protection failed, %s", response)
  return
  debug("Successfully set location to frost protection, response "
    "from server: '%s'", response.text)

  function set_location_to_off(self):
  //  turn off device
  // make sure the room/device is already configured
  if this._loc_id is None or this._warmup_access_token is None:
    return
  body = {
    "account": {
      "email": this._user,
      "token": this._warmup_access_token
    },
    "request": {
      "method": "setModes",
      "values": {
        "holEnd": "-",
        "fixedTemp": "",
        "holStart": "-",
        "geoMode": "0",
        "holTemp": "-",
        "locId": this._loc_id,
        "locMode": "off"
      }
    }
  }
  response = requests.post(url = this.TOKEN_URL, headers = this.HEADER, json = body)
  // check if request was acceppted and if request was successful
  if response.status_code != 200 or\
  response.json()['status']['result'] != 'success':
    debug("Setting location to off mode failed, %s", response)
  return
  debug("Successfully set location to off mode, "
    "response from server: '%s'", response.text)
