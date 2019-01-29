var openDatabase = require("websql");
var chatDB = openDatabase("chat_db", "0.1", "Database of chats with channel.", 1);

chatDB.transaction(function (t) {
    t.executeSql("DELETE * from chats");
    t.executeSql("DROP TABLE chats");
});