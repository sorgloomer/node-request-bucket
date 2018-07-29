const express = require('express');
const configModule = require('./config-loader.js');
const utils = require('./lib/core/lib/utils.js');
const { Admin } = require('./lib/core/lib/admin.js');
const { StoreStatus } = require('./lib/core/lib/common.js');
const { PersistSqlite } = require('./lib/persist/sqlite.js');
const moment = require('moment');

function promiseResponse(prom, req, res, next) {
  return prom.then(x => {
    res.send(x);
  }).catch(e => {
    next(e || { message:"unknown error" });
  });
}

function reqText(req) {
  return new Promise((resolve, reject) => {
    req.setEncoding('utf8');
    req.rawBody = '';
    req.on('data', function(chunk) {
      req.rawBody += chunk;
    });
    req.on('error', function(err) {
      reject(err);
    });
    req.on('end', function(){
      resolve(req.rawBody);
    });
  });
}

class Entry {
  constructor() {
    this.config = configModule.getConfig();
    this.db = this._createPersist();
    this.admin = new Admin(this.db, this.config.admin);
    console.log('Admin path: ' + this.config.admin);
    this.app = this.makeApp();
    this.app.listen(this.config.port, this.config.host, () => {
      console.log("Listenning on " + this.config.host + ":" + this.config.port + " ...");
    });
  }
  close() {
    this.app.stop();
    this.db.close();
  }
  makeApp() {
    const app = express();
    app.use(this.middlewareLog.bind(this));
    app.use(this.config.admin, [this.admin.router, this._notFound.bind(this)]);
    app.use(this.middlewareRecord.bind(this));
    app.use(this.middlewareError.bind(this));
    app.enable('trust proxy');
    return app;
  }
  _notFound(req, res, next) {
    res.sendStatus(404);
  }
  middlewareError(err, req, res, next) {
    console.error(err);
    res.status(500).send();
  }
  async _record(req) {
    const bodyText = await reqText(req);
    return await this.db.insert({
      data: {
        protocol: req.protocol,
        timestamp: moment.utc().format(),
        method: req.method,
        clientIp: req.ip,
        url: req.originalUrl,
        headers: req.headers,
        body: bodyText,
      }
    });
  }
  middlewareRecord(req, res, next) {
    this._record(req).then(status => {
      res.header('Content-Type', 'text/plain');
      res.end(status || StoreStatus.OK);
    }).catch(next);
  }
  middlewareLog(req, res, next) {
    if (this.config.debug) {
      console.log("Request: " + req.originalUrl);
    }
    next();
  }
  _createPersist() {
    return new PersistSqlite(this.config.db);
  }
}

function main() {
  const entry = new Entry();
}

exports.main = main;
exports.PersistSqlite = PersistSqlite;
exports.Entry = Entry;
