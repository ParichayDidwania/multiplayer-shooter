const path = require('path');
module.exports = {
  entry: './js/client.ts',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  resolve: {
    extensions: [ '.ts', '.tsx', '.js' ]
  },
  output: {
    filename: 'client.js',
    path: path.resolve(__dirname, 'dist')
  },
  mode: 'development'
};