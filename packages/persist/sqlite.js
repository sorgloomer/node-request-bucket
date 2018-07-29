const rx = require('rxjs');
const sqlite3 = require('sqlite3');
const { StoreStatus } = require('../core/lib/common.js');

class PersistSqlite {
  constructor(file) {
    this.db = new sqlite3.Database(file);
    this.statementInsert = null;
    this.batchSize = 50;
    this._prepare();
  }
  _prepare() {
    this.db.serialize(() => {
      this.db.run("CREATE TABLE IF NOT EXISTS requests (id INTEGER PRIMARY KEY AUTOINCREMENT, bucket TEXT, data TEXT);");
      this.statementInsert = this.db.prepare("INSERT INTO requests VALUES (NULL, ?, ?)");
    });
  }
  
  _stream(query, args) {
    return new rx.Observable(observer => {
      this.db.each(query, args, (err, row) => {
        if (err) return observer.error(err);
        const res = JSON.parse(row.data);
        res.id = row.id;
        observer.next(res);
      }, (err, rowCount) => {
        if (err) return observer.error(err);
        observer.complete();
      });
    });
  }
  async insert({data, context}) {
    var bucket = this._bucketNameFromContext(context);
    await new Promise((resolve, reject) => {
      this.statementInsert.run(bucket, JSON.stringify(data), function(err) {
        if (err) return reject(err);
        resolve();
      });
    });
    return StoreStatus.OK;
  }
  fetch({first, last, context}) {
    var bucket = this._bucketNameFromContext(context);
    var where = [];
    if (first) {
      where.push("id > ?1");
    }
    if (last) {
      where.push("id < ?2");
    }
    if (bucket) {
      where.push("bucket = ?3");
    }
    
    if (where.length > 0) {
      where = "WHERE " + where.join(" AND ");
    } else {
      where = "";
    }
    var dir = first ? "ASC" : "DESC";
    var q = "SELECT id,data FROM requests " + where + " ORDER BY id " + dir + " LIMIT ?4";
    return this._stream(q, [first, last, bucket, this.batchSize]);
  }
  clear() {
    return new Promise((resolve, reject) => {
      this.db.run("DELETE FROM requests", function(err, val) {
        if (err) reject(err);
        resolve(val);
      });
    });
  }
  close() {
    this.db.close();
  }
  _bucketNameFromContext(context) {
    return context && context.bucket || "main";
  }
}

exports.PersistSqlite = PersistSqlite;