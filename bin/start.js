'use strict';

const { spawn } = require(`child_process`);
const watch = require(`node-watch`);
const minimatch = require(`minimatch`);
const path = require(`path`);
const fs = require(`fs-extra`);
const _ = require(`lodash`);
const findProcess = require(`find-process`);
const stop = require(`./stop`);
const config = require(`../lib/config`);
const env = require(`../lib/env`);
const log = require(`../lib/log`);
const registry = require(`../lib/registry`);

const WATCH_CHANGE_TIMEOUT = 800;

const start = def => new Promise(async resolve => { // eslint-disable-line
  def.isRestarting = false;
  const spawnOptions = {
    cwd : def.cwd,
    silent : true,
  };
  const fullPath = path.join(def.cwd, def.file);
  log(`Starting ${def.uid} - ${fullPath}...`);
  const fileExists = await fs.pathExists(fullPath);
  if (!fileExists) {
    return log(`[ERROR] Path ${fullPath} does not exist`);
  }
  const proc = spawn(`node`, [def.file, ...def.arguments], spawnOptions);
  const logPath = env.logPath(def.uid);
  const logStream = fs.createWriteStream(logPath, { flags : `a` });
  if (!config.silent) {
    proc.stdout.pipe(logStream);
  }
  proc.stderr.pipe(logStream);

  def.process = proc;

  await registry.savePid(def.uid, proc.pid);
  registry.locals.runningDefs[def.uid] = def;

  proc.on(`close`, async () => {
    const runningProcessList = await findProcess(`pid`, def.process.pid);

    const runningDef = registry.locals.runningDefs[def.uid];
    if (def.isRestarting || !runningDef || registry.locals.isShuttingDown || runningProcessList.length) { return; }

    const isAuto = await registry.isAuto(def.uid);

    if (isAuto) {
      const newPid = def.isRestarting ? proc.pid : null;
      await registry.savePid(def.uid, newPid);
      def.isRestarting = true;
      log(`[mozzart] Process ${def.uid} was killed, restarting...`);
      await start(def);
      setTimeout(() => {
        def.isRestarting = false;
      }, WATCH_CHANGE_TIMEOUT);
    }
  });

  if (def.watch) {
    const ignoreFilePath = path.resolve(def.cwd, `.foreverignore`);
    let ignoredPatterns = [];
    try {
      ignoredPatterns = await fs.readFile(ignoreFilePath, `utf8`);
      ignoredPatterns = _.filter((ignoredPatterns || ``).split(`\n`), ignoreLine =>
        !ignoreLine.match(/^[\s]*#/) && !ignoreLine.match(/^[\s]*$/)
      );
    } catch (e) {}
    const watchOpts = {
      recursive : true,
      filter (file) {
        let matchIgnored = false;

        ignoredPatterns.forEach(pattern => {
          if (matchIgnored) { return; }
          matchIgnored = minimatch(file, pattern, { dot : true });
        });

        return !matchIgnored;
      },
    };
    watch(def.cwd, watchOpts, async () => {
      const isAuto = await registry.isAuto(def.uid);

      if (!isAuto || def.changeTimeout || def.isRestarting) { return; }

      def.isRestarting = true;
      await registry.setAuto(def.uid, false);
      def.changeTimeout = setTimeout(async () => {
        log(`[mozzart] Process ${def.uid} has changed, restarting...`);
        await stop(def.uid);
        await start(def);
        await registry.setAuto(def.uid);
        def.isRestarting = false;

        Reflect.deleteProperty(def, `changeTimeout`);
      }, WATCH_CHANGE_TIMEOUT);
    });
  }

  if (def.sync !== true) { return resolve(proc); }

  proc.on(`message`, msg => {
    if (msg === `PROCESS_READY`) { return resolve(proc); }
  });
});

module.exports = start;
