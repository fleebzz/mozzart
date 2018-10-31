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
    await registry.set({ uid : `mozzart`, pid : mozzartPid });
    await registry.set({ uid : `mozzart.defsToStart`, defs : [] });
    await registry.set({ uid : `mozzart.uidsToResume`, uids : [] });
    await registry.set({ uid : `mozzart.uidsToRemove`, uids : [] });
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
    if (!proc.uid) { return null; }
    proc.isAuto = isAuto;

    return registry.set(proc);
  },
  async isAuto (procUid) {
    const proc = await registry.get(procUid);

    return proc.isAuto === true;
  },
  async savePid (procUid, procPid) {
    const proc = await registry.get(procUid);
    if (!proc.uid) { return null; }
    proc.pid = procPid;

    return registry.set(proc);
  },
  async getPid (uid) {
    const proc = await registry.get(uid);

    return proc.pid;
  },
  async addStartDef (def) {
    const defsToStartReg = await registry.get(`mozzart.defsToStart`);
    defsToStartReg.defs.push(def);

    return registry.set(defsToStartReg);
  },
  async addResumeUid (uid) {
    const proc = await registry.get(uid);
    if (!proc.uid) { return null; }

    const uidsToResumeReg = await registry.get(`mozzart.uidsToResume`);
    uidsToResumeReg.uids.push(uid);

    return registry.set(uidsToResumeReg);
  },
  async addRemoveUid (uid) {
    const proc = await registry.get(uid);
    if (!proc.uid) { return null; }

    const uidsToRemoveReg = await registry.get(`mozzart.uidsToRemove`);
    uidsToRemoveReg.uids.push(uid);

    return registry.set(uidsToRemoveReg);
  },
  async popDefsToStart () {
    const defsToStartReg = await registry.get(`mozzart.defsToStart`);
    const defsToStart = _.clone(defsToStartReg.defs);
    defsToStartReg.defs = [];

    await registry.set(defsToStartReg);

    return defsToStart || [];
  },
  async popUidsToResume () {
    const uidsToResumeReg = await registry.get(`mozzart.uidsToResume`);
    const uidsToResume = _.clone(uidsToResumeReg.uids);
    uidsToResumeReg.uids = [];

    await registry.set(uidsToResumeReg);

    return uidsToResume || [];
  },
  async popUidsToRemove () {
    const uidsToRemoveReg = await registry.get(`mozzart.uidsToRemove`);
    const uidsToRemove = _.clone(uidsToRemoveReg.uids);
    uidsToRemoveReg.uids = [];

    await registry.set(uidsToRemoveReg);

    return uidsToRemove || [];
  },
  async removeUid (uid) {
    const registryPath = registry.path(uid);

    return fs.remove(registryPath);
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
    let regContent = {};

    try {
      regContent = await fs.readJson(registryPath);
    } catch (e) {}

    return regContent;
  },
  async set (content) {
    if (!content.uid) { return Promise.resolve({}); }

    // if (content.uid === `mozzart`) {
    //   console.log(`writing in mozzart.json`);
    // }

    await registry.ensureFolderPath();
    const registryPath = registry.path(content.uid);

    return fs.outputJson(registryPath, content);
  },
};

module.exports = registry;
