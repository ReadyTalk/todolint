#!/usr/bin/env node
'use strict';

const todolint = require('./todolint.js');

todolint(error => {
  if (error) {
    process.exit(1);
  }
  process.exit();
});
