const ArgumentParser = require('argparse').ArgumentParser;
const crypto = require("crypto");
const fs = require('fs');

exports.argParser = argParser;
exports.getArgs = getArgs;
exports.getConfig = getConfig;
exports.mergeConfig = mergeConfig;

function argParser() {
  var parser = new ArgumentParser({
    version: '0.0.1',
    addHelp: true,
    description: 'Http RequestBucket for node',
  });
  parser.addArgument(
    [ '-c', '--config' ],
    {
      action: 'append',
      help: 'location of config files. ./config.json is loaded by default if present.',
    }
  );
  parser.addArgument(
    '--debug',
    {
      help: 'Enable debug mode. Default is 0.',
      type: 'int',
    }
  );
  parser.addArgument(
    '--db',
    {
      help: 'sqlite db location (:memory: for in-memory db) (default: db.sqlite3)',
    }
  );
  parser.addArgument(
    ['-a', '--admin'],
    {
      help: 'HTTP path on which the management interface is available. (default: /{rnd})',
    }
  );
  parser.addArgument(
    ['-H', '--host'],
    {
      help: 'HTTP host to listen on. Defaults to IPv6 all interface, set to 0.0.0.0 for IPv4.',
    }
  );
  parser.addArgument(
    ['-P', '--port'],
    {
      help: 'HTTP port to listen on.',
      type: 'int',
    }
  );
  return parser;
}

function getArgs() {
  return argParser().parseArgs();
}

function mergeConfig(haystack, needle) {
  Object.entries(needle).forEach(([k, v]) => {
    if (v != null) {
      haystack[k] = v;
    }
    if (v === 'CONFIG_DELETE') {
      delete haystack[k];
    }
  });
}

function readJsonFile(pathToFile) {
  return JSON.parse(fs.readFileSync(pathToFile, 'utf8'));
}

function readConfig(file) {
  return readJsonFile(file);
}

function getConfigInput() {
  const args = getArgs();
  const result = {};

  function mergeFile(file) {
    console.debug('Reading config file ' + JSON.stringify(file));
    const fileContent = readConfig(file);
    mergeConfig(result, fileContent);
  }
  
  if (args.config) {
    for (const cfile of args.config) {
      try {
        mergeFile(cfile);
      } catch (e) {
        console.error("Could not read config file " + JSON.stringify(cfile));
        throw e;
      }
    }
  } else {
    try {
      mergeFile('./config.json');
    } catch (e) {
      if (e.code !== 'ENOENT'){
        throw e;
      }
    }
  }
  mergeConfig(result, args);
  return result;
}

function applyDefaults(config, def) {
  config = Object.assign({}, config);
  Object.entries(def).forEach(([v, k]) => {
    if (config[k] == null) {
      config[k] = v;
    }
  });
  return config;
}

function getConfig() {
  var config = {
    port: 8081,
    host: '::',
    admin: '/admin',
    db: 'db.sqlite3',
    debug: 0,
  };
  var input = getConfigInput();
  mergeConfig(config, input);
  config.admin = config.admin.replace(/\{rnd\}/g, randomPath);
  return config;
}

function randomPath() {
  return crypto.randomBytes(12).toString('hex');  
}

function ensureListConfig(config, name, def=undefined) {
  config[name] = ensureListArg(config[name], def);
}

function ensureListArg(configValue, def=undefined) {
  if (configValue === undefined && def) {
    configValue = def();
  }
  if (configValue === undefined) {
    return [];
  }
  if (Array.isArray(configValue)) {
    return configValue;
  }
  return [configValue];
}
