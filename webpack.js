var webpack = require('webpack')
var path = require('path')
var CopyWebpackPlugin = require('copy-webpack-plugin')
var autoprefixer = require('autoprefixer')
// var HardSourceWebpackPlugin = require('hard-source-webpack-plugin')
var nodeExternals = require('webpack-node-externals')

var ExtensionsPlugin = require('./extensions/extensions-plugin')

var nodeConfig = {
  devtool: 'source-map',
  entry: [path.resolve(__dirname, './index.js')],
  output: {
    path: './lib',
    filename: 'node.bundle.js',
    libraryTarget: 'commonjs2',
    publicPath: __dirname
  },
  externals: [nodeExternals()],
  target: 'node',
  node: {
    __dirname: false
  },
  resolve: {
    extensions: ['', '.js'],
    alias: {
      '~': path.resolve(__dirname, './src'),
      '+': path.resolve(__dirname, './extensions/lite')
    }
  },
  module: {
    loaders: [{
      test: /\.js$/,
      loader: 'babel-loader',
      exclude: /node_modules/,
      query: {
        presets: ['latest', 'stage-0'],
        plugins: ['transform-object-rest-spread']
      }
    }, {
      test: /\.json$/,
      loader: 'json-loader'
    }]
  },
  plugins: [ExtensionsPlugin()]
}

var webConfig = {
  bail: true,
  devtool: 'source-map',
  entry: ['./src/web/index.jsx'],
  output: {
    path: './lib/web/js',
    publicPath: '/js/',
    filename: 'web.bundle.js'
  },
  resolve: {
    extensions: ['', '.js', '.jsx', '.css'],
    alias: {
      '~': path.resolve(__dirname, './src/web'),
      '+': path.resolve(__dirname, './extensions/lite')
    }
  },
  plugins: [
    ExtensionsPlugin(),
    new webpack.NoErrorsPlugin(),
    new CopyWebpackPlugin([{
      from: path.resolve(__dirname, './src/web/index.html'),
      to: path.resolve(__dirname, './lib/web/index.html')
    }, {
      from: path.resolve(__dirname, './src/web/img'),
      to: path.resolve(__dirname, './lib/web/img')
    }])
    // TODO: Fix caching to take into account changes to extensions and environement variables
    // new HardSourceWebpackPlugin({
    //   cacheDirectory: __dirname + '/.cache/',
    //   recordsPath: __dirname + '/.cache/records.json',
    //   environmentPaths: {
    //     root: process.cwd(),
    //     directories: ['node_modules'],
    //     files: ['package.json', 'webpack.js'],
    //   }
    // })
  ],
  module: {
    loaders: [{
      test: /\.jsx?$/i,
      exclude: /node_modules/i,
      loader: 'babel-loader',
      query: {
        presets: ['latest', 'stage-0', 'react'],
        plugins: ['transform-object-rest-spread', 'transform-decorators-legacy'],
        compact: false,
        babelrc: false,
        cacheDirectory: true
      }
    }, {
      test: /\.scss$/,
      loaders: ['style', 'css?modules&importLoaders=1&localIdentName=[name]__[local]___[hash:base64:5]', 'postcss', 'sass']
    }, {
      test: /\.css$/,
      loaders: ['style', 'css']
    }, {
      test: /\.woff|\.woff2|\.svg|.eot|\.ttf/,
      loader: 'file?name=../fonts/[name].[ext]'
    }, {
      test: /\.json$/,
      loader: "json-loader"
    }]
  },
  postcss: [ autoprefixer({ browsers: ['last 2 versions'] }) ]
}

var compiler = webpack([webConfig, nodeConfig])
var postProcess = function(err, stats) {
  if (err) throw err
  console.log(stats.toString())
}

if (process.argv.indexOf('--compile') !== -1) {
  compiler.run(postProcess)
} else if (process.argv.indexOf('--watch') !== -1) {
  compiler.watch(null, postProcess)
}

module.exports = { web: webConfig, node: nodeConfig }
