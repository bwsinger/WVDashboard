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
            js: {
                files: [
                    'server.js',
                    'config/**/*.js',
                    'app/**/*.js',
                    'public/application.js',
                    'public/modules/**/*.js',
                ],
                tasks: ['jshint']
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
                    'public/dist/css/app.css': 'public/styles/app.scss'
                }
            }
        },
        cssmin: {
            options: {
                sourceMap: true
            },
            dist: {
                files: {
                    'public/dist/css/main.min.css': 'public/dist/css/main.css'
                }
            }
        },
        concat: {
            options: {
                sourceMap: true,
            },
            js: {
                src: [
                    'public/lib/jquery/dist/jquery.js',
                    'public/lib/bootstrap/dist/js/bootstrap.js',
                    'public/lib/angular/angular.js',
                    'public/lib/angular-route/angular-route.js',
                    'public/modules/core/*.js',
                    'public/modules/core/**/*.js',
                    'public/modules/about/*.js',
                    'public/modules/about/**/*.js',
                    'public/modules/dashboard/*.js',
                    'public/modules/dashboard/**/*.js',
                    'public/modules/splash/*.js',
                    'public/modules/splash/**/*.js',
                    'public/application.js',
                ],
                dest: 'public/dist/js/main.js',
            },
            css: {
                src: [
                    'public/lib/bootstrap/dist/css/bootstrap.css',
                    'public/dist/css/app.css'
                ],
                dest: 'public/dist/css/main.css'
            }
        },
        uglify: {
            dist: {
                options: {
                    sourceMap: true,
                    sourceMapIncludeSources: true,
                    sourceMapIn: 'public/dist/js/main.js.map',
                },
                files: {
                    'public/dist/js/main.min.js': ['public/dist/js/main.js'],
                },
            }
        },
        jshint: {
            src: [
                'Gruntfile.js',
                'server.js',
                'config/**/*.js',
                'app/**/*.js',
                'public/application.js',
                'public/modules/**/*.js',
            ],
            options: {
                jshintrc: true,
                reporter: require('jshint-stylish')
            }
        }
    });

    grunt.loadNpmTasks('grunt-nodemon');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-sass');
    grunt.loadNpmTasks('grunt-contrib-cssmin');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-concurrent');

    grunt.registerTask('default', ['jshint', 'sass', 'concurrent']);
    grunt.registerTask('dist', ['sass', 'concat:css', 'cssmin', 'concat:js', 'uglify']);

};
