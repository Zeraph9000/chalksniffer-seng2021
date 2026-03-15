import { describe, test } from "node:test";

describe('/orders/:id Tests:', () => {
    describe('Error Cases', () => {
        describe('Error 400: Bad Request', () => {
            test.todo('returns 400 when order does not exist');
            test.todo('returns 400 when request body fails validation (invalid fields / missing required fields)');
        });
        describe('Error 401: Unauthorized', () => {
            test.todo('returns 401 when missing Authorization header');
            test.todo('returns 401 when provided API key is invalid');
        });
        describe('Error 403: Forbidden', () => {
            test.todo('returns 403 when order belongs to a different user');
        });
    });
    describe('Successful Cases', () => {
        test.todo('returns 200 and updated order when valid API key and payload provided');
        test.todo('updates stored XML when order is successfully updated');
    });
});