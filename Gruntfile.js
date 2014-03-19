/*global require:true, module:true*/
module.exports = function (grunt) {
    'use strict';

    var pack = require("./package.json");

    grunt.initConfig({
        jshint: {
            files: ['facts.js', 'test.js'],
            options: {
                es3: true, // ie 7 compatibility
                eqeqeq: true, // no == or !=
                immed: true, // forces () around directly called functions
                forin: true, // makes it harder to use for in
                latedef: "nofunc", // makes it impossible to use a variable before it is declared
                newcap: true, // force capitalized constructors
                strict: true, // enforce strict mode
                trailing: true, // trailing whitespaces are ugly
                maxlen: 120, // maximum characters per line
                camelcase: true, // force camelCase
            }
        },
        mochaTest: {
            node: {
                src: ['test.js'],
                options: {
                    log: true,
                    reporter: "spec",
                    run: true
                }
            }
        },
        compress: {
            main: {
                options: {
                    archive: pack.name + "-" + pack.version + ".zip"
                },
                files: [
                    {src: 'facts.js', dest: '.'},
                    {expand: true, flatten: true, src: 'bower_components/underscore/underscore.js', dest: '.'},
                    {src: 'README', dest: '.'},
                    {src: 'package.json', dest: '.'}
                ],
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-mocha-test');
    grunt.loadNpmTasks('grunt-contrib-compress');
    grunt.registerTask('test', ['jshint', "mochaTest"]);
    grunt.registerTask('dist', ['compress']);
    grunt.registerTask('default', ['test']);

};
