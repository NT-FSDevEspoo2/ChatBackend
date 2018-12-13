let express = require("express");
let bodyParser = require("body-parser");
let cors = require("cors");
let http = require('http');
let socketIO = require('socket.io');

let app = express();

let server = http.Server(app);
let io = socketIO(server);

const chatIdLength = 6;
const chatBoxLength = 10;

var chatIds = [];

var chats = [];

createChat(1, "General");

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(cors());

const path = "/api/chat";

io.on("connection", (socket) => {
    console.log("User connected");

    socket.on("room", function (room) {
        socket.join(room);
    });
});

// Get chat
app.get(path + "/:id", function (req, res) {
    var chat = chats[req.params.id];

    if (!chat) {
        return res.status(404).json(createResponse("Chat not found"));
    }

    return res.status(200).json(chat);
});

// Create chat
app.post(path + "/create/:name", function (req, res) {
    var name = req.params.name;

    var createdChat = createChat(null, name);

    return res.status(200).json(createdChat);
});

// Send message to chat
app.post(path + "/sendmessage/:id", function (req, res) {
    var chat = chats[req.params.id];

    if (!chat) {
        return res.status(404).json(createResponse("Chat not found"));
    }

    var sender = req.body.sender;
    var message = req.body.message;

    if (!sender) {
        return res.status(400).json(createResponse("Sender required"));
    }

    if (!message) {
        return res.status(400).json(createResponse("Message required"));
    }

    var messageJson = {
        timestamp: Date.now(),
        sender: sender,
        message: message
    };

    chat.messages.push(messageJson);

    updateMessageHistory(chat);

    io.in("chatroom-" + chat.id).emit("message", messageJson);

    return res.status(200).json(createResponse("OK"));
});

function createChat(id, name) {
    var chatId = id === null ? generateChatId() : id;
    chatIds.push(chatId);

    var createdChat = {
        id: chatId,
        name: name,
        messages: [],
        messageHistory: []
    };

    chats[chatId] = createdChat;

    console.log("Created chat: " + createdChat.id + " " + createdChat.name);

    return createdChat;
}

function generateChatId() {
    var characters = "1234567890abcdefghijklmnpqrstuwvxyz"

    var generatedId = null;
    do {
        generatedId = "";

        for (var i = 0; i < chatIdLength; i++) {
            var randomNumber = Math.floor(Math.random() * characters.length);
            generatedId += characters[randomNumber];
        }
    } while (chatIds.includes(generatedId));

    return generatedId;
}

function updateMessageHistory(chat) {
    if (chat.messages.length > chatBoxLength) {
        chat.messageHistory.push(chat.messages.splice(0, chat.messages.length - chatBoxLength));
    }
}

function createResponse(message) {
    return { "message": message };
}

var port = 3000;
app.listen(port);
console.log("Running in port " + port);

var socketPort = port + 1;
server.listen(socketPort, () => {
    console.log("Socket in port " + socketPort);
});