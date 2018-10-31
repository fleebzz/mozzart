'use strict';

const fs   = require(`fs`);
const path = require(`path`);
const _    = require(`lodash`);

/* eslint no-process-env: "off" */
/* eslint no-sync: "off" */

const isFileExists = filePath => filePath && fs.existsSync(filePath);

module.exports = (function configInit () {
  let config           = {};
  let homeCustomConfig = null;
  const cwdConfigFile  = path.resolve(process.cwd(), `.mozzart.js`);
  let argsConfig       = null;
  let command          = `start`;
  let uidForCmd        = null;

  try {
    homeCustomConfig = path.join(process.env[process.platform === `win32` ? `USERPROFILE` : `HOME`], `.mozzart.js`);
  } catch (e) {}

  const args = process.argv.slice(2); // eslint-disable-line

  while (args.length) {
    const arg = args.shift();
    if (arg.match(/^--config$/g) || arg.match(/^-c$/g)) {
      argsConfig = args.shift();
      if (argsConfig.charAt(0) !== `/`) {
        argsConfig = path.resolve(process.cwd(), argsConfig);
      }
    } else if (arg.match(/^start$/g)) {
      command = arg;
      if (args[0] && args[0].charAt(0) !== `-`) {
        console.log(`Bad arguments. Maybe you wanted to run :\n\n\tmozzart resume ${args[0]}`);

        return process.exit(1);
      }
    } else if (arg.match(/^stop$/g)) {
      command = arg;
      uidForCmd = args.shift();
    } else if (arg.match(/^restart$/g)) {
      command = arg;
      uidForCmd = args.shift();
    } else if (arg.match(/^resume$/g)) {
      command = arg;
      uidForCmd = args.shift();
    } else if (arg.match(/^remove$/g)) {
      command = arg;
      uidForCmd = args.shift();
    } else if (arg.match(/^update$/g)) {
      command = arg;
    } else if (arg.match(/^version$/g)) {
      command = `showVersion`;
    } else if (arg.match(/^list$/g)) {
      command = `listProcesses`;
    } else {
      console.log(`Unknown action "${arg}"`);

      return process.exit(1);
    }
  }

  const configFile = _.find([cwdConfigFile, argsConfig, homeCustomConfig], file =>
    isFileExists(file)
  );

  try {
    config = require(configFile); // eslint-disable-line
    config.path = configFile;
  } catch (e) {
    console.log(`Failed to require config :`);
    console.log(e);
  }

  config.command = command;
  config.uidForCmd = uidForCmd;
  config.processes = config.processes || [];
  config.prefixTS = config.prefixTS !== false;
  config.wait = config.wait || null;
  config.watch = config.watch !== false;
  config.silent = config.silent === true;

  return config;
}());
