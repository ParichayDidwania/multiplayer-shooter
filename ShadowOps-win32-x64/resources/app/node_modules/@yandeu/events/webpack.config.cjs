const path = require('path')
const TerserPlugin = require('terser-webpack-plugin')

module.exports = [
  { filename: 'events.min.js', configFile: 'tsconfig.json' },
  { filename: 'events.es5.min.js', configFile: 'tsconfig.cjs.json' }
].map(config => {
  return {
    mode: 'production',
    entry: './src/index.ts',
    target: 'web',
    output: {
      filename: config.filename,
      path: path.resolve(__dirname, 'umd'),
      libraryTarget: 'umd'
    },
    resolve: {
      extensions: ['.ts', '.tsx', '.js']
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: [
            {
              loader: 'ts-loader',
              options: {
                configFile: config.configFile
              }
            }
          ]
        }
      ]
    },
    optimization: {
      minimize: true,
      minimizer: [
        new TerserPlugin({
          extractComments: false
        })
      ]
    }
  }
})
