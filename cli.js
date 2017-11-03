#!/usr/bin/env node
'use strict';

let todolint = require('./todolint.js');

todolint(function (error) {
  if (error) {
    process.exit(1);
  }
  process.exit();
});
