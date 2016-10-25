'use strict';

module.exports = function(grunt) {

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        nodemon: {
            dev: {
                script: 'server.js',
                options: {
                    ext: 'js',
                    watch: ['server.js', 'config/**/*.js', 'app/**/*.js']
                }
            },
        },
        watch: {
            options: {
                livereload: true
            },
            css: {
                files: [
                    'public/styles/*.scss',
                    'public/modules/**/*.scss',
                ],
                tasks: ['sass']
            },
            html: {
                files: [
                    'app/views/*.html',
                    'public/modules/**/*.html',
                ],
                tasks: []
            },
            grunt: {
                files: ['Gruntfile.js']
            }
        },
        concurrent: {
            dev: {
                tasks: ['nodemon', 'watch'],
                options: {
                    logConcurrentOutput: true
                }
            },
        },
        sass: {
            dist: {
                files: {
                    'public/dist/css/main.css': 'public/styles/main.scss'
                }
            }
        },
    });

    grunt.loadNpmTasks('grunt-nodemon');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-sass');
    grunt.loadNpmTasks('grunt-concurrent');

    grunt.registerTask('default', ['sass', 'concurrent',]);
    grunt.registerTask('dist', ['sass',]);

};
