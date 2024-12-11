// This platform integrates warmup4ie into homebridge
// As I only own single thermostat, so this only works with one, but it is
// conceivable to handle mulitple with additional coding.
//

/*jslint node: true */
'use strict';

var debug = require('debug')('warmup4ie');
var Service, Characteristic, FakeGatoHistoryService, CustomCharacteristics;
var os = require("os");
var hostname = os.hostname();
const Warmup4ie = require('./lib/warmup4ie').Warmup4IE;
const moment = require('moment');
var homebridgeLib = require('homebridge-lib');

var myAccessories = [];
var storage, thermostats;

module.exports = function (homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  CustomCharacteristics = new homebridgeLib.EveHomeKitTypes(homebridge).Characteristics;
  FakeGatoHistoryService = require('fakegato-history')(homebridge);

  homebridge.registerPlatform("homebridge-warmup4ie", "warmup4ie", warmup4iePlatform);
};

function warmup4iePlatform(log, config, api) {
  this.username = config['username'];
  this.password = config['password'];
  this.refresh = config['refresh'] || 60; // Update every minute
  this.duration = config['duration'] || 60; // duration in minutes
  this.log = log;
  storage = config['storage'] || "fs";
}

warmup4iePlatform.prototype = {
  accessories: function (callback) {
    this.log("Logging into warmup4ie...");
    // debug("Rooms", this);
    thermostats = new Warmup4ie(this, function (err, rooms) {
      if (!err) {
        this.log("Found %s room(s)", rooms.length);
        rooms.forEach(function (room) {
          this.log("Adding", room.roomName);
          var newAccessory = new Warmup4ieAccessory(this, room.roomName, thermostats.room[room.roomId]);
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
  // debug("pollDevices", thermostats);
  thermostats.room.forEach(function (room) {
    // debug("Room", room);
    if (room) {
      updateStatus(room);
    }
  });
}

function getAccessory(accessories, roomId) {
  var value;
  accessories.forEach(function (accessory) {
    // debug("Room", accessory.room.roomId, roomId);
    if (accessory.room.roomId === roomId) {
      value = accessory;
    }
  });
  return value;
}

function updateStatus(room) {
  // debug("updateStatus %s", room.roomId);
  var acc = getAccessory(myAccessories, room.roomId);
  // debug("acc", acc);
  var service = acc.thermostatService;

  var targetTemperature = (room.targetTemp > room.minTemp ? room.targetTemp : room.minTemp);
  service.getCharacteristic(Characteristic.TargetTemperature)
    .updateValue(Number(targetTemperature / 10));

  service.getCharacteristic(Characteristic.CurrentTemperature)
    .updateValue(Number(room.currentTemp / 10));

  var currentHeatingCoolingState;
  switch (room.runMode) {
    case "off":
      currentHeatingCoolingState = 0;
      break;
    default:
    case "fixed": // Heat
    case "override": // Heat
    case "schedule":
      if (room.currentTemp < room.targetTemp) {
        currentHeatingCoolingState = 1;
      } else {
        currentHeatingCoolingState = 0;
      }
      break;
  }

  service.getCharacteristic(Characteristic.CurrentHeatingCoolingState)
    .updateValue(currentHeatingCoolingState);

  var targetHeatingCoolingState;
  switch (room.runMode) {
    case "off":
      targetHeatingCoolingState = 0;
      break;
    default:
    case "fixed": // Heat
    case "override": // Heat
      targetHeatingCoolingState = 1;
      break;
    case "schedule":
      targetHeatingCoolingState = 3;
      break;
  }

  service.getCharacteristic(Characteristic.TargetHeatingCoolingState)
    .updateValue(targetHeatingCoolingState);

  acc.log_event_counter++;
  if (!(acc.log_event_counter % 10)) {
    debug("Fakegato Data", acc.log_event_counter);
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
}

Warmup4ieAccessory.prototype = {

  setTargetHeatingCooling: function (value, callback) {
    this.log("Setting system switch for", this.name, "to", value);
    switch (value) {
      case 0: // Off
        thermostats.setRoomOff(this.roomId, (err, json) => {
          if (err) {
            callback(err);
          } else {
            debug("setRoomOff - Result", json);
            callback(null);
          }
        });
        break;
      case 1: // Heat
        if (this.room.runMode === "fixed" || this.room.runMode === "override") {
          callback(null);
        } else {
          thermostats.setRoomAuto(this.roomId, (err, json) => {
            if (err) {
              callback(err);
            } else {
              debug("setRoomAuto - Result", json);
              callback(null);
            }
          });
        }
        break;
      case 3: // Auto
        thermostats.setRoomAuto(this.roomId, (err, json) => {
          if (err) {
            callback(err);
          } else {
            debug("setRoomAuto - Result", json);
            callback(null);
          }
        });
        break;
    }
  },

  setTargetTemperature: function (value, callback) {
    this.log("Setting target temperature for", this.name, "to", value + "°");
    thermostats.setTargetTemperature(this.roomId, value, (err, json) => {
      if (err) {
        callback(err);
      } else {
        debug("setTargetTemperature - Result", json);
        callback(null);
      }
    });
  },

  getServices: function () {
    // var that = this;
    // this.log("getServices", this.name);

    // debug("getServices", this);
    // Information Service
    var informationService = new Service.AccessoryInformation();

    informationService
      .setCharacteristic(Characteristic.Manufacturer, "warmup4ie")
      .setCharacteristic(Characteristic.SerialNumber, hostname + "-" + this.name)
      .setCharacteristic(Characteristic.FirmwareRevision, require('../package.json').version);
    // Thermostat Service
    //
    this.temperatureService = new Service.TemperatureSensor(this.name + " Air");
    this.temperatureService
      .getCharacteristic(Characteristic.CurrentTemperature)
      .setProps({
        minValue: -100,
        maxValue: 100
      });
    this.temperatureService.getCharacteristic(Characteristic.CurrentTemperature)
      .updateValue(Number(this.room.airTemp / 10));

    this.thermostatService = new Service.Thermostat(this.name);
    this.thermostatService.isPrimaryService = true;

    this.thermostatService
      .getCharacteristic(Characteristic.TargetHeatingCoolingState)
      .setProps({
        validValues: [0, 1, 3]
      });

    this.thermostatService
      .getCharacteristic(Characteristic.TargetHeatingCoolingState)
      .on('set', this.setTargetHeatingCooling.bind(this));

    this.thermostatService
      .getCharacteristic(Characteristic.TargetTemperature)
      .on('set', this.setTargetTemperature.bind(this));

    this.thermostatService
      .getCharacteristic(Characteristic.TargetTemperature)
      .setProps({
        minValue: this.room.minTemp / 10,
        maxValue: this.room.maxTemp / 10
      });

    this.thermostatService
      .getCharacteristic(Characteristic.CurrentTemperature)
      .setProps({
        minValue: -100,
        maxValue: 100
      });

    this.thermostatService.log = this.log;
    this.loggingService = new FakeGatoHistoryService("thermo", this.thermostatService, {
      storage: storage,
      minutes: this.refresh * 10 / 60
    });

    this.thermostatService.addCharacteristic(CustomCharacteristics.ValvePosition);
    this.thermostatService.addCharacteristic(CustomCharacteristics.ProgramCommand);
    this.thermostatService.addCharacteristic(CustomCharacteristics.ProgramData);

    var targetTemperature = (this.room.targetTemp > this.room.minTemp ? this.room.targetTemp : this.room.minTemp);
    this.thermostatService.getCharacteristic(Characteristic.TargetTemperature)
      .updateValue(Number(targetTemperature / 10));

    this.thermostatService.getCharacteristic(Characteristic.CurrentTemperature)
      .updateValue(Number(this.room.currentTemp / 10));

    var currentHeatingCoolingState;
    switch (this.room.runMode) {
      case "off":
        currentHeatingCoolingState = 0;
        break;
      default:
      case "fixed": // Heat
      case "override": // Heat
      case "schedule":
        if (this.room.currentTemp < this.room.targetTemp) {
          currentHeatingCoolingState = 1;
        } else {
          currentHeatingCoolingState = 0;
        }
        break;
    }

    this.thermostatService.getCharacteristic(Characteristic.CurrentHeatingCoolingState)
      .updateValue(currentHeatingCoolingState);

    var targetHeatingCoolingState;
    switch (this.room.runMode) {
      case "off":
        targetHeatingCoolingState = 0;
        break;
      default:
      case "fixed": // Heat
      case "override": // Heat
        targetHeatingCoolingState = 1;
        break;
      case "schedule":
        targetHeatingCoolingState = 1;
        break;
    }

    this.thermostatService.getCharacteristic(Characteristic.TargetHeatingCoolingState)
      .updateValue(targetHeatingCoolingState);

    return [informationService, this.thermostatService, this.temperatureService, this.loggingService];
  }
};
