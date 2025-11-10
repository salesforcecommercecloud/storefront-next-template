import { describe, it, expect } from 'vitest';
import { isOperationMethod, type OperationMap } from './proxy-types';

describe('proxy-types', () => {
    describe('isOperationMethod', () => {
        const BASE_PATH = '/api/v1' as const;
        const operations: OperationMap = {
            getUser: { m: 'GET', b: BASE_PATH, s: '/users/{id}' },
            createUser: { m: 'POST', b: BASE_PATH, s: '/users' },
            updateUser: { m: 'PUT', b: BASE_PATH, s: '/users/{id}' },
            deleteUser: { m: 'DELETE', b: BASE_PATH, s: '/users/{id}' },
        };

        describe('valid operation names', () => {
            it('should return true for existing operation methods', () => {
                expect(isOperationMethod(operations, 'getUser')).toBe(true);
                expect(isOperationMethod(operations, 'createUser')).toBe(true);
                expect(isOperationMethod(operations, 'updateUser')).toBe(true);
                expect(isOperationMethod(operations, 'deleteUser')).toBe(true);
            });
        });

        describe('invalid operation names', () => {
            it('should return false for non-existent operation methods', () => {
                expect(isOperationMethod(operations, 'listUsers')).toBe(false);
                expect(isOperationMethod(operations, 'nonExistentMethod')).toBe(false);
            });

            it('should return false for HTTP method names', () => {
                expect(isOperationMethod(operations, 'GET')).toBe(false);
                expect(isOperationMethod(operations, 'POST')).toBe(false);
                expect(isOperationMethod(operations, 'PUT')).toBe(false);
                expect(isOperationMethod(operations, 'DELETE')).toBe(false);
            });

            it('should return false for middleware method names', () => {
                expect(isOperationMethod(operations, 'use')).toBe(false);
                expect(isOperationMethod(operations, 'eject')).toBe(false);
            });

            it('should return false for symbol properties', () => {
                const sym = Symbol('test');
                expect(isOperationMethod(operations, sym)).toBe(false);
            });

            it('should return false for numeric properties', () => {
                expect(isOperationMethod(operations, '123')).toBe(false);
            });
        });

        describe('edge cases', () => {
            it('should handle empty operation maps', () => {
                const emptyOps: OperationMap = {};
                expect(isOperationMethod(emptyOps, 'anyMethod')).toBe(false);
            });

            it('should handle operation names with special characters', () => {
                const BASE = '/api' as const;
                const specialOps: OperationMap = {
                    'get-user': { m: 'GET', b: BASE, s: '/users/{id}' },
                    create_user: { m: 'POST', b: BASE, s: '/users' },
                };
                expect(isOperationMethod(specialOps, 'get-user')).toBe(true);
                expect(isOperationMethod(specialOps, 'create_user')).toBe(true);
            });

            it('should be case-sensitive', () => {
                expect(isOperationMethod(operations, 'GetUser')).toBe(false);
                expect(isOperationMethod(operations, 'GETUSER')).toBe(false);
            });
        });
    });
});
