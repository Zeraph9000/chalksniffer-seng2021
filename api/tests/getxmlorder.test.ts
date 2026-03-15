import { describe, test } from '@jest/globals';

describe('/orders/:id/xml (GET)', () => {
  describe('Error Cases', () => {
    describe('Error 400: Bad Request', () => {
      test.todo('responds 400 when the specified order ID does not exist');
      test.todo('responds 400 when the order exists but no XML record is stored for it');
    });

    describe('Error 401: Unauthorized', () => {
      test.todo('responds 401 when no Authorization header is provided');
      test.todo('responds 401 when Authorization header contains an invalid API key');
    });

    describe('Error 403: Forbidden', () => {
      test.todo('responds 403 when the order exists but belongs to another user');
    });
  });

  describe('Success Cases', () => {
    test.todo('responds 200 when the request is valid');
    test.todo('returns the stored XML for the requested order');
    test.todo('sets the Content-Type header to application/xml');
  });
});
