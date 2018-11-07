'use strict';

const start = require(`./start`);
const stop = require(`./stop`);
const config = require(`../lib/config`);
const log = require(`../lib/log`);
const registry = require(`../lib/registry`);

const startDefs = async () => {
  const defs = await registry.popDefsToStart();

  return Promise.all(defs.map(def => start(def)));
};

const resumeUids = async () => {
  const uids = await registry.popUidsToResume();

  return Promise.all(uids.map(async uid => {
    const def = registry.locals.runningDefs[uid];
    await registry.setAuto(uid);

    return start(def);
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
    startDefs();
    removeUids();
    resumeUids();
  });
  log(`[mozzart] Starting all processes`);
  await Promise.all(config.processes.map(proc =>
    registry.addStartDef(proc)
  ));
  await startDefs();
  log(`[mozzart] All processes are running`);

  registry.locals.isShuttingDown = false;

  process.on(`SIGINT`, async () => {
    if (registry.locals.isShuttingDown) { return; }
    registry.locals.isShuttingDown = true;
    console.log(``); // eslint-disable-line // Line break
    log(`[mozzart] Shutting down all processes`);
    const processes = await registry.getProcesses();
    await Promise.all(
      processes.map(async process => stop(process.uid))
    );
    process.exit(0); // eslint-disable-line
  });
};
