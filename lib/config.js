'use strict';

const fs     = require(`fs`);
const path   = require(`path`);
const extend = require(`extend`);
const util   = require(`util`);

/* eslint no-process-env: "off" */
/* eslint no-sync: "off" */

module.exports = (function configInit () {
  let config                 = {};
  let customConfig           = {};
  let customConfigPath       = null;
  let homeCustomConfigPath   = null;

  try {
    homeCustomConfigPath = path.join(process.env[process.platform === `win32` ? `USERPROFILE` : `HOME`], `.mozzart.js`);
  } catch (e) {}

  if (homeCustomConfigPath && fs.existsSync(homeCustomConfigPath)) {
    customConfigPath = homeCustomConfigPath;
  }

  const args = process.argv.slice(0); // eslint-disable-line

  while (args.length) {
    const arg = args.shift();
    if (arg.match(/^--config=/g) !== null) {
      customConfigPath = path.resolve(process.cwd(), arg.shift());
    }
  }

  if (customConfigPath !== null) {
    try {
      customConfig = require(customConfigPath); // eslint-disable-line
      config       = extend(true, {}, config, customConfig);
    } catch (e) {
      util.log(`Failed to require custom config :`);
      console.log(e);
    }
  }

  config.processes = config.processes || [];

  return config;
}());
