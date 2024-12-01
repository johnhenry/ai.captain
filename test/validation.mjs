import { strict as assert } from 'assert';
import test from 'node:test';
import { TemplateValidator } from '../src/templates/validation.js';

test('TemplateValidator', async (t) => {
  const validator = new TemplateValidator();

  await t.test('default rules', () => {
    assert.ok(validator.rules.has('string'));
    assert.ok(validator.rules.has('number'));
    assert.ok(validator.rules.has('boolean'));
    assert.ok(validator.rules.has('array'));
    assert.ok(validator.rules.has('object'));
    assert.ok(validator.rules.has('email'));
    assert.ok(validator.rules.has('url'));
    assert.ok(validator.rules.has('date'));
    assert.ok(validator.rules.has('uuid'));
    assert.ok(validator.rules.has('min'));
    assert.ok(validator.rules.has('max'));
    assert.ok(validator.rules.has('length'));
    assert.ok(validator.rules.has('minLength'));
    assert.ok(validator.rules.has('maxLength'));
    assert.ok(validator.rules.has('pattern'));
    assert.ok(validator.rules.has('enum'));
  });

  await t.test('addRule', () => {
    validator.addRule('custom', (value) => value === 'custom');
    assert.ok(validator.rules.has('custom'));
    assert.ok(validator.rules.get('custom')('custom'));
    assert.ok(!validator.rules.get('custom')('not custom'));
  });

  await t.test('createSchema', () => {
    const schema = {
      string: true,
      minLength: 3
    };
    const validate = validator.createSchema(schema);
    assert.ok(validate('test').valid);
    assert.ok(!validate(123).valid);
    assert.ok(!validate('ab').valid);
  });

  await t.test('validate', () => {
    const schema = {
      string: true,
      minLength: 3
    };
    const result = validator.validate('test', schema);
    assert.ok(result.valid);
    assert.deepEqual(result.errors, []);

    const invalidResult = validator.validate(123, schema);
    assert.ok(!invalidResult.valid);
    assert.deepEqual(invalidResult.errors, ['Must be a string', 'Must be at least 3 characters long']);
  });

  await t.test('formatError', () => {
    assert.equal(validator._formatError('string'), 'Must be a string');
    assert.equal(validator._formatError('number'), 'Must be a number');
    assert.equal(validator._formatError('min', 5), 'Must be at least 5');
    assert.equal(validator._formatError('unknown'), 'Failed unknown validation');
  });

  await t.test('compose', () => {
    const schema1 = { string: true };
    const schema2 = { minLength: 3 };
    const validate = validator.compose(schema1, schema2);
    assert.ok(validate('test').valid);
    assert.ok(!validate(123).valid);
    assert.ok(!validate('ab').valid);
  });

  await t.test('validation examples', async (t) => {
    await t.test('string validation', () => {
      const schema = { string: true };
      assert.ok(validator.validate('hello', schema).valid);
      assert.ok(!validator.validate(123, schema).valid);
    });

    await t.test('number validation', () => {
      const schema = { number: true };
      assert.ok(validator.validate(123, schema).valid);
      assert.ok(!validator.validate('hello', schema).valid);
    });

    await t.test('boolean validation', () => {
      const schema = { boolean: true };
      assert.ok(validator.validate(true, schema).valid);
      assert.ok(!validator.validate(123, schema).valid);
    });

    await t.test('array validation', () => {
      const schema = { array: true };
      assert.ok(validator.validate([1, 2, 3], schema).valid);
      assert.ok(!validator.validate('hello', schema).valid);
    });

    await t.test('object validation', () => {
      const schema = { object: true };
      assert.ok(validator.validate({ a: 1, b: 2 }, schema).valid);
      assert.ok(!validator.validate('hello', schema).valid);
    });

    await t.test('email validation', () => {
      const schema = { email: true };
      assert.ok(validator.validate('test@example.com', schema).valid);
      assert.ok(!validator.validate('invalid email', schema).valid);
    });

    await t.test('url validation', () => {
      const schema = { url: true };
      assert.ok(validator.validate('https://example.com', schema).valid);
      assert.ok(!validator.validate('invalid url', schema).valid);
    });

    await t.test('date validation', () => {
      const schema = { date: true };
      assert.ok(validator.validate('2023-12-15', schema).valid);
      assert.ok(!validator.validate('invalid date', schema).valid);
    });

    await t.test('uuid validation', () => {
      const schema = { uuid: true };
      assert.ok(validator.validate('a0a2a2d2-0b87-4a18-83f2-252988a81a1a', schema).valid);
      assert.ok(!validator.validate('invalid uuid', schema).valid);
    });

    await t.test('min validation', () => {
      const schema = { min: 5 };
      assert.ok(validator.validate(10, schema).valid);
      assert.ok(!validator.validate(2, schema).valid);
    });

    await t.test('max validation', () => {
      const schema = { max: 5 };
      assert.ok(validator.validate(2, schema).valid);
      assert.ok(!validator.validate(10, schema).valid);
    });

    await t.test('length validation', () => {
      const schema = { length: 5 };
      assert.ok(validator.validate('hello', schema).valid);
      assert.ok(!validator.validate('test', schema).valid);
    });

    await t.test('minLength validation', () => {
      const schema = { minLength: 5 };
      assert.ok(validator.validate('hello world', schema).valid);
      assert.ok(!validator.validate('test', schema).valid);
    });

    await t.test('maxLength validation', () => {
      const schema = { maxLength: 5 };
      assert.ok(validator.validate('test', schema).valid);
      assert.ok(!validator.validate('hello world', schema).valid);
    });

    await t.test('pattern validation', () => {
      const schema = { pattern: '^\\d+$' };
      assert.ok(validator.validate('12345', schema).valid);
      assert.ok(!validator.validate('hello', schema).valid);
    });

    await t.test('enum validation', () => {
      const schema = { enum: ['apple', 'banana', 'orange'] };
      assert.ok(validator.validate('apple', schema).valid);
      assert.ok(!validator.validate('grape', schema).valid);
    });
  });
});
