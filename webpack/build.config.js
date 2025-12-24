const path = require('path');
var webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const ZipWebpackPlugin = require('zip-webpack-plugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const fs = require('fs');
const babel = require('@babel/core');
const UglifyJS = require('uglify-js');

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
    new webpack.optimize.UglifyJsPlugin({
      compress: {
        warnings: false,
        drop_console: false,
        drop_debugger: false,
        dead_code: true,
        unused: true
      },
      mangle: {
        reserved: ['buildfire', 'angular', '$scope', '$rootScope']
      },
      output: {
        comments: false
      }
    }),
    
    // Custom plugin to process HTML build comments
    {
      apply: (compiler) => {
        compiler.plugin('emit', (compilation, callback) => {
          const processHtmlFile = (htmlPath, assetPath) => {
            if (fs.existsSync(htmlPath)) {
              let htmlContent = fs.readFileSync(htmlPath, 'utf8');
              
              // Process CSS build comments
              const cssRegex = /<!-- build:css (.+?) -->([\s\S]*?)<!-- endbuild -->/g;
              htmlContent = htmlContent.replace(cssRegex, (match, outputPath, content) => {
                const cssFiles = content.match(/href="([^"]+)"/g)?.map(m => m.replace(/href="([^"]+)"/, '$1')) || [];
                
                // Concatenate and minify CSS
                let combinedCss = '';
                cssFiles.forEach(file => {
                  const fullPath = path.join(path.dirname(htmlPath), file);
                  if (fs.existsSync(fullPath)) {
                    combinedCss += fs.readFileSync(fullPath, 'utf8');
                  }
                });
                
                // Add CSS to compilation assets
                if (compilation.assets[outputPath]) {
                  // Merge with existing bundle
                  const existingCss = compilation.assets[outputPath].source();
                  combinedCss = existingCss + combinedCss;
                }
                
                // Minify CSS more aggressively
                combinedCss = combinedCss
                  .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comments
                  .replace(/\s+/g, ' ') // Collapse whitespace
                  .replace(/;\s*}/g, '}') // Remove semicolons before closing braces
                  .replace(/\s*{\s*/g, '{') // Remove spaces around opening braces
                  .replace(/;\s*/g, ';') // Remove spaces after semicolons
                  .replace(/,\s*/g, ',') // Remove spaces after commas
                  .trim();
                
                // Create unique bundle names for each section
                const bundleName = assetPath.includes('content') ? 'content-bundle.min.css' : 'settings-bundle.min.css';
                const finalOutputPath = `control/${assetPath.includes('content') ? 'content' : 'settings'}/assets/css/${bundleName}`;
                
                compilation.assets[finalOutputPath] = {
                  source: () => combinedCss,
                  size: () => combinedCss.length
                };
                
                return `<link href="assets/css/${bundleName}" rel="stylesheet">`;
              });
              
              // Process JS build comments
              const jsRegex = /<!-- build:js (.+?) -->([\s\S]*?)<!-- endbuild -->/g;
              htmlContent = htmlContent.replace(jsRegex, (match, outputPath, content) => {
                const jsFiles = content.match(/src="([^"]+)"/g)?.map(m => m.replace(/src="([^"]+)"/, '$1')) || [];
                
                // Concatenate JS
                let combinedJs = '';
                jsFiles.forEach(file => {
                  const fullPath = path.join(path.dirname(htmlPath), file);
                  if (fs.existsSync(fullPath)) {
                    combinedJs += fs.readFileSync(fullPath, 'utf8') + ';\n';
                  } else {
                    console.warn(`JS file not found: ${fullPath}`);
                  }
                });
                
                // Create unique bundle names for each section
                const bundleName = assetPath.includes('content') ? 'content-bundle.min.js' : 'settings-bundle.min.js';
                const finalOutputPath = `control/${assetPath.includes('content') ? 'content' : 'settings'}/js/${bundleName}`;
                
                // Transpile ES6+ to ES5 with Babel, then minify with UglifyJS
                try {
                  // First transpile with Babel
                  const transpiled = babel.transformSync(combinedJs, {
                    presets: [['@babel/preset-env', { targets: { ie: '11' } }]]
                  });
                  
                  // Then minify with UglifyJS
                  const minified = UglifyJS.minify(transpiled.code, {
                    compress: {
                      drop_console: false,
                      drop_debugger: false,
                      dead_code: true,
                      unused: true
                    },
                    mangle: {
                      reserved: ['buildfire', 'angular', '$scope', '$rootScope']
                    },
                    output: {
                      comments: false
                    }
                  });
                  
                  if (minified.code) {
                    combinedJs = minified.code;
                  } else if (minified.error) {
                    console.warn('JS minification error:', minified.error);
                  }
                } catch (e) {
                  console.warn('JS transpilation/minification failed:', e.message);
                }
                
                compilation.assets[finalOutputPath] = {
                  source: () => combinedJs,
                  size: () => combinedJs.length
                };
                
                return `<script src="js/${bundleName}"></script>`;
              });
              
              // Add processed HTML to compilation assets
              compilation.assets[assetPath] = {
                source: () => htmlContent,
                size: () => htmlContent.length
              };
            }
          };
          
          // Process both content and settings HTML files
          processHtmlFile(
            path.join(__dirname, '../src/control/content/index.html'),
            'control/content/index.html'
          );
          processHtmlFile(
            path.join(__dirname, '../src/control/settings/index.html'),
            'control/settings/index.html'
          );
          
          callback();
        });
      }
    },
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
      ignore: ['*.js', '*.html', '*.md', '0.js']
    }),
    new CopyWebpackPlugin([{        
        from: path.join(__dirname, '../src/control'),
        to: path.join(__dirname, '../dist/control'),
    }], {
      ignore: [
        '**/index.html',
        '**/content/assets/css/style.css',
        '**/content/assets/css/dialogs.css', 
        '**/content/assets/css/cpIcons.css',
        '**/content/app.js',
        '**/content/js/DialogsService.js',
        '**/content/js/AIService.js',
        '**/settings/assets/css/style.css',
        '**/settings/app.js'
      ]
    }),
    new ExtractTextPlugin('[name].css'),
    new ZipWebpackPlugin({
      path: path.join(__dirname, '../'),
      filename: 'plugin.zip'
    })
  ]

};

module.exports = WebpackConfig;