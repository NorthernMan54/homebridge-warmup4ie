// jest.mock('request');
// const request = require('request');
const warmup4ie = require('/Users/sgracey/Code/homebridge-warmup4ie/src/lib/warmup4ie');
const { Warmup4IE } = require('/Users/sgracey/Code/homebridge-warmup4ie/src/lib/warmup4ie');

describe('Warmup4IE', () => {
  let options;
  let callback;
  let warmup;

  beforeAll(() => {
    options = {
      username: 'test@example.com',
      password: 'password',
      refresh: 60,
      duration: 30
    };
    callback = jest.fn();
    // warmup = new Warmup4IE(options, callback);
  });

  test.skip('should initialize correctly', () => {
    expect(warmup._username).toBe(options.username);
    expect(warmup._password).toBe(options.password);
    expect(warmup._refresh).toBe(options.refresh);
    expect(warmup._duration).toBe(options.duration);
    warmup.destroy();
  });

  test('Login with proper credentials', (done) => {
    options = {
      username: 'test@example.com',
      password: 'password',
      refresh: 60,
      duration: 30
    };
    function callbackHandler(err, data) {
      expect(err).toBeNull();
      expect(data).toBeInstanceOf(Array);
      expect(data).toHaveLength(1);
      expect(data[0].roomId).toBe(68345);
      expect(data[0].roomName).toBe('Ensuite Floor');
      done();
    }
    warmup = new Warmup4IE(options, callbackHandler);
    expect(warmup._refresh).toBe(options.refresh);
  }, 30000);

  test('getStatus should return status', (done) => {
    warmup.getStatus((err, data) => {
      expect(err).toBeNull();
      expect(data).toBeInstanceOf(Array);
      expect(data[0].roomId).toBe(68345);
      // targetTemp
      expect(data[0].targetTemp).toBe(150);
      // overrideTemp
      expect(data[0].minTemp).toBe(50);
      done();
    });
  }, 11000);

  test('this.room should be populated', () => {
    expect(warmup.room).toBeDefined();
    expect(warmup.room).toBeInstanceOf(Array);
    expect(warmup.room[68345].roomId).toBe(68345);
    // targetTemp
    expect(warmup.room[68345].targetTemp).toBe(150);
    // overrideTemp
    expect(warmup.room[68345].minTemp).toBe(50);
  });

  test('this.room should be iterable with forEach', () => {
    expect(warmup.room).toBeDefined();
    expect(warmup.room).toBeInstanceOf(Array);
    expect(warmup.room).toHaveLength(68346);
    warmup.room.forEach(function (room) {
      console.log(room);
      expect(room.roomId).toBe(68345);
    });
  });

  test.skip('setTargetTemperature should handle success', done => {

    WarmupAccessToken = 'test-token';
    const response = {
      statusCode: 200,
      statusMessage: 'OK',
      body: JSON.stringify({ response: {} })
    };

    request.mockImplementation((opts, cb) => cb(null, response));

    warmup.setTargetTemperature('room-id', 22, err => {
      expect(err).toBeNull();
      done();
    });

  });

  test.skip('setTargetTemperature should handle error', done => {

    WarmupAccessToken = 'test-token';
    const response = {
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      body: 'Error'
    };

    request.mockImplementation((opts, cb) => cb(null, response));

    warmup.setTargetTemperature('room-id', 22, err => {
      expect(err).toBeInstanceOf(Error);
      done();
    });


  });

  afterAll(() => {
    warmup.destroy();
  });
  // Similar tests for setRoomAuto, setRoomOverRide, setRoomFixed, and setRoomOff

});

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const loginResponse = [
  {
    roomId: 68345,
    roomName: 'Ensuite Floor',
    isOwner: true,
    roomType: 'a',
    roomMode: 'program',
    runMode: 'off',
    targetTemp: 150,
    overrideTemp: 150,
    overrideDur: 0,
    currentTemp: 195,
    airTemp: '215',
    floor1Temp: '195',
    floor2Temp: '0',
    fixedTemp: 100,
    heatingTarget: 0,
    setbackTemp: 150,
    comfortTemp: 220,
    sleepTemp: 180,
    sleepActive: true,
    floorType: false,
    minTemp: 50,
    maxTemp: 300,
    energy: '0.00',
    cost: '0.00',
    mainRoom: true,
    schedule: [
      [Object], [Object],
      [Object], [Object],
      [Object], [Object],
      [Object]
    ],
    sensorFault: '001',
    hasPolled: true,
    lastPoll: 0
  }
];

