const path = require('path');
var webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const ZipWebpackPlugin = require('zip-webpack-plugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');

const WebpackConfig = {

  // Disable source maps on production builds
  devtool: false,

  entry: {
    // Plugin entry points
    'widget/widget': path.join(__dirname, '../src/widget/widget.js')
  },

  output: {
    path: path.join(__dirname, '../dist'),
    filename: '[name].js'
  },

  externals: {
    buildfire: 'buildfire'
  },

  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      },
      {
        test: /\.css$/,
        use: ExtractTextPlugin.extract({
            fallback: 'style-loader',
            use: {loader: 'css-loader', options: {minimize: true}}
        })
      }
    ]
  },

  plugins: [
    new webpack.optimize.UglifyJsPlugin(),
    new HtmlWebpackPlugin({
      filename: 'widget/index.html',
      inject: true,
      minify: { removeComments: true, collapseWhitespace: true },
      template: path.join(__dirname, '../src/widget/index.html'),
      chunks: ['widget/widget']
    }),
    new CopyWebpackPlugin([ {
      from: path.join(__dirname, '../src/widget'),
      to: path.join(__dirname, '../dist/widget'),
    }, {
      from: path.join(__dirname, '../src/resources'),
      to: path.join(__dirname, '../dist/resources'),
    }, {
      from: path.join(__dirname, '../plugin.json'),
      to: path.join(__dirname, '../dist/plugin.json'),
    }
    ], {
      ignore: ['*.js', '*.html', '*.md']
    }),
    new CopyWebpackPlugin([{
        from: path.join(__dirname, '../src/control'),
        to: path.join(__dirname, '../dist/control'),
    }]),
    new ExtractTextPlugin('[name].css'),
    new ZipWebpackPlugin({
      path: path.join(__dirname, '../'),
      filename: `plugin.zip`
    })
  ]

};

module.exports = WebpackConfig;
