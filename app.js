/*eslint-env node*/

//------------------------------------------------------------------------------
// node.js starter application for Bluemix
//------------------------------------------------------------------------------

// This application uses express as its web server
// for more info, see: http://expressjs.com
var express = require('express');
var bodyParser= require('body-parser')
var MongoClient = require('mongodb').MongoClient
var MongoOplog = require('mongo-oplog');

// cfenv provides access to your Cloud Foundry environment
// for more info, see: https://www.npmjs.com/package/cfenv
var cfenv = require('cfenv');

var config = require('./config');

// Set source and target DB
var latency = config.latency;
var targetMongoDB_URL = config.targetMongoDB_URL;
var sourceMongoDB_OPLOGURL = config.sourceMongoDB_OPLOGURL;


// create a new express server
var app = express();

// get the app environment from Cloud Foundry
var appEnv = cfenv.getAppEnv();


var targetMongoDB_URL_hidden_password = hidePassword (targetMongoDB_URL);
var sourceMongoDB_OPLOGURL_hidden_password = hidePassword(sourceMongoDB_OPLOGURL);


app.use(bodyParser.urlencoded({extended: true}))
app.use( express.static( "public" ) )
app.set('view engine', 'ejs')

app.get('/', (req, res) => {
    res.render('index.ejs', {target: targetMongoDB_URL_hidden_password, source: sourceMongoDB_OPLOGURL_hidden_password, latency: latency})
})


// start server on the specified port and binding host
app.listen(appEnv.port, '0.0.0.0', function() {
  // print a message when the server starts listening
  console.log("server starting on " + appEnv.url);
});


function hidePassword ( urlToEncode ) {
  var at_split = urlToEncode.split("@");
  var colon_split = at_split[0].split(":");

  return colon_split [0] + ':' + colon_split [1] + ':' + '********' + '@' + at_split [1];
}

var db


var options = {
    mongos: {
        ssl: true,
        sslValidate: false,
    }
}

MongoClient.connect(targetMongoDB_URL, options, function (err, database) {

  if (err) return console.log(err)

  db = database
  console.log("Connected to the Destination mongoDB:");
  console.log("     sl-us-dal-9-portal.3.dblayer.com:15617,sl-us-dal-9-portal.1.dblayer.com:15617/NodeExperiments");

})

var oplog = MongoOplog(sourceMongoDB_OPLOGURL).tail(function () {

  console.log("Connected and tailing on Oplog of Source mongoDB:");
  console.log("     sl-eu-lon-2-portal.3.dblayer.com:15282,sl-eu-lon-2-portal.1.dblayer.com:15282");

});


oplog.on('op', function (data) {
  console.log(data);
});

oplog.on('insert', function (doc) {
  console.log("TimeStamp: " + doc.ts);
  console.log("Namespace is " + doc.ns);



  db.collection(doc.ns.split(".")[1]).save(doc.o, (err, result) => {
    if (err) return console.log(err)

    console.log(JSON.stringify(doc.o, null, 2) + '\nsaved to database')
  })

});

oplog.on('update', function (doc) {
  console.log("TimeStamp: " + doc.ts);
  console.log("Namespace is " + doc.ns);


  db.collection(doc.ns.split(".")[1]).update(  doc.o2 , doc.o, {w:1}, function(err) {
      if (err) return console.log(err)

      console.log('Documeny identified by:' + JSON.stringify(doc.o2, null, 2) + '\nupdated to database(' + JSON.stringify(doc.o, null, 2) + ')');
  });

});

oplog.on('delete', function (doc) {

  db.collection(doc.ns.split(".")[1]).remove (doc.o, {w:1}, function(err, object) {

    if (err) return console.log(err)

    console.log('Documeny identified by:' + JSON.stringify(doc.o, null, 2) + '\n Deleted');

  });

});

oplog.on('error', function (error) {
  console.log(error);
});

oplog.on('end', function () {
  console.log('Stream ended');
});

oplog.stop(function () {
  console.log('server stopped');
});
