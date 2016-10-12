var config = {};

config.sourceMongoDB_OPLOGURL = 'mongodb://<user>:<pass>@<host1>:<port>,<host2>:<port>,.../local';
config.targetMongoDB_URL = 'mongodb://<user>:<pass>@<host1>:<port>,<host2>:<port>,.../<dbname>?<options>';
config.latency = 0;

module.exports = config;
