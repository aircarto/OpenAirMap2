// eslint.config.js
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';

export default [
    js.configs.recommended, // ✅ Active les règles de base
    prettier, // ✅ Désactive les règles qui entrent en conflit avec Prettier
    {
        languageOptions: {
            globals: {
                document: 'readonly',
                window: 'readonly',
                console: 'readonly',
                fetch: 'readonly',
                am5: 'readonly',
                am5xy: 'readonly',
                am5locales_fr_FR: 'readonly',
                am5plugins_exporting: 'readonly',
                URLSearchParams: 'readonly',
            },
            ecmaVersion: 2021,
            sourceType: 'module',
        },
        env: {
            browser: true,
            es2021: true,
        },
        rules: {
            'no-var': 'error', // ⛔ Interdit `var`
            'prefer-const': 'error', // ✅ Encourage `const`
            camelcase: ['error', { properties: 'never' }], // ✅ Impose camelCase sauf pour les propriétés
            'func-style': ['error', 'expression'], // ✅ Privilégie les expressions de fonction
            'no-undef': 'error', // ⛔ Interdit les variables non définies
            'no-unused-vars': 'warn', // ⚠️ Signale les variables inutilisées
            'no-redeclare': 'error', // ⛔ Empêche la redéclaration d'une variable
            'block-scoped-var': 'error', // ⛔ Interdit l'utilisation de variables hors de leur bloc
        },
    },
];
