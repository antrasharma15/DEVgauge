const escomplex = require('typhonjs-escomplex');
const { execFile } = require('child_process');

/**
 * Analyzes JavaScript code using typhonjs-escomplex and returns normalized complexity metrics.
 * 
 * @param {string} code - The source code to analyze.
 * @returns {Object} - Normalized metrics: { fileComplexity, avgFunctionComplexity, numFunctions, numClasses, linesOfCode, functions }
 */
const getJSComplexity = (code) => {
  try {
    const report = escomplex.analyzeModule(code);
    
    // 1. Extract root-level methods
    const rootFunctions = (report.methods || []).map(method => ({
      name: method.name || 'anonymous',
      complexity: method.cyclomatic || 1,
      lineStart: method.lineStart || 1,
      lineEnd: method.lineEnd || 1
    }));

    // 2. Extract class-level methods
    const classFunctions = [];
    if (report.classes) {
      report.classes.forEach(cls => {
        if (cls.methods) {
          cls.methods.forEach(method => {
            classFunctions.push({
              name: `${cls.name || 'AnonymousClass'}.${method.name || 'anonymous'}`,
              complexity: method.cyclomatic || 1,
              lineStart: method.lineStart || 1,
              lineEnd: method.lineEnd || 1
            });
          });
        }
      });
    }

    const functions = [...rootFunctions, ...classFunctions];
    const numFunctions = functions.length;
    const numClasses = (report.classes || []).length;
    
    // Total file cyclomatic complexity
    const fileComplexity = report.aggregate?.cyclomatic || 1;
    
    // Compute average function complexity
    const avgFunctionComplexity = numFunctions > 0
      ? parseFloat((functions.reduce((sum, fn) => sum + fn.complexity, 0) / numFunctions).toFixed(2))
      : 0.00;

    // Count total lines of code
    const linesOfCode = code.split(/\r?\n/).length;

    return {
      fileComplexity,
      avgFunctionComplexity,
      numFunctions,
      numClasses,
      linesOfCode,
      functions
    };
  } catch (err) {
    throw new Error(`JavaScript complexity analysis failed: ${err.message}`);
  }
};

/**
 * Analyzes Python code using Radon CLI via execFile and returns normalized complexity metrics.
 * 
 * @param {string} filePath - Path to the Python file.
 * @returns {Promise<Object>} - Normalized metrics: { fileComplexity, avgFunctionComplexity, numFunctions, numClasses, linesOfCode, functions }
 */
const getPythonComplexity = (filePath) => {
  return new Promise((resolve, reject) => {
    // 1. Run radon cc -j (Cyclomatic Complexity)
    execFile('python', ['-m', 'radon', 'cc', filePath, '-j'], { timeout: 10000 }, (ccErr, ccStdout, ccStderr) => {
      if (ccErr && ccErr.killed) {
        return reject(new Error('Radon complexity analysis timed out.'));
      }
      
      // 2. Run radon raw -j (Raw metrics: LOC, comments, blanks)
      execFile('python', ['-m', 'radon', 'raw', filePath, '-j'], { timeout: 10000 }, (rawErr, rawStdout, rawStderr) => {
        if (rawErr && rawErr.killed) {
          return reject(new Error('Radon raw metrics analysis timed out.'));
        }

        try {
          const parsedCC = JSON.parse(ccStdout);
          const parsedRaw = JSON.parse(rawStdout);

          // Get first keys to be path-agnostic
          const ccKey = Object.keys(parsedCC)[0];
          const rawKey = Object.keys(parsedRaw)[0];

          const ccList = parsedCC[ccKey] || [];
          const rawMetrics = parsedRaw[rawKey] || {};

          // Filter out function and class-method elements
          const functions = ccList
            .filter(item => item.type === 'function' || item.type === 'method')
            .map(item => ({
              name: item.name || 'anonymous',
              complexity: item.complexity || 1,
              lineStart: item.lineno || 1,
              lineEnd: item.endline || 1
            }));

          const numFunctions = functions.length;
          const numClasses = ccList.filter(item => item.type === 'class').length;
          
          // Max complexity of any single block is used as the file-level indicator
          const fileComplexity = ccList.reduce((max, item) => Math.max(max, item.complexity), 1);
          
          // Compute average function complexity
          const avgFunctionComplexity = numFunctions > 0
            ? parseFloat((functions.reduce((sum, fn) => sum + fn.complexity, 0) / numFunctions).toFixed(2))
            : 0.00;

          const linesOfCode = rawMetrics.loc || 0;

          resolve({
            fileComplexity,
            avgFunctionComplexity,
            numFunctions,
            numClasses,
            linesOfCode,
            functions
          });
        } catch (parseErr) {
          reject(new Error(`Failed to parse Radon complexity output: ${parseErr.message}`));
        }
      });
    });
  });
};

module.exports = {
  getJSComplexity,
  getPythonComplexity
};
