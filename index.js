// This platform integrates Honeywell warmup4ie into homebridge
// As I only own single thermostat, so this only works with one, but it is
// conceivable to handle mulitple with additional coding.
//
// The configuration is stored inside the ../config.json
// {
//     "platform": "warmup4ie",
//     "name":     "Thermostat",
//     "username" : "username/email",
//     "password" : "password",
//     "debug" : "True",      - Optional
//     "refresh": "60",       - Optional
//     "devices" : [
//        { "location": "123456789", "name" : "Main Floor Thermostat" },
//        { "deviceID": "123456789", "name" : "Upper Floor Thermostat" }
//     ]
// }
//
//     name: YOUR_DESCRIPTION
//    username: YOUR_E_MAIL_ADDRESS
//    password: YOUR_PASSWORD
//    location: YOUR_LOCATION_NAME
//    room: YOUR_ROOM_NAME
//

/*jslint node: true */
'use strict';

var debug = require('debug')('warmup4ie');
var Service, Characteristic, UUIDGen, FakeGatoHistoryService, CustomCharacteristic;
var os = require("os");
var hostname = os.hostname();
var Warmup4ie = require('./lib/warmup4ie.js').Warmup4IE;
const moment = require('moment');

var myAccessories = [];
var refresh, storage;

module.exports = function(homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  UUIDGen = homebridge.hap.uuid;
  CustomCharacteristic = require('./lib/CustomCharacteristic.js')(homebridge);
  FakeGatoHistoryService = require('fakegato-history')(homebridge);

  // warmup4ie.setCharacteristic(Characteristic);

  homebridge.registerPlatform("homebridge-warmup4ie", "warmup4ie", warmup4iePlatform);
};

function warmup4iePlatform(log, config, api) {
  this.username = config['username'];
  this.password = config['password'];
  this.refresh = config['refresh'] || 60; // Update every minute
  this.log = log;
  // this.devices = config['devices'];
  storage = config['storage'] || "fs";
}

warmup4iePlatform.prototype = {
  accessories: function(callback) {
    this.log("Logging into warmup4ie...");
    // debug("Rooms", this);
    this.thermostat = new Warmup4ie(this, function(err, rooms) {
      if (!err) {
        this.log("Found %s room(s)", rooms.length);
        rooms.forEach(function(room) {
          this.log("Adding", room.roomName);
          var newAccessory = new Warmup4ieAccessory(this, room.roomName, this.thermostat.room[room.roomId]);
          // myAccessories[room.roomId] = newAccessory;
          myAccessories.push(newAccessory);
          // debug("myAccessories", myAccessories);
        }.bind(this));
        callback(myAccessories);
      }
      // pollDevices.call(this);
    }.bind(this));

    setInterval(pollDevices.bind(this), this.refresh * 1000); // Poll every minute
  }
};

function pollDevices() {
  // debug("pollDevices", this.thermostat);
  this.thermostat.room.forEach(function(room) {
    // debug("Room", room);
    updateStatus(room);
  });
}

function getAccessory(accessories, roomId) {
  var value;
  accessories.forEach(function(accessory) {
    // debug("Room", accessory.room.roomId, roomId);
    if (accessory.room.roomId === roomId) {
      value = accessory;
    }
  });
  return value;
}

function updateStatus(room) {
  debug("updateStatus %s", room.roomId);
  var acc = getAccessory(myAccessories, room.roomId);
  // debug("acc", acc);
  var service = acc.thermostatService;
  service.getCharacteristic(Characteristic.TargetTemperature)
    .updateValue(Number(room.targetTemp / 10));

  service.getCharacteristic(Characteristic.CurrentTemperature)
    .updateValue(Number(room.currentTemp / 10));

  service.getCharacteristic(Characteristic.TargetHeatingCoolingState)
    .updateValue((room.runMode === "off" ? 0 : 1));

  acc.log_event_counter++;
  if (!(acc.log_event_counter % 10)) {
    acc.loggingService.addEntry({
      time: moment().unix(),
      currentTemp: service.getCharacteristic(Characteristic.CurrentTemperature).value,
      setTemp: service.getCharacteristic(Characteristic.TargetTemperature).value,
      valvePosition: service.getCharacteristic(Characteristic.TargetHeatingCoolingState).value
    });
    acc.log_event_counter = 0;
  }

  service = acc.temperatureService;
  service.getCharacteristic(Characteristic.CurrentTemperature)
    .updateValue(Number(room.airTemp / 10));
}

// give this function all the parameters needed

function Warmup4ieAccessory(that, name, room) {
  this.log = that.log;
  this.log("Adding warmup4ie Device", name);
  this.name = name;
  this.username = that.username;
  this.password = that.password;
  this.room = room;
  this.log_event_counter = 0;
  this.roomId = room.roomId;

  // this.thermostat = new warmup4ie(this, );
}

