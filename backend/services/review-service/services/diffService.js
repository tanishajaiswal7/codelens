import { diffLines } from 'diff';

export const diffService = {
  computeChangedLineNumbers(originalCode, updatedCode) {
    const diffs = diffLines(originalCode, updatedCode);
    const changedLines = [];
    let lineNumber = 1;

    for (const part of diffs) {
      const lines = part.value.split('\n').filter((_, i, arr) => i < arr.length - 1 || part.value.endsWith('\n'));

      if (part.added || part.removed) {
        for (let i = 0; i < lines.length; i += 1) {
          changedLines.push(lineNumber + i);
        }
      }

      if (!part.removed) {
        lineNumber += lines.length;
      }
    }

    return [...new Set(changedLines)].filter((line) => line > 0);
  },

  buildChangedContext(originalCode, updatedCode, contextLines = 5) {
    const changedLineNums = this.computeChangedLineNumbers(originalCode, updatedCode);
    if (changedLineNums.length === 0) {
      return {
        changedLineNumbers: [],
        contextBlock: '',
        totalChangedLines: 0,
      };
    }

    const updatedLines = updatedCode.split('\n');
    const relevantLineNums = new Set();

    for (const lineNum of changedLineNums) {
      for (
        let i = Math.max(1, lineNum - contextLines);
        i <= Math.min(updatedLines.length, lineNum + contextLines);
        i += 1
      ) {
        relevantLineNums.add(i);
      }
    }

    const sortedNums = [...relevantLineNums].sort((a, b) => a - b);
    let result = '';
    let lastNum = null;

    for (const num of sortedNums) {
      if (lastNum && num > lastNum + 1) {
        result += '...\n';
      }

      const marker = changedLineNums.includes(num) ? '>>' : '  ';
      result += `${marker}${num}: ${updatedLines[num - 1]}\n`;
      lastNum = num;
    }

    console.log('[DIFF]', this.buildChangedContext(originalCode, updatedCode));

    return {
      changedLineNumbers: changedLineNums,
      contextBlock: result,
      totalChangedLines: changedLineNums.length,
    };
  },
};
