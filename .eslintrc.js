/**
 * ESLint config for the React Native app.
 *
 * The dependencies (`eslint`, `@react-native/eslint-config`) and the `lint`
 * script were already in package.json — only this file was missing, so
 * `npm run lint` failed with "couldn't find a configuration file".
 *
 * The website is a separate project with its own Next.js config; it is ignored
 * here so one lint run doesn't try to apply React Native rules to it.
 */
module.exports = {
  root: true,
  extends: '@react-native',
  ignorePatterns: [
    'node_modules/',
    'android/',
    'ios/',
    'website/', // separate project, separate config
    'coverage/',
    'supabase/functions/', // Deno runtime, not Node — different globals and imports
    '*.config.js',
  ],
  rules: {
    /**
     * Off because of a version conflict, not a style preference.
     * `@react-native/eslint-config` pulls eslint-plugin-prettier@4, which calls
     * `prettier.resolveConfig.sync` — an API Prettier 3 removed. The installed
     * Prettier is 3.8.1, so the rule throws and takes the whole lint run with it.
     *
     * Disabling it costs nothing: there is no .prettierrc in this repo, so the
     * rule was only ever going to enforce plugin defaults. Every correctness
     * rule (React hooks, unused vars, RN-specific checks) still runs.
     */
    'prettier/prettier': 'off',

    /**
     * `void somePromise()` is the standard way to say "this is fire-and-forget
     * on purpose" — it marks a deliberately un-awaited promise so a reader (and
     * a future no-floating-promises rule) can tell it apart from a forgotten
     * await. The analytics calls use it throughout. Allowing it only as a
     * statement keeps the rule's real target — `void` used as an expression —
     * still flagged.
     */
    'no-void': ['warn', {allowAsStatement: true}],
  },
  overrides: [
    {
      // Jest globals (describe/it/expect) are not defined in the base config.
      files: ['__tests__/**/*.{js,jsx,ts,tsx}', '**/*.test.{js,jsx,ts,tsx}', 'jest.setup.js'],
      env: {jest: true},
    },
  ],
};
