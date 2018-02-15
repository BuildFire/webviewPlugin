const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const WebpackConfig = {

  // Source map type
  // @see https://webpack.js.org/configuration/devtool/
  devtool: 'eval-source-map',

  entry: {
    //  Webpack dev server
    'devServer': `webpack-dev-server/client?http://0.0.0.0:8080`,

    // Plugin entry points
    'widget/widget': path.join(__dirname, '../src/widget/widget.js')
  },

  output: {
    path: path.join(__dirname, '../'),
    filename: '[name].js',
    publicPath: 'http://0.0.0.0:8080/'
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
        use: ['style-loader', 'css-loader']
      }
    ]
  },

  plugins: [
    new HtmlWebpackPlugin({
      filename: 'widget/index.html',
      inject: true,
      minify: { removeComments: true, collapseWhitespace: true },
      template: path.join(__dirname, '../src/widget/index.html'),
      chunks: ['devServer', 'widget/widget']
    }),
    new CopyWebpackPlugin([{
      from: path.join(__dirname, '../src/widget'),
      to: path.join(__dirname, '../widget'),
    }, {
      from: path.join(__dirname, '../src/resources'),
      to: path.join(__dirname, '../resources'),
    }], {
      ignore: ['*.js', '*.html', '*.md']
    }),
    new CopyWebpackPlugin([{
        from: path.join(__dirname, '../src/control'),
        to: path.join(__dirname, '../control'),
    }]),
    new CopyWebpackPlugin([{
       from: path.join(__dirname, '../../../styles'),
       to: path.join(__dirname, '../styles'),
     }, {
       from: path.join(__dirname, '../../../scripts'),
       to: path.join(__dirname, '../scripts'),
     }, {
       from: path.join(__dirname, '../../../fonticons'),
       to: path.join(__dirname, '../fonticons'),
     }])
  ],

  devServer: {
    port: 8080,
    host: '0.0.0.0',
    inline: true,
    contentBase: path.join(__dirname, '../dist'),
    publicPath: '/',
    quiet: false,
    noInfo: false,
    disableHostCheck: true,
  }

};

module.exports = WebpackConfig;
