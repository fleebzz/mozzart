'use strict'

const _ = require(`lodash`);
const fs = require(`fs-extra`);
const config = require(`./config`);
const env = require(`./env`);
const storage = require(`./storage`);

const uidPossibilities = `abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789`;
const uidLength = 4;

const boolToInt = isAuto => {
  if (isAuto) { return 1; }

  return 0;
};

const registry = {
  locals : {},
  generateUid () {
    return _.times(uidLength, () => uidPossibilities[_.random(uidPossibilities.length - 1)]).join(``);
  },
  async ensureFolderPath () {
    return fs.ensureDir(registry.folderPath());
  },
  async clean (mozzartPid = null) {
    await fs.emptyDir(env.folderPath());
    storage.db().prepare(`DROP TABLE IF EXISTS mozzart;`).run();
    storage.db().prepare(`DROP TABLE IF EXISTS processes;`).run();
    storage.db().prepare(`DROP TABLE IF EXISTS defstostart;`).run();
    storage.db().prepare(`DROP TABLE IF EXISTS uidstoresume;`).run();
    storage.db().prepare(`DROP TABLE IF EXISTS uidstoremove;`).run();
    storage.db().prepare(`CREATE TABLE mozzart (pid TEXT);`).run();
    storage.db().prepare(`CREATE TABLE processes (uid TEXT, cwd TEXT, file TEXT, arguments TEXT, name TEXT, watch INTEGER, isAuto INTEGER, pid INTEGER, status TEXT);`).run();
    storage.db().prepare(`CREATE TABLE defstostart (def TEXT);`).run();
    storage.db().prepare(`CREATE TABLE uidstoresume (uid TEXT);`).run();
    storage.db().prepare(`CREATE TABLE uidstoremove (uid TEXT);`).run();
    storage.db().prepare(`INSERT INTO mozzart (pid) VALUES (?)`).run(mozzartPid);
  },
  async getMozzartPid () {
    const { pid } = storage.db().prepare(`SELECT pid FROM mozzart;`).get();

    return pid;
  },
  async registerProcess (def) {
    const proc = _.pick(def, [`cwd`, `file`, `arguments`, `name`, `watch`, `uid`, `pid`, `isAuto`, `status`]);
    proc.arguments = JSON.stringify(proc.arguments);
    proc.isAuto = boolToInt(_.isBoolean(proc.isAuto) ? proc.isAuto : true);
    proc.watch = boolToInt(proc.watch);
    proc.pid = _.isNumber(proc.pid) ? proc.pid : null;
    proc.status = proc.status || ``;
    storage.db().prepare(`DELETE FROM processes WHERE uid = ?`).run(proc.uid);
    storage.db().prepare(`INSERT INTO processes (uid, cwd, file, arguments, name, watch, isAuto, pid, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`)
    .run(proc.uid, proc.cwd, proc.file, proc.arguments, proc.name, proc.watch, proc.isAuto, proc.pid, proc.status);
  },
  async updateProc (uid, values) {
    _.map(values, (value, field) =>
      storage.db().prepare(`UPDATE processes SET ${field} = ? WHERE uid = ?;`).run(value, uid)
    );
  },
  async setAuto (uid, isAuto = true) {
    isAuto = boolToInt(isAuto);

    return registry.updateProc(uid, { isAuto });
  },
  async isAuto (uid) {
    const { isAuto } = storage.db().prepare(`SELECT isAuto FROM processes WHERE uid = ?;`).get(uid);

    return Boolean(isAuto);
  },
  async savePid (uid, pid) {
    return registry.updateProc(uid, { pid });
  },
  async getPid (uid) {
    const { pid } = storage.db().prepare(`SELECT pid FROM processes WHERE uid = ?;`).get(uid);

    return pid;
  },
  parseDef (def) {
    return {
      ...def,
      arguments : JSON.parse(def.arguments),
      isAuto : Boolean(def.isAuto),
    };
  },
  async addStartDef (def) {
    return registry.registerProcess({
      ...def,
      cwd : def.cwd.replace(/\/$/g, ``),
      name : def.name || def.cwd.split(`/`).reverse()[0],
      uid : def.uid || registry.generateUid(),
      watch : typeof def.watch === `boolean` ? def.watch : config.watch,
      status : `start`,
    });
  },
  async addResumeUid (uid) {
    return registry.updateProc(uid, { status : `resume` });
  },
  async addRemoveUid (uid) {
    return registry.updateProc(uid, { status : `remove` });
  },
  async popDefsToStart () {
    const procs = await registry.popForStatus(`start`);

    return procs.map(proc => registry.parseDef(proc));
  },
  async popForStatus (status) {
    const procs = storage.db().prepare(`SELECT * FROM processes WHERE status = ?`).all(status);
    procs.forEach(proc =>
      registry.updateProc(proc.uid, { status : `` })
    );

    return procs;
  },
  async popUidsToResume () {
    const procs = await registry.popForStatus(`resume`);

    return _.map(procs, `uid`);
  },
  async popUidsToRemove () {
    const procs = await registry.popForStatus(`remove`);

    return _.map(procs, `uid`);
  },
  async removeUid (uid) {
    return storage.db().prepare(`DELETE FROM processes WHERE uid = ?;`).run(uid);
  },
  async getProcesses () {
    const procs = storage.db().prepare(`SELECT * FROM processes`).all();

    return procs.map(proc => registry.parseDef(proc));
  },
};

module.exports = registry;
