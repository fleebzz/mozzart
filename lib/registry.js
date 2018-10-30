'use strict'

const _ = require(`lodash`);
// const moment = require(`moment`);
const os = require(`os`);
const path = require(`path`);
const fs = require(`fs-extra`);
const crypto = require(`crypto`);
const config = require(`./config`);

const registry = {
  $folderPath : null,
  locals : {},
  folderPath () {
    if (registry.$folderPath !== null) {
      return registry.$folderPath;
    }

    const fileHash = crypto
    .createHash(`md5`)
    .update(config.path, `utf8`)
    .digest(`hex`);

    registry.$folderPath = path.resolve(os.tmpdir(), fileHash);

    return registry.$folderPath;
  },
  path (uid) {
    return path.resolve(registry.folderPath(), `${uid}.json`);
  },
  async clean (mozzartPid = null) {
    await fs.emptyDir(registry.folderPath());
    await registry.set({
      uid : `mozzart`,
      pid : mozzartPid,
      uidsToResume : [],
    });
  },
  async ensureFolderPath () {
    return fs.ensureDir(registry.folderPath());
  },
  async registerProcess (process, def) {
    const proc = _.pick(def, [`cwd`, `file`, `arguments`, `name`]);
    proc.isAuto = true;
    proc.uid = process.uid;
    proc.pid = null;

    return registry.set(proc);
  },
  async setAuto (procUid, isAuto = true) {
    const proc = await registry.get(procUid);
    proc.isAuto = isAuto;

    return registry.set(proc);
  },
  async isAuto (procUid) {
    const proc = await registry.get(procUid);

    return proc.isAuto === true;
  },
  async savePid (procUid, procPid) {
    const proc = await registry.get(procUid);
    proc.pid = procPid;

    return registry.set(proc);
  },
  async getPid (uid) {
    const proc = await registry.get(uid);

    return proc.pid;
  },
  async addResumeUid (uid) {
    const mozzReg = await registry.get(`mozzart`);
    mozzReg.uidsToResume.push(uid);

    return registry.set(mozzReg);
  },
  async popUidsToResume () {
    const mozzReg = await registry.get(`mozzart`);
    const uidsToResume = _.clone(mozzReg.uidsToResume);
    mozzReg.uidsToResume = [];

    await registry.set(mozzReg);

    return uidsToResume;
  },
  async getProcesses () {
    const files = await fs.readdir(registry.folderPath());

    const processFiles = _.filter(files, file =>
      _.endsWith(file, `.json`) && file.length === `xxxx.json`.length
    ).map(file =>
      path.resolve(registry.folderPath(), file)
    );

    const filesContents = await Promise.all(processFiles.map(
      file => fs.readJson(file, { throws : false })
    ));

    return _.filter(filesContents, content => content !== null);
  },
  async get (uid) {
    await registry.ensureFolderPath();
    const registryPath = registry.path(uid);

    return fs.readJson(registryPath);
  },
  async set (content) {
    await registry.ensureFolderPath();
    const registryPath = registry.path(content.uid);

    return fs.outputJson(registryPath, content);
  },
};

module.exports = registry;
