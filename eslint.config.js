// eslint.config.js
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';

export default [
    js.configs.recommended, // ✅ Active les règles de base
    prettier, // ✅ Désactive les règles qui entrent en conflit avec Prettier
    {
        rules: {
            'no-var': 'error', // ⛔ Interdit `var`
            'prefer-const': 'error', // ✅ Encourage `const`
            camelcase: 'error', // ✅ Impose camelCase
            'func-style': ['error', 'expression'], // ✅ Privilégie les expressions de fonction
            'no-undef': 'error', // ⛔ Interdit les variables non définies
            'no-unused-vars': 'warn', // ⚠️ Signale les variables inutilisées
            'no-redeclare': 'error', // ⛔ Empêche la redéclaration d'une variable
            'block-scoped-var': 'error', // ⛔ Interdit l'utilisation de variables hors de leur bloc
        },
    },
];
