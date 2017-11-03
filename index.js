#!/usr/bin/env node
'use strict';

let fs = require('fs');
let path = require('path');
let readline = require('readline');
let minimatch = require('minimatch');
let chalk = require('chalk');

let config = require(path.join(process.cwd(), '.todolintrc.json'));

let root = config.root || ".";
let tags = config.tags || [];
let warnLimit = config.warn.limit || null;
let warnTags = config.warn.tags || tags.map(function (tag) { return tag.name; });
let warnMessage = config.warn.message ||
  '⚠ ⚠  WARNING!! There are more than ' + warnLimit +
  ' items that need addressing!! ⚠ ⚠';
let warnFail = config.warn.fail || false;
let ignorePatterns = config.ignore || [];
ignorePatterns = ignorePatterns.concat('.todolintrc.json');

readDirectoryRecursive(root, function (error, results) {
  if (error) {
    console.error(chalk.red(error));
  }

  let itemsToProcess = results.length;
  let totalWarnMessages = 0;

  results.forEach(function (file) {
    let messages = [];
    let fileStream = fs.createReadStream(file.path);
    let reader = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });
    let lineNumber = 0;
    let lineNumberLength = 0;

    reader.on('line', function (line) {
      lineNumber += 1;

      tags.forEach(function (tag) {
        let match = line.match(tag.regex);

        if (match) {
          // Remove beginning of string up to just after the tag match
          let finalMessage = line.slice(match.index + match[0].length);
          let description = '';

          // Capture anything in '()' before the first ':'
          match = finalMessage.match(/^.*\((.*)\).*:/);
          if (match) {
            description = match[1];
            finalMessage = finalMessage.slice(match.index + match[0].length);
          }

          // Remove any preceding ':'
          match = finalMessage.match(/^.*:/);
          if (match) {
            finalMessage = finalMessage.slice(match.index + match[0].length);
          }

          // Remove trailing '*/' comment terminator
          match = finalMessage.match(/\s*\*\/.*$/);
          if (match) {
            finalMessage = finalMessage.slice(0, match.index);
          }

          let chalkStyle = chalk;
          for (let i = 0; i < tag.style.length; i++) {
            chalkStyle = chalkStyle[tag.style[i]];
            if (typeof chalkStyle === 'undefined') {
              console.error(chalk.red('Style "' + tag.style[i] +
                '" is not valid. Tag "' + tag.name + '" skipped.'));
              return;
            }
          }

          messages.push({
            line: lineNumber,
            message: chalkStyle(' ' + tag.label +
              (description.length > 0 ? ' (' + description + ')' : '') +
              ':' + finalMessage + ' ')
          });

          lineNumberLength = ('' + lineNumber).length;

          if (warnTags.indexOf(tag.name) !== -1) {
            totalWarnMessages += 1;
          }
        }
      });
    });

    fileStream.on('end', function () {
      if (messages.length > 0) {
        console.log(chalk.white(file.relativePath));
        messages.forEach(function (msg) {
          let lineString = '[Line ' + padLine(msg.line, lineNumberLength) + '] ';
          console.log(chalk.white(lineString) + msg.message);
        });
      }

      itemsToProcess -= 1;
      if (itemsToProcess == 0) {
        if (warnLimit && totalWarnMessages > warnLimit) {
          console.log('\n' + chalk.red(warnMessage));
          if (warnFail) {
            process.exit(1);
          }
        }
        process.exit(0);
      }
    });

  });

}, itemFilter);

function itemFilter(item) {
  let allowed = true;
  ignorePatterns.forEach(function (pattern) {
    if (minimatch(item, pattern, { dot: true })) {
      allowed = false;
    }
  });
  return allowed;
}

function readDirectoryRecursive(root, done, filter) {
  let results = [];

  fs.readdir(root, function (error, list) {
    if (error) {
      return done(error, results);
    }

    let numItems = list.length;

    // Base case. All items have been processed.
    if (numItems === 0) {
      return done(null, results);
    }

    list.forEach(function (item) {
      item = path.resolve(root, item);
      let itemPath = path.relative(path.basename("."), item);

      fs.stat(item, function (error, stat) {
        if (stat && stat.isDirectory()) {
          // Item is a directory. Do recursive call if not filtered by filter.
          if (filter(itemPath)) {
            readDirectoryRecursive(item, function (error, recursiveResults) {
              if (error) {
                return done(error, results);
              }

              results = results.concat(recursiveResults);
              numItems -= 1;
              if (numItems === 0) {
                return done(null, results);
              }
            }, filter);
          } else {
              numItems -= 1;
              if (numItems === 0) {
                return done(null, results);
              }
          }

        } else {
          // Item is a file. Add it to the list if not filtered by filter.
          if (filter(itemPath)) {
            results.push({
              path: item,
              relativePath: itemPath
            });
          }
          numItems -= 1;
          if (numItems === 0) {
            return done(null, results);
          }
        }
      });
    });
  });
}

function padLine(line, lineNumberLength) {
  let lineString = '' + line;
  while (lineString.length < lineNumberLength) {
    lineString = ' ' + lineString;
  }
  return lineString;
}
