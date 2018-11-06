
# Mozzart

Use it to run, watch and restart all your node apps with just one command.

Very useful when developping on a **microservices** architecture.

## Installation

```bash
npm install -g mozzart
```
Add `sudo` if you don't have rights on your system.

## Command Line Usage

```
$ mozzart [action]

actions:
  start           Start all processes found in config file. Default action when non one given
  list            List all processes, running or not with their <uid> and <pid>
  log <uid>       Will output logs for the process <uid>
  resume <uid>    Resume the process referenced by <uid> when it has been manually stopped
  stop <uid>      Stop the process referenced by <uid>
  restart <uid>   Stop (if running) and resume <uid>
  remove <uid>    Stop <uid> and remove it from list. Keep it in config file
  update          Reread config file and stop or start diff
  version         Show current Mozzart version

options:
  -c, --config  The path where config file is located. Absolute or relative from current working dir
```

See [configuration](#configuration) for more informations.

## Configuration

There are 3 ways to give a configuration to Mozzart. In this order, as soon as one exists, Mozzart takes it and stops looking :

  - With a command line configuration argument `--config my-config.js`
  - With a `.mozzart.js` file in the directory you execute `mozzart`
  - With a `.mozzart.js` file in your home directory

### Options

#### `processes`

| Type | Default value |
|-|-|
| `<Array>` | `[]`

The list of processes that Mozzart will run. Each process have these params :

| Param       | Required | Default      | Description                                   |
|-------------|----------|--------------|-----------------------------------------------|
| `cwd`       | true     |              | Directory path where is `file`                |
| `file`      | true     |              | Filename to execute                           |
| `arguments` | false    | []           | List of coma separated command line arguments |
| `watch`     | false    | config.watch | Watch for file changes in `cwd` ?             |
| `sync`      | false    | false        | Waiting for `PROCESS_READY` msg to run next   |

#### `silent`

| Type | Default value |
|-|-|
| `<Boolean>` | `false`

#### `watch`

| Type | Default value |
|-|-|
| `<Boolean>` | `true`

Default value for all processes `watch` param.

#### `prefixTS`

| Type | Default value |
|-|-|
| `<Boolean>` | `true`

If enabled Mozzart will prefix every log line with date and time.

### Example

`~/.mozzart.js`
```javascript
'use strict';

module.exports = {
  processes : [
    {
      cwd  : `~/project/service-1`,
      file : `app.js`,
    },
    {
      cwd  : `~/project/router`,
      file : `index.js`,
    },
    {
      cwd       : `~/project/logger`,
      file      : `app.js`,
      arguments : [`--verbose`]
    },
  ],
};
```