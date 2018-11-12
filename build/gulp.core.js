const path = require('path')
const gulp = require('gulp')
const ts = require('gulp-typescript')
const rimraf = require('gulp-rimraf')
const sourcemaps = require('gulp-sourcemaps')
const typedoc = require('gulp-typedoc')
const gulpif = require('gulp-if')
const run = require('gulp-run')
const file = require('gulp-file')
const { symlink } = require('gulp')

const buildJsonSchemas = require('./jsonschemas')
const tsProject = ts.createProject(path.resolve(__dirname, '../src/tsconfig.json'))

const wipe = () => {
  return gulp.src(['./node_modules', './out']).pipe(rimraf())
}

const clean = () => {
  return gulp.src('./out', { allowEmpty: true }).pipe(rimraf())
}

const runningPro = process.env.EDITION === 'pro' || process.env.EDITION === 'ee'
const fetchPro = () => {
  return gulp.src('./').pipe(gulpif(runningPro, run('git submodule init && git submodule update', { verbosity: 2 })))
}

const writeEdition = () => {
  const metadata = JSON.stringify(
    {
      edition: process.env.EDITION || 'ce',
      version: require(path.join(__dirname, '../package.json')).version
    },
    null,
    2
  )

  return file('metadata.json', metadata, { src: true }).pipe(gulp.dest('./'))
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
  return gulp.src('./src/templates/data/**/*').pipe(gulp.dest('./out/bp/data', { overwrite: false }))
}

const copyBotTemplate = () => {
  return gulp.src('./src/templates/bot-template/**/*').pipe(gulp.dest('./out/bp/templates/bot-template'))
}

const copyAdmin = () => {
  return gulp.src('./src/bp/ui-admin/build/**/*').pipe(gulp.dest('./out/bp/ui-admin/public'))
}

const cleanStudio = () => {
  return gulp.src('./out/bp/ui-studio/public', { allowEmpty: true }).pipe(rimraf())
}

const cleanStudioAssets = () => {
  return gulp.src('./out/bp/assets/ui-studio/public', { allowEmpty: true }).pipe(rimraf())
}

const copyStudio = () => {
  return gulp.src('./src/bp/ui-studio/public/**/*').pipe(gulp.dest('./out/bp/ui-studio/public'))
}

const createStudioSymlink = () => {
  return gulp.src('./src/bp/ui-studio/public').pipe(symlink('./out/bp/assets/ui-studio/', { type: 'dir' }))
}

const buildSchemas = cb => {
  buildJsonSchemas()
  cb()
}

const buildReferenceDoc = () => {
  return gulp.src(['./src/bp/sdk/botpress.d.ts']).pipe(
    typedoc({
      out: './docs/reference/public',
      mode: 'file',
      name: 'Botpress SDK',
      readme: './docs/reference/README.md',
      gaID: 'UA-90034220-1',
      includeDeclarations: true,
      ignoreCompilerErrors: true,
      version: true,
      excludeExternals: true,
      excludePattern: '**/node_modules/**',
      tsconfig: path.resolve(__dirname, '../src/tsconfig.json')
    })
  )
}

module.exports = {
  clean,
  fetchPro,
  writeEdition,
  buildTs,
  buildSchemas,
  buildReferenceDoc,
  createDirectories,
  copyData,
  copyBotTemplate,
  copyAdmin,
  cleanStudio,
  cleanStudioAssets,
  copyStudio,
  createStudioSymlink,
  watch,
  wipe
}
