"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const nunjucks_1 = __importDefault(require("nunjucks"));
const cliState_1 = __importDefault(require("../../src/cliState"));
const templates_1 = require("../../src/util/templates");
describe('extractVariablesFromTemplate', () => {
    it('should extract simple variables', () => {
        const template = 'Hello {{ name }}, welcome to {{ place }}!';
        expect((0, templates_1.extractVariablesFromTemplate)(template)).toEqual(['name', 'place']);
    });
    it('should extract variables without spaces', () => {
        const template = 'Hello {{name}}, welcome to {{place}}!';
        expect((0, templates_1.extractVariablesFromTemplate)(template)).toEqual(['name', 'place']);
    });
    it('should extract variables with dot notation', () => {
        const template = 'Hello {{ user.name }}, your score is {{ game.score }}!';
        expect((0, templates_1.extractVariablesFromTemplate)(template)).toEqual(['user.name', 'game.score']);
    });
    it('should extract variables with underscores', () => {
        const template = 'Your order {{ order_id }} will arrive on {{ delivery_date }}.';
        expect((0, templates_1.extractVariablesFromTemplate)(template)).toEqual(['order_id', 'delivery_date']);
    });
    it('should extract variables with numbers', () => {
        const template = 'Player1: {{ player1 }}, Player2: {{ player2 }}';
        expect((0, templates_1.extractVariablesFromTemplate)(template)).toEqual(['player1', 'player2']);
    });
    it('should extract variables used in filters', () => {
        const template = '{{ name | capitalize }} - {{ date | date("yyyy-MM-dd") }}';
        expect((0, templates_1.extractVariablesFromTemplate)(template)).toEqual(['name', 'date']);
    });
    it('should extract variables used in complex expressions', () => {
        const template = '{% if user.age > 18 %}Welcome, {{ user.name }}!{% endif %}';
        expect((0, templates_1.extractVariablesFromTemplate)(template)).toEqual(['user.age', 'user.name']);
    });
    it('should extract variables from for loops', () => {
        const template = '{% for item in items %}{{ item.name }}{% endfor %}';
        expect((0, templates_1.extractVariablesFromTemplate)(template)).toEqual(['item.name', 'items']);
    });
    it('should extract variables with multiple occurrences', () => {
        const template = '{{ name }} {{ age }} {{ name }}';
        expect((0, templates_1.extractVariablesFromTemplate)(template)).toEqual(['name', 'age']);
    });
    it('should not extract variables from comments', () => {
        const template = '{# This is a comment with {{ variable }} #}{{ actual_variable }}';
        expect((0, templates_1.extractVariablesFromTemplate)(template)).toEqual(['actual_variable']);
    });
    it('should handle empty templates', () => {
        const template = '';
        expect((0, templates_1.extractVariablesFromTemplate)(template)).toEqual([]);
    });
    it('should handle templates without variables', () => {
        const template = 'This is a static template without variables.';
        expect((0, templates_1.extractVariablesFromTemplate)(template)).toEqual([]);
    });
});
describe('extractVariablesFromTemplates', () => {
    it('should extract variables from multiple templates', () => {
        const templates = [
            'Hello {{ name }}, welcome to {{ place }}!',
            '{{ user.age }} years old',
            '{% for item in items %}{{ item.name }}{% endfor %}',
        ];
        const result = (0, templates_1.extractVariablesFromTemplates)(templates);
        expect(result).toEqual(['name', 'place', 'user.age', 'item.name', 'items']);
    });
    it('should handle empty array of templates', () => {
        const templates = [];
        const result = (0, templates_1.extractVariablesFromTemplates)(templates);
        expect(result).toEqual([]);
    });
    it('should deduplicate variables across templates', () => {
        const templates = ['Hello {{ name }}!', 'Welcome, {{ name }}!', '{{ age }} years old'];
        const result = (0, templates_1.extractVariablesFromTemplates)(templates);
        expect(result).toEqual(['name', 'age']);
    });
});
describe('getNunjucksEngine', () => {
    const originalEnv = process.env;
    beforeEach(() => {
        jest.resetModules();
        process.env = { ...originalEnv };
    });
    afterEach(() => {
        process.env = originalEnv;
    });
    it('should return a nunjucks environment by default', () => {
        const engine = (0, templates_1.getNunjucksEngine)();
        expect(engine).toBeInstanceOf(nunjucks_1.default.Environment);
        expect(engine.renderString('Hello {{ name }}', { name: 'World' })).toBe('Hello World');
    });
    it('should return a simple render function when PROMPTFOO_DISABLE_TEMPLATING is set', () => {
        process.env.PROMPTFOO_DISABLE_TEMPLATING = 'true';
        const engine = (0, templates_1.getNunjucksEngine)();
        expect(engine.renderString('Hello {{ name }}', { name: 'World' })).toBe('Hello {{ name }}');
    });
    it('should return a nunjucks environment when isGrader is true, regardless of PROMPTFOO_DISABLE_TEMPLATING', () => {
        process.env.PROMPTFOO_DISABLE_TEMPLATING = 'true';
        const engine = (0, templates_1.getNunjucksEngine)({}, false, true);
        expect(engine).toBeInstanceOf(nunjucks_1.default.Environment);
        expect(engine.renderString('Hello {{ name }}', { name: 'Grader' })).toBe('Hello Grader');
    });
    it('should use nunjucks when isGrader is true, even if PROMPTFOO_DISABLE_TEMPLATING is set', () => {
        process.env.PROMPTFOO_DISABLE_TEMPLATING = 'true';
        const engine = (0, templates_1.getNunjucksEngine)({}, false, true);
        expect(engine).toBeInstanceOf(nunjucks_1.default.Environment);
        expect(engine.renderString('Hello {{ name }}', { name: 'Grader' })).toBe('Hello Grader');
    });
    it('should add custom filters when provided', () => {
        const customFilters = {
            uppercase: (str) => str.toUpperCase(),
            add: (a, b) => (a + b).toString(),
        };
        const engine = (0, templates_1.getNunjucksEngine)(customFilters);
        expect(engine.renderString('{{ "hello" | uppercase }}', {})).toBe('HELLO');
        expect(engine.renderString('{{ 5 | add(3) }}', {})).toBe('8');
    });
    it('should add environment variables as globals under "env"', () => {
        process.env.TEST_VAR = 'test_value';
        const engine = (0, templates_1.getNunjucksEngine)();
        expect(engine.renderString('{{ env.TEST_VAR }}', {})).toBe('test_value');
    });
    it('should throw an error when throwOnUndefined is true and a variable is undefined', () => {
        const engine = (0, templates_1.getNunjucksEngine)({}, true);
        expect(() => {
            engine.renderString('{{ undefined_var }}', {});
        }).toThrow(/attempted to output null or undefined value/);
    });
    it('should not throw an error when throwOnUndefined is false and a variable is undefined', () => {
        const engine = (0, templates_1.getNunjucksEngine)({}, false);
        expect(() => {
            engine.renderString('{{ undefined_var }}', {});
        }).not.toThrow();
    });
    it('should respect all parameters when provided', () => {
        process.env.PROMPTFOO_DISABLE_TEMPLATING = 'true';
        const customFilters = {
            double: (n) => (n * 2).toString(),
        };
        const engine = (0, templates_1.getNunjucksEngine)(customFilters, true, true);
        expect(engine).toBeInstanceOf(nunjucks_1.default.Environment);
        expect(engine.renderString('{{ 5 | double }}', {})).toBe('10');
        expect(() => {
            engine.renderString('{{ undefined_var }}', {});
        }).toThrow(/attempted to output null or undefined value/);
    });
    describe('environment variables as globals', () => {
        const originalEnv = process.env;
        beforeEach(() => {
            jest.resetModules();
            process.env = { ...originalEnv };
            jest.isolateModules(() => {
                jest.doMock('../../src/cliState', () => ({
                    default: {
                        config: {},
                    },
                }));
            });
        });
        afterEach(() => {
            process.env = originalEnv;
            jest.resetModules();
        });
        it('should add environment variables as globals by default', () => {
            process.env.TEST_VAR = 'test_value';
            const engine = (0, templates_1.getNunjucksEngine)();
            expect(engine.renderString('{{ env.TEST_VAR }}', {})).toBe('test_value');
        });
        it('should merge cliState.config.env with process.env', () => {
            const initialConfig = { ...cliState_1.default.config };
            cliState_1.default.config = {
                env: {
                    PROCESS_VAR: 'overridden_value',
                    CONFIG_VAR: 'config_value',
                },
            };
            const engine = (0, templates_1.getNunjucksEngine)();
            const rendered = engine.renderString('{{ env.PROCESS_VAR }}', {});
            expect(rendered).toBe('overridden_value');
            expect(engine.renderString('{{ env.CONFIG_VAR }}', {})).toBe('config_value');
            cliState_1.default.config = initialConfig;
        });
        it('should handle undefined cliState.config', () => {
            process.env.TEST_VAR = 'test_value';
            jest.isolateModules(() => {
                jest.doMock('../../src/cliState', () => ({
                    default: {
                        config: undefined,
                    },
                }));
            });
            const engine = (0, templates_1.getNunjucksEngine)();
            expect(engine.renderString('{{ env.TEST_VAR }}', {})).toBe('test_value');
        });
        it('should handle undefined cliState.config.env', () => {
            process.env.TEST_VAR = 'test_value';
            jest.isolateModules(() => {
                jest.doMock('../../src/cliState', () => ({
                    default: {
                        config: {
                            env: undefined,
                        },
                    },
                }));
            });
            const engine = (0, templates_1.getNunjucksEngine)();
            expect(engine.renderString('{{ env.TEST_VAR }}', {})).toBe('test_value');
        });
        it('should not add environment variables when PROMPTFOO_DISABLE_TEMPLATE_ENV_VARS is true', () => {
            process.env.TEST_VAR = 'test_value';
            process.env.PROMPTFOO_DISABLE_TEMPLATE_ENV_VARS = 'true';
            // Update cliState mock
            jest.mock('../../src/cliState', () => ({
                default: {
                    config: {
                        env: {
                            CONFIG_VAR: 'config_value',
                        },
                    },
                },
            }));
            const engine = (0, templates_1.getNunjucksEngine)();
            expect(engine.renderString('{{ env.TEST_VAR }}', {})).toBe('');
            expect(engine.renderString('{{ env.CONFIG_VAR }}', {})).toBe('');
        });
        it('should not add environment variables when in self-hosted mode by default', () => {
            process.env.TEST_VAR = 'test_value';
            process.env.PROMPTFOO_SELF_HOSTED = 'true';
            // Update cliState mock
            jest.mock('../../src/cliState', () => ({
                default: {
                    config: {
                        env: {
                            CONFIG_VAR: 'config_value',
                        },
                    },
                },
            }));
            const engine = (0, templates_1.getNunjucksEngine)();
            expect(engine.renderString('{{ env.TEST_VAR }}', {})).toBe('');
            expect(engine.renderString('{{ env.CONFIG_VAR }}', {})).toBe('');
        });
    });
});
//# sourceMappingURL=templates.test.js.map