var express = require("express");
var EventEmitter = require("events").EventEmitter;
var emitter = new EventEmitter();
var bodyParser = require("body-parser");
var fs = require("fs");

var app = express();

var eventQueue = [];
var queueStart = 0;
var port = process.env.PORT;

app.use(bodyParser.urlencoded({ extended: true }));

if (process.env.NODE_ENV === "production") {
  port = process.env.PORT || 80;
} else {
  emitter.setMaxListeners(0);
  port = process.env.PORT || 3000;
  app.use(express.static(__dirname + "/public", { maxAge: 86400 }));
}

// receives connect events
app.post("/connect", function (req, res) {
  eventQueue.push({ ua: req.body.ua });
  emitter.emit("connect", req.body.ua);
  res.end();
});

// receives draw events
app.post("/draw", function (req, res) {
  eventQueue.push({ from: req.body.from, to: req.body.to });
  emitter.emit("path", req.body.from, req.body.to, eventQueue.length);
  res.end();
});

// receives clear signal
app.post("/clear", function (req, res) {
  queueStart = eventQueue.length;
  emitter.emit("clear");
  res.end();
});

app.get("/", function (req, res) {
  fs.readFile(__dirname + "/public/index.html", "utf8", function (err, text) {
    response.send(text);
  });
});

// broadcast received draw/clear events
app.get("/stream", function (req, res) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.writeHead(200);
  if (req.headers["last-event-id"]) {
    console.log("Last-Event-ID: " + req.headers["last-event-id"]);
    for (
      var i = Math.max(queueStart, req.headers["last-event-id"]);
      i < eventQueue.length;
      i++
    ) {
      res.write(
        "data: " +
          JSON.stringify({ from: eventQueue[i].from, to: eventQueue[i].to }) +
          "\n"
      );
      res.write("id:" + i + "\n\n");
    }
  }
  // Heroku requires activity to avoid request timeout
  setInterval(function () {
    res.write(":\n");
  }, 30);

  emitter.on("path", function (from, to, id) {
    res.write("data: " + JSON.stringify({ from: from, to: to }) + "\n");
    res.write("id: " + id + "\n\n");
  });
  emitter.on("clear", function () {
    res.write("event: clear\n");
    res.write("id: \n");
    res.write("data: \n\n");
  });
  emitter.on("connect", function (ua) {
    res.write("event: connect\n");
    res.write("data: " + JSON.stringify({ ua: ua }) + "\n\n");
  });
});

app.listen(port, () => {
  console.log(
    "Express server listening on port %d in %s mode",
    port,
    app.settings.env
  );
});
