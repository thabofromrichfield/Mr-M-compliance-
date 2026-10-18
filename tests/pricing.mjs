import assert from 'node:assert/strict';
import ts from 'typescript';
import fs from 'node:fs';
import Module from 'node:module';
const mod = new Module('pricing-test');
mod._compile(ts.transpileModule(fs.readFileSync('src/lib/pricing.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, 'pricing-test.js');
const { detectCost, isValidCost } = mod.exports;
for (const [text, expected] of [
  ['Renewal cost: R 1,850.00', 1850], ['Fee: ZAR 8 500,50', 8500.5],
  ['Fee R 1,850.50. Next sentence.', 1850.5], ['R0.00', 0], ['R 1 850', 1850], ['R1850.00 and R1850.00', 1850],
  ['Subtotal R100.00 Total R115.00', null], ['Expiry: 2027-11-25 Ref: 1850', null],
  ['USD 100.00', null], ['No price printed', null], ['R -100', null],
  ['R12.345', null], ['R1000000000.00', null],
]) assert.equal(detectCost(text), expected, text);
for (const invalid of [-1, Infinity, NaN, '100', 1.001, 1e10]) assert.equal(isValidCost(invalid), false);
for (const valid of [0, 1850, 8500.5, 999999999.99]) assert.equal(isValidCost(valid), true);
console.log('Pricing checks passed: rand formats, free, missing, ambiguous, foreign and invalid prices.');
