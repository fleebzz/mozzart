'use strict';

const start = require(`./start`);
const config = require(`../lib/config`);
const log = require(`../lib/log`);
const registry = require(`../lib/registry`);

let defIndex = 0;

const runNextDef = async () => {
  const def = config.processes[defIndex];
  const timeout = config.wait || 1;
  if (!def) {
    return log(`[mozzart] All processes are running`);
  }
  await start(def);

  return setTimeout(() => {
    defIndex++;
    runNextDef();
  }, timeout);
};

const startDefs = async () => {
  const defs = await registry.popDefsToStart();

  return Promise.all(defs.map(def => start(def)));
};

const resumeUids = async () => {
  const uids = await registry.popUidsToResume();

  return Promise.all(uids.map(async uid => {
    const def = registry.locals.runningDefs[uid];
    await registry.setAuto(uid);

    return def.process.start();
  }));
};

const removeUids = async () => {
  const uids = await registry.popUidsToRemove();

  return Promise.all(uids.map(async uid => {
    Reflect.deleteProperty(registry.locals.runningDefs, uid);

    return registry.removeUid(uid);
  }));
};

module.exports = async () => {
  log(`[mozzart] Cleaning registry`);
  await registry.clean(process.pid);
  registry.locals.runningDefs = {};
  process.on(`SIGCONT`, () => {
    startDefs(),
    removeUids();
    resumeUids();
  });
  log(`[mozzart] Starting all processes`);
  runNextDef();
};
