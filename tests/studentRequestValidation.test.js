import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeStudentPhone } from '../src/lib/studentPhone.js';
import { prepareStudentRequest, preparePreferenceRequest } from '../src/lib/studentRequestValidation.js';

test('normalizes local, international and localized phone digits consistently', () => {
  for (const phone of ['01128472424', '+20 112 847 2424', '٢٠١١٢٨٤٧٢٤٢٤', '۰۱۱۲۸۴۷۲۴۲۴']) {
    assert.equal(normalizeStudentPhone(phone), '201128472424');
  }
  assert.equal(normalizeStudentPhone('+44 7700 900123'), '447700900123');
});

test('requires a name and usable contact and trims the name', () => {
  assert.throws(() => prepareStudentRequest({ student_name: ' ', whatsapp: '01128472424' }));
  assert.throws(() => prepareStudentRequest({ student_name: 'أحمد', whatsapp: '' }));
  assert.throws(() => prepareStudentRequest({ student_name: 'أحمد', whatsapp: '123' }));
  assert.deepEqual(prepareStudentRequest({ student_name: ' أحمد ', whatsapp: '01128472424' }), {
    student_name: 'أحمد', whatsapp: '201128472424',
  });
});

test('optional age is null; supplied ages must be whole numbers in range', () => {
  const contact = { student_name: 'أحمد', whatsapp: '01128472424' };
  assert.equal(preparePreferenceRequest({ ...contact, age: '' }).age, null);
  assert.equal(preparePreferenceRequest({ ...contact, age: '25' }).age, 25);
  for (const age of ['x', '4', '100', '5.5']) {
    assert.throws(() => preparePreferenceRequest({ ...contact, age }));
  }
  assert.equal(preparePreferenceRequest({ ...contact, gender_preference: 'invalid' }).gender_preference, null);
});

test('phone capture requires 10–15 digits and accepts local, Arabic and international forms', () => {
  assert.throws(() => prepareStudentRequest({ student_name: 'أحمد', whatsapp: '123456789' }));
  assert.throws(() => prepareStudentRequest({ student_name: 'أحمد', whatsapp: '1234567890123456' }));

  assert.equal(
    prepareStudentRequest({ student_name: 'أحمد', whatsapp: '1234567890' }).whatsapp,
    '1234567890'
  );
  assert.equal(
    prepareStudentRequest({ student_name: 'أحمد', whatsapp: '+44 7700 900123' }).whatsapp,
    '447700900123'
  );
  assert.equal(
    prepareStudentRequest({ student_name: 'أحمد', whatsapp: '٠١٠١٢٣٤٥٦٧٨' }).whatsapp,
    '201012345678'
  );
  assert.equal(
    prepareStudentRequest({ student_name: 'أحمد', whatsapp: '۰۱۱۲۸۴۷۲۴۲۴' }).whatsapp,
    '201128472424'
  );
});

test('canonical phone remains stable after a second normalization', () => {
  for (const whatsapp of ['\t+201012345678', '\u00a0+447700900123', '٠١٠١٢٣٤٥٦٧٨']) {
    const canonical = prepareStudentRequest({ student_name: 'أحمد', whatsapp }).whatsapp;
    assert.equal(normalizeStudentPhone(canonical), canonical);
  }
  for (const whatsapp of ['+01012345678', '\t+٠١٠١٢٣٤٥٦٧٨']) {
    assert.throws(() => prepareStudentRequest({ student_name: 'أحمد', whatsapp }));
  }
});

test('name is trimmed and limited to 200 characters', () => {
  const whatsapp = '01128472424';
  assert.throws(() => prepareStudentRequest({ student_name: '\t\n\u00a0', whatsapp }));
  assert.equal(prepareStudentRequest({ student_name: '\u00a0\tأحمد\n', whatsapp }).student_name, 'أحمد');
  assert.equal(
    prepareStudentRequest({ student_name: `  ${'ا'.repeat(200)}  `, whatsapp }).student_name.length,
    200
  );
  assert.throws(() =>
    prepareStudentRequest({ student_name: 'ا'.repeat(201), whatsapp })
  );
});

test('description is optional, trimmed and limited to 4000 characters', () => {
  const contact = { student_name: 'أحمد', whatsapp: '01128472424' };
  assert.equal(preparePreferenceRequest({ ...contact, description: null }).description, '');
  assert.equal(
    preparePreferenceRequest({ ...contact, description: `  ${'ب'.repeat(4000)}  ` }).description.length,
    4000
  );
  assert.throws(() =>
    preparePreferenceRequest({ ...contact, description: 'ب'.repeat(4001) })
  );
});

test('age boundaries include 5 and 99 and blank variants become null', () => {
  const contact = { student_name: 'أحمد', whatsapp: '01128472424' };
  for (const age of ['', '   ', null, undefined]) {
    assert.equal(preparePreferenceRequest({ ...contact, age }).age, null);
  }
  assert.equal(preparePreferenceRequest({ ...contact, age: '5' }).age, 5);
  assert.equal(preparePreferenceRequest({ ...contact, age: '99' }).age, 99);
  for (const age of ['0', '4', '100', '-1', '1e2', '0x10', '٥']) {
    assert.throws(() => preparePreferenceRequest({ ...contact, age }));
  }
});

test('gender preference comes only from the calling context', () => {
  const payload = preparePreferenceRequest({
    student_name: 'أحمد',
    whatsapp: '01128472424',
    gender_preference: 'female',
  });
  assert.equal(payload.gender_preference, 'female');
  assert.equal('gender' in payload, false);
});
