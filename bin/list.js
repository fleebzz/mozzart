'use strict';

const _ = require(`lodash`);
const registry = require(`../lib/registry`);

const DEFAULT_COL_LENGTH = 20;
const DEFAULT_COL_SEPARATOR = ` `;

const writeLine = cols => {
  cols = cols.map((col, colI) => {
    const length = col.length || DEFAULT_COL_LENGTH;
    const separator = col.separator || DEFAULT_COL_SEPARATOR;

    const text = _
    .chain(col.text || ``)
    .padEnd(length, separator)
    .truncate({ length })
    .value();

    let colOutput = `${separator}${text}${separator}|`;

    if (colI === 0) {
      colOutput = `|${colOutput}`;
    }

    return colOutput;
  });

  console.log(cols.join(``));
};

const colsLengthes = [6, 35, 25, 10];
const headers = [`uid`, `name`, `file`, `pid`];
const fields = [`uid`, `name`, `file`, `pid`];

const writeSeparatorLine = () => {
  writeLine(colsLengthes.map(colLength => (
    { length : colLength, separator : `-` }
  )));
};

module.exports = async () => {
  const processes = _.sortBy(await registry.getProcesses(), `name`);

  writeSeparatorLine();

  writeLine(headers.map((header, i) => (
    { text : header, length : colsLengthes[i] }
  )));

  writeSeparatorLine();

  processes.forEach(process =>
    writeLine(fields.map((field, i) => (
      { text : process[field] || ``, length : colsLengthes[i] }
    )))
  );

  writeSeparatorLine();
};
