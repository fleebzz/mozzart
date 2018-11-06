'use strict';

const { spawn } = require(`child_process`);
const chokidar = require(`chokidar`);
const minimatch = require(`minimatch`);
const path = require(`path`);
const fs = require(`fs-extra`);
const _ = require(`lodash`);
const stop = require(`./stop`);
const resume = require(`./resume`);
const config = require(`../lib/config`);
const StdStream = require(`../lib/StdStream`);
const log = require(`../lib/log`);
const registry = require(`../lib/registry`);

const WATCH_CHANGE_TIMEOUT = 800;
const uidPossibilities = `abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789`;
const uidLength = 4;

const generateUid = () => _.times(uidLength, () => uidPossibilities[_.random(uidPossibilities.length - 1)]).join(``);

const start = def => new Promise(async resolve => { // eslint-disable-line
  def.cwd  = def.cwd.replace(/\/$/g, ``);
  def.name = def.cwd.split(`/`).reverse()[0];
  def.uid = def.uid || generateUid();
  def.watch = typeof def.watch === `boolean` ? def.watch : config.watch;
  def.isKilling = false;
  const spawnOptions = {
    cwd : def.cwd,
    silent : true,
  };
  log(`Starting ${def.uid}...`)
  const proc = spawn(`node`, [def.file, ...def.arguments], spawnOptions);
  const stdPrefix = `[${def.name}][${def.uid}]`;
  const logPath = registry.path(def.uid, false);
  const logStream = fs.createWriteStream(logPath, { flags : `a` });
  if (!config.silent) {
    const stdout = new StdStream(stdPrefix, logStream);
    proc.stdout.on(`data`, data => stdout.liner.write(data));
  }
  const stderr = new StdStream(`${stdPrefix} [error]`, logStream);
  proc.stderr.on(`data`, data => stderr.liner.write(data));

  def.process = proc;

  await registry.registerProcess(proc, def);
  await registry.savePid(def.uid, proc.pid);
  registry.locals.runningDefs[def.uid] = def;

  proc.on(`close`, async () => {
    const runningDef = registry.locals.runningDefs[def.uid];
    if (def.isKilling || !runningDef || registry.locals.isShuttingDown) { return; }

    const isAuto = await registry.isAuto(def.uid);
    const newPid = def.isRestarting ? proc.pid : null;

    await registry.savePid(def.uid, newPid);

    if (isAuto) {
      log(`[mozzart] Process ${def.uid} was killed, restarting...`);
      start(def);
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
    chokidar.watch(def.cwd, { ignoreInitial : true })
    .on(`all`, async (e, path) => {
      const isAuto = await registry.isAuto(def.uid);

      if (!isAuto || def.changeTimeout) { return; }

      def.changeTimeout = setTimeout(async () => {
        let matchIgnored = false;

        ignoredPatterns.forEach(pattern => {
          if (matchIgnored) { return; }
          matchIgnored = minimatch(path, pattern, { dot : true });
        });

        if (!matchIgnored) {
          log(`[mozzart] Process ${def.uid} has changed, restarting...`);

          await stop(def.uid);
          await resume(def.uid);
        }

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
