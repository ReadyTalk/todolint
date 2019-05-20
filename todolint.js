'use strict';

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const minimatch = require('minimatch');
const chalk = require('chalk');

let config = { warn: {} };
const configFile = path.join(process.cwd(), '.todolintrc.json');
if (fs.existsSync(configFile)) {
  config = require(configFile);
}

let root = config.root || ['.'];
const tags = config.tags || [];
const warnFail = config.warn.fail || false;
const warnLimit = config.warn.limit || (warnFail ? 0 : null);
const warnTags = config.warn.tags || tags.map(tag => tag.name);
const defaultWarning = `⚠ ⚠  WARNING!! There are ${warnLimit ? `more than ${warnLimit} ` : ''}items that need addressing!! ⚠ ⚠`;
const warnMessage = config.warn.message || (warnLimit !== null ? defaultWarning : '');
let ignorePatterns = config.ignore || [];
ignorePatterns = ignorePatterns.concat('.todolintrc.json');

function todolint(onComplete) {
  if (typeof onComplete === 'undefined') {
    onComplete = function () {};
  }

  if (typeof root === 'string') {
    root = [root];
  }
  if (!Array.isArray(root)) {
    console.error(chalk.red(`"${root}" is not valid. Must be a string or array of strings.`));
    onComplete('Invalid root');
  }

  let rootsToProcess = root.length;
  root.forEach(dir => {
    readDirectoryRecursive(dir, (error, results) => {
      if (error) {
        console.error(chalk.red(error));
      }

      let itemsToProcess = results.length;
      let totalWarnMessages = 0;

      results.forEach(file => {
        const messages = [];
        const fileStream = fs.createReadStream(file.path);
        const reader = readline.createInterface({
          input: fileStream,
          crlfDelay: Infinity
        });
        let lineNumber = 0;
        let lineNumberLength = 0;

        reader.on('line', line => {
          lineNumber += 1;

          tags.forEach(tag => {
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
                  console.error(chalk.red(`Style "${tag.style[i]}" is not valid. Tag "${tag.name}" skipped.`));
                  return;
                }
              }

              messages.push({
                line: lineNumber,
                message: chalkStyle(` ${tag.label}${(description.length > 0 ? ` (${description})` : '')}:${finalMessage} `)
              });

              lineNumberLength = (lineNumber.toString()).length;

              if (warnTags.indexOf(tag.name) !== -1) {
                totalWarnMessages += 1;
              }
            }
          });
        });

        fileStream.on('end', () => {
          if (messages.length > 0) {
            console.log(file.relativePath);
            messages.forEach(msg => {
              const lineString = `[Line ${padLine(msg.line, lineNumberLength)}] `;
              console.log(chalk.white(lineString) + msg.message);
            });
          }

          itemsToProcess -= 1;
          if (itemsToProcess === 0) {
            rootsToProcess -= 1;
            if (rootsToProcess === 0) {
              if (warnLimit !== null && totalWarnMessages > warnLimit) {
                console.log(`\n${chalk.red(warnMessage)}`);
                if (warnFail) {
                  onComplete(warnMessage);
                  return;
                }
              }

              onComplete();
              return;
            }
          }
        });

      });

    }, itemFilter);
  });
}

function itemFilter(item) {
  let allowed = true;
  ignorePatterns.forEach(pattern => {
    if (minimatch(item, pattern, { dot: true })) {
      allowed = false;
    }
  });
  return allowed;
}

function readDirectoryRecursive(dir, done, filter) {
  let results = [];

  fs.readdir(dir, (error, list) => {
    if (error) {
      return done(error, results);
    }

    let numItems = list.length;

    // Base case. All items have been processed.
    if (numItems === 0) {
      return done(null, results);
    }

    list.forEach(item => {
      item = path.resolve(dir, item);
      const itemPath = path.relative(path.basename('.'), item);

      fs.stat(item, (error, stat) => {
        if (stat && stat.isDirectory()) {
          // Item is a directory. Do recursive call if not filtered by filter.
          if (filter(itemPath)) {
            readDirectoryRecursive(item, (error, recursiveResults) => {
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
  let lineString = line.toString();
  while (lineString.length < lineNumberLength) {
    lineString = ` ${lineString}`;
  }
  return lineString;
}

module.exports = todolint;
