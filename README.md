# React plugin for Desech Studio

## Install

- In Desech Studio
  - Go to Settings > Plugins, search for "React" and install it
  - Go to File > Project Settings > Export Code Plugin > set to "React"
- Using a design system works with this plugin, because we copy over the same css/js file.

## Test the react app

- In Desech Studio add an element to the canvas and Save.
- Every time you save, the react app files will be copied over to the `_export` folder of your desech project.
- There you can run the following, to test the react app

```sh
npm install
npm start
```

- Now you can access you react app at `http://localhost:3000/`
- Every time you save desech, it will push updates to the react app
- That's it. Ignore the rest if you don't plan on doing development on this plugin.

## Development

If you plan on helping out with code or extend this plugin, do the following:

- delete everything in the `dist` folder so we can restart the build process

```sh
cd dist
git clone https://github.com/facebook/create-react-app
npx create-react-app my-app
cd my-app
- make sure you commit everything to git
npm run eject
npm install react-router-dom
```

- delete `node_modules`, `public`, `yarn.lock` and everything from `src` except `index.js` and `reportWebVitals.js`
- delete create-react-app
- edit `index.js` and remove the `import './index.css';` line

## Documentation

Go to [facebook/create-react-app](https://github.com/facebook/create-react-app) to read the documentation.
