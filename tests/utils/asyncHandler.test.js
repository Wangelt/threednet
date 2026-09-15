const asyncHandler = require('../../src/utils/asyncHandler');

describe('asyncHandler', () => {
  test('passes req, res, next into the wrapped function', async () => {
    const req = {}, res = {}, next = jest.fn();
    const fn = jest.fn().mockResolvedValue(undefined);

    await asyncHandler(fn)(req, res, next);

    expect(fn).toHaveBeenCalledWith(req, res, next);
  });

  test('forwards thrown errors to next', async () => {
    const req = {}, res = {}, next = jest.fn();
    const error = new Error('boom');
    const fn = jest.fn().mockRejectedValue(error);

    await asyncHandler(fn)(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });

  test('does not call next when the handler resolves normally', async () => {
    const req = {}, res = {}, next = jest.fn();
    const fn = jest.fn().mockResolvedValue('ok');

    await asyncHandler(fn)(req, res, next);

    expect(next).not.toHaveBeenCalled();
  });

  test('propagates synchronously thrown errors (does not swallow them)', () => {
    const req = {}, res = {}, next = jest.fn();
    const fn = jest.fn(() => { throw new Error('sync boom'); });

    // asyncHandler wraps async functions only; sync throws escape the wrapper
    expect(() => asyncHandler(fn)(req, res, next)).toThrow('sync boom');
  });
});