const responseData = [{ airTemp: "215", comfortTemp: 220, cost: "0.00", "currentTemp": 195, "energy": "0.00", "fixedTemp": 100, "floor1Temp": "195", "floor2Temp": "0", "floorType": false, "hasPolled": true, "heatingTarget": 0, "isOwner": true, "lastPoll": 0, "mainRoom": true, "maxTemp": 300, "minTemp": 50, "overrideDur": 0, "overrideTemp": 150, "roomId": 68345, "roomMode": "program", "roomName": "Ensuite Floor", "roomType": "a", "runMode": "off", "schedule": [{ day: "0", mode: "0", node: "0", type: "0", value: [] }, { day: "1", mode: "0", node: "1", type: "0", value: [{ end: "08:00", start: "05:00", temp: "220" }] }, { day: "2", mode: "0", node: "1", type: "0", value: [{ end: "08:00", start: "05:00", temp: "220" }] }, { day: "3", mode: "0", node: "1", type: "0", value: [{ end: "08:00", start: "05:00", temp: "220" }] }, { day: "4", mode: "0", node: "1", type: "0", value: [{ end: "08:00", start: "05:00", temp: "220" }] }, { day: "5", mode: "0", node: "1", type: "0", value: [{ end: "08:00", start: "05:00", temp: "220" }] }, { day: "6", mode: "0", node: "0", type: "0", value: [] }], sensorFault: "001", setbackTemp: 150, "sleepActive": true, "sleepTemp": 180, "targetTemp": 150 }];

const getStatusResponse = [{
  airTemp: "210",
  comfortTemp: 220, cost: "0.00",
  "currentTemp": 195, "energy": "0.00",
  "fixedTemp": 100, "floor1Temp": "195",
  "floor2Temp": "0",
  "floorType": false, "hasPolled": true, "heatingTarget": 0, "isOwner": true, "lastPoll": 0, "mainRoom": true, "maxTemp": 300, "minTemp": 50, "overrideDur": 0, "overrideTemp": 150, "roomId": 68345, "roomMode": "program",
  "roomName": "Ensuite Floor",
  "roomType": "a",
  "runMode": "off",
  "schedule": [{ day: "0", mode: "0", node: "0", type: "0", value: [] }, {
    day: "1",
    mode: "0",
    node: "1",
    type: "0",
    value: [{
      end: "08:00",
      start: "05:00",
      temp: "220"
    }]
  }, {
    day: "2",
    mode: "0",
    node: "1",
    type: "0",
    value: [{
      end: "08:00",
      start: "05:00",
      temp: "220"
    }]
  }, {
    day: "3",
    mode: "0",
    node: "1",
    type: "0",
    value: [{
      end: "08:00",
      start: "05:00",
      temp: "220"
    }]
  }, {
    day: "4",
    mode: "0",
    node: "1",
    type: "0",
    value: [{
      end: "08:00",
      start: "05:00",
      temp: "220"
    }]
  }, {
    day: "5",
    mode: "0",
    node: "1",
    type: "0",
    value: [{
      end: "08:00",
      start: "05:00",
      temp: "220"
    }]
  }, {
    day: "6",
    mode: "0",
    node: "0",
    type: "0",
    value: []
  }], sensorFault: "001",
  setbackTemp: 150, "sleepActive": true, "sleepTemp": 180, "targetTemp": 150
}];