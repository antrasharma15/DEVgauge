const { execFile } = require('child_process');
const path = require('path');

/**
 * Runs ESLint on a given JavaScript/TypeScript file path.
 * Uses child_process.execFile to run local ESLint bin in node.
 * 
 * @param {string} filePath - Absolute path to the file to analyze.
 * @returns {Promise<Array>} - Normalized findings array.
 */
const runESLint = (filePath) => {
  return new Promise((resolve, reject) => {
    const eslintBin = path.resolve(__dirname, '..', 'node_modules', 'eslint', 'bin', 'eslint.js');
    
    // Set execution timeout to 10 seconds (10000ms) to prevent hanging
    execFile('node', [eslintBin, '--format', 'json', filePath], { timeout: 10000 }, (error, stdout, stderr) => {
      // 1. Handle timeouts explicitly
      if (error && (error.killed || error.code === 'ETIMEDOUT')) {
        return reject(new Error('TIMEOUT'));
      }

      // 2. Parse output if available
      if (stdout) {
        try {
          const results = JSON.parse(stdout);
          const fileResult = results[0];
          
          if (!fileResult || !fileResult.messages) {
            return resolve([]);
          }
          
          const normalized = fileResult.messages.map(msg => ({
            severity: msg.severity === 2 ? 'error' : 'warning',
            issue: msg.ruleId || 'parser-error',
            explanation: msg.message,
            line_number: msg.line || 1
          }));
          
          return resolve(normalized);
        } catch (parseErr) {
          // Reject for syntax output parsing errors so the caller can handle it
          return reject(new Error(`Failed to parse linter output: ${parseErr.message}`));
        }
      }
      
      // 3. Handle execution/binary crash failures
      if (error) {
        return reject(new Error(`Linter execution failed: ${error.message}`));
      }
      
      resolve([]);
    });
  });
};

/**
 * Runs Pylint on a given Python file path.
 * Uses child_process.execFile calling the python -m pylint wrapper.
 * 
 * @param {string} filePath - Absolute path to the file to analyze.
 * @returns {Promise<Array>} - Normalized findings array.
 */
const runPylint = (filePath) => {
  return new Promise((resolve, reject) => {
    // Set execution timeout to 10 seconds (10000ms) to prevent hanging
    execFile('python', ['-m', 'pylint', '--output-format=json', filePath], { timeout: 10000 }, (error, stdout, stderr) => {
      // 1. Handle timeouts explicitly
      if (error && (error.killed || error.code === 'ETIMEDOUT')) {
        return reject(new Error('TIMEOUT'));
      }

      // 2. Parse output if available
      if (stdout) {
        try {
          const results = JSON.parse(stdout);
          
          const normalized = results.map(msg => {
            let severity = 'info';
            const type = msg.type ? msg.type.toLowerCase() : 'convention';
            
            if (type === 'error' || type === 'fatal') {
              severity = 'error';
            } else if (type === 'warning') {
              severity = 'warning';
            }
            
            return {
              severity,
              issue: msg.symbol || 'code-style-convention',
              explanation: msg.message || 'Linter convention warning',
              line_number: msg.line || 1
            };
          });
          
          return resolve(normalized);
        } catch (parseErr) {
          return reject(new Error(`Failed to parse pylint output: ${parseErr.message}`));
        }
      }
      
      // 3. Handle execution failures
      if (error) {
        return reject(new Error(`Linter execution failed: ${error.message}`));
      }
      
      resolve([]);
    });
  });
};

module.exports = {
  runESLint,
  runPylint
};
