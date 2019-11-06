# homebridge-connex

Homebridge plugin for the Connex Dimplex WiFi thermostat

# Table of Contents

<!--ts-->
   * [homebridge-connex](#homebridge-connex)
   * [Table of Contents](#table-of-contents)
   * [Using the plugin](#using-the-plugin)
      * [Temperature Control](#temperature-control)
      * [Mode Setting - Not supported](#mode-setting---not-supported)
   * [Settings](#settings)
      * [Required settings](#required-settings)
      * [Optional settings](#optional-settings)

<!-- Added by: sgracey, at:  -->

<!--te-->

# Using the plugin

Thermostats are retrieved from the Connex Dimplex site, and are automatically created in the Home App.

## Temperature Control



## Mode Setting - Not supported

`Off` - Turns off the thermostat
`Heat` - Turns on the thermostat and resumes current program
`Auto` - Turns on the thermostat and resumes current program

When the thermostat is in temperature override mode, the Mode setting is set to `Heat`.  To clear the override and resume program mode, turn the mode control to `Auto`.

# Settings

```
"platforms": [{
  "platform": "connex",
  "username": "XXXXXXXXXXXX",
  "password": "XXXXXXXXXXXX"
}]
```

## Required settings

* `username` - Your Dimplex Connex email address / login
* `password` - Your Dimplex Connex password

## Optional settings

* `refresh` - Data polling interval in seconds, defaults to 60 seconds
