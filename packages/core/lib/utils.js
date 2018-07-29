
function errorToJsonString(err) {
  return JSON.stringify(err);
}

function streamJsonResponse(observable, res) {
  return new Promise((resolve, reject) => {
    res.writeHeader(200, {
      'Content-Type': 'application/json'
    });
    res.write('{"values":[');
    var prefix = '';
    observable.subscribe({
      next(item) {
        res.write(prefix + JSON.stringify(item));
        prefix = ',';
      },
      error(err) {
        res.end('],"error":' + errorToJsonString(err) + '}');
        reject(err);
      },
      complete() {
        res.end('],"error":null}');
        resolve();
      },
    });
  });
}

class ContextRouter {
  constructor() {
    this._symbol = Symbol();
    this.router = new express.Router();
    this.lookup = this._lookup.bind(this);
  }
  attach(req, ctx) {
    req[this._symbol] = ctx;
  }
  _lookup(req) {
    return req[this._symbol];
  }
  handle(ctx, req, res, next) {
    this.attach(req, ctx);
    this.router(req, res, next);
  }
}
function makeContextRouter(cb) {
  var cr = new ContextRouter();
  cb(cr.router, cr.lookup);
  return cr;
}

exports.errorToJsonString = errorToJsonString;
exports.streamJsonResponse = streamJsonResponse;
exports.ContextRouter = ContextRouter;
exports.makeContextRouter = makeContextRouter;
