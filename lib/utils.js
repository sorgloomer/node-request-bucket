
exports.errorToJsonString = errorToJsonString;
exports.streamJsonResponse = streamJsonResponse;

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
