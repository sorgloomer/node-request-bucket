const express = require('express');
const path = require('path');
const utils = require('./utils.js');

function optionalInt(x) {
  if (x == undefined) {
    return undefined;
  }
  return parseInt(x);
}

class Admin {
  constructor(db, path) {
    this.db = db;
    this.path = path;
    this.router = this._makeRouter();
  }
  _makeRouter() {
    const admin = new express.Router();
    admin.route('/').get(this._index.bind(this));
    admin.route('/fetch').get(this._fetch.bind(this));
    admin.route('/clear').post(this._clear.bind(this));
    admin.use(express.static(path.resolve(__dirname, '../admin')));
    return admin;
  }
  _index(req, res, next) {
    return res.redirect(this.path + '/index.html');
  }
  _fetch(req, res, next) {
    try {
      const first = optionalInt(req.query.first);
      const last = optionalInt(req.query.last);
      const o = this.db.fetch(first, last);
      utils.streamJsonResponse(o, res);
    } catch (e) {
      next(e);
    }
  }
  _clear(req, res, next) {
    this.db.clear().then(() => res.send()).catch(next);
  }
}

exports.Admin = Admin;
exports.optionalInt = optionalInt;
