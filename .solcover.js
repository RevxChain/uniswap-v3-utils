module.exports = {
    skipFiles: ['mocks', 'interfaces', 'libraries'],
    mocha: {
        grep: "@skip-on-coverage",
        invert: true
    }
};