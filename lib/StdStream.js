'use strict';

/* eslint no-underscore-dangle: "off" */
/* eslint no-magic-numbers: "off" */

const stream = require(`stream`);

module.exports = function StdStream (prefix, logStream) {
  this.prefix = prefix || ``;
  this.liner = new stream.Transform({ objectMode: true });
  this.line = null;
  this.liner.on(`readable`, () => {
    while ((this.line = this.liner.read()) !== null) {
      logStream.write(`${this.prefix} ${this.line}\n`);
    }
  });
  this.liner._transform = function _transform (chunk, encoding, done) {
    let data = chunk.toString();
    if (this._lastLineData) { data = this._lastLineData + data; }

    const lines = data.split(`\n`);
    this._lastLineData = lines.splice(lines.length - 1, 1)[0];

    lines.forEach(this.push.bind(this));
    done();
  };

  this.liner._flush = function _flush (done) {
    if (this._lastLineData) { this.push(this._lastLineData); }
    this._lastLineData = null;
    done();
  };
};
