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

  try {
    homeCustomConfig = path.join(process.env[process.platform === `win32` ? `USERPROFILE` : `HOME`], `.mozzart.js`);
  } catch (e) {}

  const args = process.argv.slice(0); // eslint-disable-line

  while (args.length) {
    const arg = args.shift();
    if (arg.match(/^--config=/g) !== null) {
      argsConfig = path.resolve(process.cwd(), arg.split(`=`)[1]);
    }
  }

  const configFile = _.find([cwdConfigFile, argsConfig, homeCustomConfig], file =>
    isFileExists(file)
  );

  try {
    config = require(configFile); // eslint-disable-line
  } catch (e) {
    console.log(`Failed to require config :`);
    console.log(e);
  }

  config.processes = config.processes || [];
  config.wait = config.wait || null;
  config.watch = config.watch !== false;
  config.sync = config.sync === true;

  return config;
}());
