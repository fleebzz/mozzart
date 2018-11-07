'use strict';

const log = require(`../lib/log`);
const registry = require(`../lib/registry`);

module.exports = async uid => {
  log(`Resuming ${uid}...`);
  const pid = await registry.getPid(uid);

  if (pid) { return log(`Already running`); }

  await registry.setAuto(uid, false);
  await registry.addResumeUid(uid);
  const mozzartPid = await registry.getMozzartPid();

  return process.kill(mozzartPid, `SIGCONT`);
};
