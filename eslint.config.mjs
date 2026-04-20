import firebaseRulesPlugin from '@firebase/eslint-plugin-security-rules';

export default [
  {
    files: ['**/*.rules'],
    plugins: {
      firebase: firebaseRulesPlugin
    },
    rules: {
      'firebase/no-invalid-rule': 'error'
    }
  },
  firebaseRulesPlugin.configs['flat/recommended']
];
