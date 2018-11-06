'use strict';

const log = require(`../lib/log`);
const registry = require(`../lib/registry`);

module.exports = async uid => {
  log(`Starting ${uid}...`);
  const pid = await registry.getPid(uid);

  if (pid) { return log(`Already running`); }

  await registry.setAuto(uid, false);
  await registry.addResumeUid(uid);
  const mozzReg = await registry.get(`mozzart`);

  return process.kill(mozzReg.pid, `SIGCONT`);
};
