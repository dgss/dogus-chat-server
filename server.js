var express = require("express");
var bodyParser = require("body-parser");
var app = express();
var expressWs = require('express-ws')(app);
var messageList = [
    {
        nickname: "Admin",
        message: "Welcome to Dogus Chat",
        uid: "0"
    }
];
var listWs = [];
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

var openDatabase = require("websql");
var chatDB = openDatabase("chat_db", "0.1", "Database of chats with channel.", 1);

chatDB.transaction(function (t) {
    t.executeSql("CREATE TABLE IF NOT EXISTS chats (uid TEXT, message TEXT, channel TEXT, nickname TEXT)");
});

var controlAuth = function (authKey) {
    if (!authKey || Buffer.from(authKey.split(" ")[1], 'base64').toString("ascii") !== "dgsschatclient") {
        return false;
    }
    return true;
};

app.use(function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', "*");
    res.setHeader('Access-Control-Allow-Methods', "POST,GET");
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Credentials', true);
    return next();
});

app.post("/list", function (req, res) {
    if (controlAuth(req.headers.authorization)) {
        chatDB.transaction(function (t) {
            t.executeSql("SELECT * FROM chats where channel = '" + req.body.channel + "'", [], function (t, r) {
                res.send(JSON.stringify(r.rows._array));
            });
        });
    }
    else {
        res.status(401).json({
            "status": "error",
            "message": "Not Authorized!"
        });
    }
});

app.post("/send", function (req, res) {
    if (controlAuth(req.headers.authorization)) {
        if (!req.body.nickname || !req.body.message) {
            res.status(300).json({
                "status": "error",
                "message": req.body
            });
        } else {
            chatDB.transaction(function (t) {
                t.executeSql("INSERT INTO chats (uid, message, channel, nickname) VALUES (?, ?, ?, ?)", [req.body.uid, req.body.message, req.body.channel, req.body.nickname], function (t, r) {
                    var _message = {
                        nickname: req.body.nickname,
                        message: req.body.message,
                        uid: req.body.uid,
                        channel: req.body.channel
                    };

                    res.status(200).json(_message);
                    var _cleanList = [];
                    for (var i = 0; i < listWs.length; i++) {
                        try {
                            listWs[i].send(JSON.stringify(_message));
                            _cleanList.push(listWs[i]);
                        }
                        catch (er) {
                        }
                    }
                    listWs = _cleanList;
                });
            });
        }
    }
    else {
        res.status(401).json({
            "status": "error",
            "message": "Not Authorized!"
        });
    }
});

app.ws('/pushws', function (ws, req) {
    listWs.push(ws);
});

var port = process.env.PORT || 2428;
var server = app.listen(port, function () {
    console.log("Listening on port %s...", server.address().port);
});