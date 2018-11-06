'use strict';

const log = require(`../lib/log`);
const registry = require(`../lib/registry`);

module.exports = async uid => {
  log(`Stopping ${uid}...`);
  await registry.setAuto(uid, false);
  const pid = await registry.getPid(uid);

  if (!pid) { return log(`Not running`); }

  await registry.savePid(uid, null);

  try {
    process.kill(pid, `SIGKILL`);
  } catch (e) {}

  return Promise.resolve();
};
