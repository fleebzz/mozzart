'use strict';

const forever = require(`forever-monitor`);
const chokidar = require(`chokidar`);
const path = require(`path`);
const fs = require(`fs-extra`);
const _ = require(`lodash`);
const StdStream = require(`../lib/StdStream`);
const config = require(`../lib/config`);
const log = require(`../lib/log`);
const registry = require(`../lib/registry`);

const WATCH_CHANGE_TIMEOUT = 800;

let defIndex = 0;

const runDef = def => new Promise(async resolve => { // eslint-disable-line
  def.cwd  = def.cwd.replace(/\/$/g, ``);
  def.name = def.cwd.split(`/`).reverse()[0];
  def.watch = typeof def.watch === `boolean` ? def.watch : config.watch;
  def.isKilling = false;
  const foreverOptions = {
    max           : 1,
    silent        : true,
    args          : def.arguments,
    sourceDir     : def.cwd,
    cwd           : def.cwd,
    fork          : true,
    minUpTime     : 2000,
    spinSleepTime : 200,
  };
  const proc = new forever.Monitor(def.file, foreverOptions);
  const stdPrefix = `[${def.name}][${proc.uid}]`;
  if (!config.silent) {
    const stdout = new StdStream(`${stdPrefix}`);
    proc.on(`stdout`, data => stdout.liner.write(data));
  }
  const stderr = new StdStream(`${stdPrefix} [error]`);
  proc.on(`stderr`, data => stderr.liner.write(data));
  def.process = proc;

  proc.on(`start`, async () => {
    await registry.registerProcess(proc, def);
    await registry.savePid(proc.uid, proc.child.pid);
    registry.locals.runningDefs[proc.uid] = def;
  });

  proc.on(`exit:code`, async () => {
    if (def.isKilling) { return; }

    const isAuto = await registry.isAuto(proc.uid);
    const newPid = def.isRestarting ? proc.child.pid : null;

    await registry.savePid(proc.uid, newPid);

    if (isAuto) {
      proc.start();
    }
  });

  proc.start();

  if (def.watch) {
    const ignoreFilePath = path.resolve(def.cwd, `.foreverignore`);
    let ignoredPatterns = [];
    try {
      ignoredPatterns = await fs.readFile(ignoreFilePath, `utf8`);
      ignoredPatterns = _.filter((ignoredPatterns || ``).split(`\n`), ignoreLine =>
        !ignoreLine.match(/^[\s]*#/) && !ignoreLine.match(/^[\s]*$/)
      );
    } catch (e) {}
    const ignored = ignoredPatterns.map(
      ignoredItem => `${def.cwd}/${ignoredItem}`
    );
    chokidar.watch(def.cwd, {
      ignoreInitial : true,
      ignored,
    })
    .on(`all`, async () => {
      const isAuto = await registry.isAuto(proc.uid);

      if (!isAuto || def.changeTimeout) { return; }

      def.changeTimeout = setTimeout(() => {
        log(`[mozzart] Process ${proc.uid} has changed, restarting...`);

        try { proc.stop(); } catch (e) {}

        Reflect.deleteProperty(def, `changeTimeout`);
      }, WATCH_CHANGE_TIMEOUT);

    });
  }

  if (def.sync !== true) { return resolve(proc); }

  proc.on(`message`, msg => {
    if (msg === `PROCESS_READY`) { return resolve(proc); }
  });
});

const runNextDef = async () => {
  const def = config.processes[defIndex];
  const timeout = config.wait || 1;
  if (!def) {
    return log(`[mozzart] All processes are running`);
  }
  await runDef(def);

  return setTimeout(() => {
    defIndex++;
    runNextDef();
  }, timeout);
};

const resumeUids = async () => {
  const uids = await registry.popUidsToResume();

  return Promise.all(uids.map(async uid => {
    const def = registry.locals.runningDefs[uid];
    await registry.setAuto(uid);

    return def.process.start();
  }));
};

module.exports = async () => {
  log(`[mozzart] Cleaning registry`);
  await registry.clean(process.pid);
  registry.locals.runningDefs = {};
  process.on(`SIGCONT`, () => resumeUids());
  log(`[mozzart] Starting all processes`);
  runNextDef();
};
