const ApiError = require('../../src/utils/ApiError');

describe('ApiError', () => {
  test('sets statusCode and message', () => {
    const err = new ApiError(404, 'Not found');
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe('Not found');
  });

  test('is an instance of Error', () => {
    const err = new ApiError(500, 'Server error');
    expect(err).toBeInstanceOf(Error);
  });

  test('isOperational is always true', () => {
    expect(new ApiError(400, 'Bad request').isOperational).toBe(true);
  });

  test('details defaults to null', () => {
    expect(new ApiError(400, 'Bad request').details).toBeNull();
  });

  test('stores provided details', () => {
    const details = { field: 'email', issue: 'required' };
    expect(new ApiError(422, 'Validation error', details).details).toEqual(details);
  });

  test('has a stack trace', () => {
    expect(new ApiError(500, 'oops').stack).toBeDefined();
  });
});
