import { test } from 'node:test';
import assert from 'node:assert/strict';
import { invoice } from './ledger.mjs';
test('decimal invoice arithmetic', () => assert.equal(invoice([['19.99',3],['0.10',7]]),'60.67'));
test('discount and half-up rounding', () => assert.equal(invoice([['0.05',1]],1000),'0.05'));
test('large values preserve integer precision', () => assert.equal(invoice([['9007199254740993.01',2]]),'18014398509481986.02'));
test('invalid input is rejected', () => { for (const [p,q] of [['-1.00',1],['1.00',-1],['1.00',0.5],['1',1]]) assert.throws(() => invoice([[p,q]])); });
test('invalid discounts are rejected', () => { for (const d of [-1,10001,0.5]) assert.throws(() => invoice([],d)); });
test('empty and full-discount invoices', () => { assert.equal(invoice([]),'0.00'); assert.equal(invoice([['12.34',4]],10000),'0.00'); });
