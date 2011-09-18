var express = require('express');
var EventEmitter = require('events').EventEmitter;
var emitter = new EventEmitter();
var app = express.createServer();

app.configure(function(){
  emitter.setMaxListeners(0);
  app.use(express.logger());
  app.set('port', 3000);
  app.use(express.bodyParser());
  app.use(express.static(__dirname + '/public', { maxAge: 86400}));
});

// Run on port 80 when in production mode
app.configure('production', function(){
  app.use(express.errorHandler()); 
  app.set('port', 80);
});

// receives draw events
app.post('/draw', function(req, res){
    emitter.emit("path", req.body.from, req.body.to);
    res.end();
});

// receives clear signal
app.post('/clear', function(req, res){
    emitter.emit("clear");
    res.end();
});


// broadcast received draw/clear events
app.get('/stream', function(req, res) {
    res.setHeader("Content-Type", 'text/event-stream');
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.writeHead(200);
    emitter.on("path", function(from, to) {
	res.write("data: " + JSON.stringify({'from': from, 'to': to})+ "\n\n");
    });
    emitter.on("clear", function(from, to) {
	res.write("event: clear\n");
	res.write("data: \n\n");
    });
});

app.listen(app.set('port'));
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);