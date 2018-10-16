'use strict'

const moment = require(`moment`);
const config = require(`./config`);

module.exports = (...args) => {
  if (config.prefixTS) {
    args.unshift(moment().format(`YYYY-MM-DD HH:mm:ss.SSS`));
  }

  console.log(...args);
};
