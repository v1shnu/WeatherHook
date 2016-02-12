var WIT_ACCESS_TOKEN = "<WIT_TOKEN>";

var wit = require('node-wit');
var weather = require('weather-js');
var moment = require('moment');
var request = require('request');
var express = require('express');
var bodyParser = require('body-parser');
var fs = require('fs');
var http = require('http');
var https = require('https');
var app = express();
app.use(bodyParser.json());

var privateKey = fs.readFileSync('./server.key', 'utf8');
var certificate = fs.readFileSync('./server.crt', 'utf8');
var credentials = {
    key: privateKey,
    cert: certificate
};

var httpServer = http.createServer(app);
var httpsServer = https.createServer(credentials, app);

httpServer.listen(1234);
httpsServer.listen(8443);

app.get('/', function(req, res) {
    res.send("Hello world!");
});

app.post('/', function(req, res) {
    parseMessage(req.body.text, res);
});

var parseMessage = function(message, response) {
    if (message.toLowerCase().indexOf("weather") != -1) {
        wit.captureTextIntent(WIT_ACCESS_TOKEN, message, function(err, res) {
            if (err) console.log("Error: ", err);
            console.log(JSON.stringify(res, null, " "));
            try {
                var location = res.outcomes[0].entities.location[0].value;
                var date = moment().format("YYYY-MM-DD");
                if (res.outcomes[0].entities.datetime != undefined) {
                    date = res.outcomes[0].entities.datetime[0].value.split('T')[0];
                }
                return findWeather(location, date, response);
            } catch (err) {

            }
        });
    }
}

var findWeather = function(location, date, response) {
    console.log("Finding weather " + location + " | " + date);
    weather.find({
        search: location,
        degreeType: 'C'
    }, function(err, result) {
        if (err) {
            console.log(err);
        } else {
            var data = result[0];
            var today = moment().format("YYYY-MM-DD");
            var message = "";
            if (date == null || date == today) {
                message += "_Weather report for: " + data.location.name + "_\n";
                message += "Current temperature: " + data.current.temperature + "°C [" + data.current.skytext + "]\n";
                message += "Humidity: " + data.current.humidity + "%\n";
                message += "Precipitation: " + data.forecast[1].precip + "%\n";
            } else {
                var forecasts = data.forecast;
                for (var i in forecasts) {
                    var forecast = forecasts[i];
                    if (forecast.date == date) {
                        var day = moment(date, "YYYY-MM-DD");
                        message += "_Weather forecast for: " + data.location.name + " [" + day.format("DD/MM/YYYY") + "]" + "_\n";
                        message += "Temperature: " + forecast.low + "°C | " + forecast.high + " °C [" + forecast.skytextday + "]\n";
                        if (forecast.precip != "") {
                            message += "Precipitation: " + forecast.precip + "%\n";
                        } else {
                            message += "Precipitation: 0%\n";
                        }
                    }
                }
            }
            sendToFlock(message, response);
            return message;
        }
    });
}

var sendToFlock = function(message, response) {
    response.send({
        text: message
    });
}
