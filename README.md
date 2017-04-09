
# Mozzart

Use it to run, watch and restart all your node apps with just one command.

Very useful when developping on a **microservices** architecture.

## Installation

```bash
npm install -g mozzart
```
Add `sudo` if you don't have rights on your system.

## Run

```bash
mozzart
```
That's all. See [configuration](#configuration) for more informations.

## Configuration

There are 3 ways to give a configuration to Mozzart. In this order, as soon as one exists, Mozzart takes it and stops looking :

  - With a command line configuration argument `--config=my-config.js`
  - With a `.mozzart.js` file in the directory you execute `mozzart`
  - With a `.mozzart.js` file in your home directory

### Options

#### `processes`

| Type | Default value |
|-|-|
| `<Array>` | `[]`

The list of processes that Mozzart will run. Each process have these params :

| Param       | Required | Description                                   |
|-------------|----------|-----------------------------------------------|
| `cwd`       | true     | Directory path where is `file`                |
| `file`      | true     | Filename to execute                           |
| `arguments` | false    | List of coma separated command line arguments |

#### `silent`

| Type | Default value |
|-|-|
| `<Boolean>` | `false`

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