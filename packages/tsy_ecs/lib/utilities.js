"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ID = void 0;

const ID = () => Math.random().toString(36).slice(2);

exports.ID = ID;