Warmup4ieAccessory.prototype = {

  // This is to change the system switch to a different position

  /*
  setTargetHeatingCooling: function(value, callback) {
    var that = this;
    if (!updating) {
      updating = true;

      that.log("Setting system switch for", this.name, "to", value);
      // TODO:
      // verify that the task did succeed

      warmup4ie.login(this.username, this.password).then(function(session) {
        session.setSystemSwitch(that.deviceID, warmup4ie.towarmup4ieHeadingCoolingSystem(value)).then(function(taskId) {
          that.log("Successfully changed system!");
          that.log(taskId);
          updateValues(that);
          callback(null, Number(1));
        });
      }).fail(function(err) {
        that.log('warmup4ie Failed:', err);
        callback(null, Number(0));
      });
      callback(null, Number(0));
      updating = false
    }
  },

  */
  setTargetTemperature: function(value, callback) {
    this.log("Setting target temperature for", this.name, "to", value + "°");
    debug("This", this);
    this.thermostat.setTargetTemperature(this.roomId, value, callback);
  },

  /*
  setCoolingThresholdTemperature: function(value, callback) {
    var that = this;
    if (!updating) {
      updating = true;

      //    maxValue: 38,
      //    minValue: 10,

      that.log("Setting cooling threshold temperature for", this.name, "to", value + "°");

      if (value < 10)
        value = 10;

      if (value > 38)
        value = 38;

      value = warmup4ie.towarmup4ieTemperature(that, value);
      // TODO:
      // verify that the task did succeed

      warmup4ie.login(this.username, this.password).then(function(session) {
        session.setHeatCoolSetpoint(that.deviceID, null, value, that.usePermanentHolds).then(function(taskId) {
          that.log("Successfully changed cooling threshold!");
          that.log(taskId);
          // returns taskId if successful
          // nothing else here...
          updateValues(that);
          callback(null, Number(1));
        });
      }).fail(function(err) {
        that.log('warmup4ie Failed:', err);
        callback(null, Number(0));
      });
      callback(null, Number(0));
      updating = false;
    }
  },

  setHeatingThresholdTemperature: function(value, callback) {
    var that = this;
    if (!updating) {
      updating = true;

      //    maxValue: 38,
      //    minValue: 10,

      that.log("Setting heating threshold temperature for", this.name, "to", value + "°");

      if (value < 10)
        value = 10;

      if (value > 38)
        value = 38;

      value = warmup4ie.towarmup4ieTemperature(that, value);
      // TODO:
      // verify that the task did succeed

      warmup4ie.login(this.username, this.password).then(function(session) {
        session.setHeatCoolSetpoint(that.deviceID, value, null).then(function(taskId) {
          that.log("Successfully changed heating threshold!");
          that.log(taskId);
          // returns taskId if successful
          // nothing else here...
          updateValues(that);
          callback(null, Number(1));
        });
      }).fail(function(err) {
        that.log('warmup4ie Failed:', err);
        callback(null, Number(0));
      });
      callback(null, Number(0));
      updating = false;
    }
  },

  setTemperatureDisplayUnits: function(value, callback) {
    var that = this;

    that.log("set temperature units to", value);
    callback();
  },

  */

  getServices: function() {
    // var that = this;
    // this.log("getServices", this.name);

    // debug("getServices", this);
    // Information Service
    var informationService = new Service.AccessoryInformation();

    informationService
      .setCharacteristic(Characteristic.Manufacturer, "warmup4ie")
      .setCharacteristic(Characteristic.SerialNumber, hostname + "-" + this.name)
      .setCharacteristic(Characteristic.FirmwareRevision, require('./package.json').version);
    // Thermostat Service
    //
    this.temperatureService = new Service.TemperatureSensor(this.name + " Air");
    this.temperatureService
      .getCharacteristic(Characteristic.CurrentTemperature)
      .setProps({
        minValue: this.room.minTemp / 10,
        maxValue: this.room.maxTemp / 10
      });
    this.temperatureService.getCharacteristic(Characteristic.CurrentTemperature)
      .updateValue(Number(this.room.airTemp / 10));

    this.thermostatService = new Service.Thermostat(this.name);

    this.thermostatService
      .getCharacteristic(Characteristic.TargetHeatingCoolingState)
      .setProps({
        validValues: [0, 1]
      });

//    this.thermostatService
//      .getCharacteristic(Characteristic.TargetHeatingCoolingState)
//      .on('set', this.setTargetHeatingCooling.bind(this));

    this.thermostatService
      .getCharacteristic(Characteristic.TargetTemperature)
      .on('set', this.setTargetTemperature.bind(this));

    this.thermostatService
      .getCharacteristic(Characteristic.TargetTemperature)
      .setProps({
        minValue: -100, // If you need this, you have major problems!!!!!
        maxValue: 100
      });

    this.thermostatService
      .getCharacteristic(Characteristic.CurrentTemperature)
      .setProps({
        minValue: this.room.minTemp / 10,
        maxValue: this.room.maxTemp / 10
      });

    this.thermostatService.log = this.log;
    this.loggingService = new FakeGatoHistoryService("thermo", this.thermostatService, {
      storage: storage,
      minutes: refresh * 10 / 60
    });

    this.thermostatService.addCharacteristic(CustomCharacteristic.ValvePosition);
    this.thermostatService.addCharacteristic(CustomCharacteristic.ProgramCommand);
    this.thermostatService.addCharacteristic(CustomCharacteristic.ProgramData);

    this.thermostatService.getCharacteristic(Characteristic.TargetTemperature)
      .updateValue(Number(this.room.targetTemp / 10));

    this.thermostatService.getCharacteristic(Characteristic.CurrentTemperature)
      .updateValue(Number(this.room.currentTemp / 10));

    //  service.getCharacteristic(Characteristic.CurrentHeatingCoolingState)
    //    .updateValue(data.latestData.uiData.EquipmentOutputStatus);

    this.thermostatService.getCharacteristic(Characteristic.TargetHeatingCoolingState)
      .updateValue((this.room.runMode === "off" ? 0 : 1));

    return [informationService, this.thermostatService, this.temperatureService, this.loggingService];
  }
};
