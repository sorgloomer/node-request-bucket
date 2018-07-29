const express = require('express');
const path = require('path');
const utils = require('./utils.js');

function optionalInt(x, _default) {
  if (x == null) {
    return _default;
  }
  return parseInt(x);
}

class Admin {
  constructor(db, path) {
    this.db = db;
    this.path = path;
    this.router = new express.Router();
    this._registerRoutes();
  }
  handle(req, res, next) {
    return ROUTER.handle(this, req, res, next);
  }
  _registerRoutes() {
    this.router.route('/').get(this._index.bind(this));
    this.router.route('/fetch').get(this._fetch.bind(this));
    this.router.route('/clear').post(this._clear.bind(this));
    this.router.use(express.static(path.resolve(__dirname, '../inspect')));
  }
  _index(req, res, next) {
    return res.redirect(this.path + '/index.html');
  }
  _fetch(req, res, next) {
    try {
      const first = optionalInt(req.query.first);
      const last = optionalInt(req.query.last);
      const o = this.db.fetch({
        first, last, context: req
      });
      utils.streamJsonResponse(o, res);
    } catch (e) {
      next(e);
    }
  }
  _clear(req, res, next) {
    this.db.clear().then(() => res.send("cleared")).catch(next);
  }
}

exports.Admin = Admin;
exports.optionalInt = optionalInt;
