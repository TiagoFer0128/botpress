const path = require('path')
const gulp = require('gulp')
const ts = require('gulp-typescript')
const rimraf = require('rimraf')
const run = require('gulp-run')
const sourcemaps = require('gulp-sourcemaps')

const buildJsonSchemas = require('./jsonschemas')
const tsProject = ts.createProject(path.resolve(__dirname, '../src/tsconfig.json'))

const wipe = () => {
  return gulp.src(['./node_modules', './out']).pipe(rimraf())
}

const clean = cb => {
  rimraf('./out', cb)
}

const buildTs = () => {
  return tsProject
    .src()
    .pipe(sourcemaps.init())
    .pipe(tsProject())
    .pipe(
      sourcemaps.write({
        sourceRoot: file => {
          const sourceFile = path.join(file.cwd, 'src', file.sourceMap.file)
          return path.relative(path.dirname(sourceFile), file.cwd)
        }
      })
    )
    .pipe(gulp.dest('./out/bp'))
}

const watch = () => {
  return gulp.watch('./src/**/*.ts', buildTs)
}

const createDirectories = () => {
  return gulp
    .src('*.*', { read: false })
    .pipe(gulp.dest('./out/bp/data'))
    .pipe(gulp.dest('./out/bp/data/storage'))
}

const copyData = () => {
  return gulp.src('./src/templates/data/**/*').pipe(gulp.dest('./out/bp/data'))
}

const copyBotTemplate = () => {
  return gulp.src('./src/templates/bot-template/**/*').pipe(gulp.dest('./out/templates/bot-template'))
}

const copyAdmin = () => {
  return gulp.src('./src/bp/ui-admin/build/**/*').pipe(gulp.dest('./out/bp/ui-admin/public'))
}

const copyStudio = () => {
  return gulp.src('./src/bp/ui-studio/static/**/*').pipe(gulp.dest('./out/bp/ui-studio/static'))
}

const buildSchemas = cb => {
  buildJsonSchemas()
  cb()
}

const runTests = () => {
  return gulp.src('.').pipe(run('./node_modules/.bin/jest -i --detectOpenHandles -c ./jest.config.js'))
}

module.exports = {
  clean,
  buildTs,
  buildSchemas,
  createDirectories,
  copyData,
  copyBotTemplate,
  copyAdmin,
  copyStudio,
  watch,
  wipe,
  runTests
}
