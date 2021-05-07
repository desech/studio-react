# React plugin for Desech Studio

## Install

- In Desech Studio
  - Go to Settings > Plugins > React and install it
  - Go to File > Project Settings > Export Code Plugin > set to "React"
- Using a design system works with this plugin, because we copy over all the css/js files.

## Test the react app

- In Desech Studio add an element to the canvas and Save.
- Every time you save, the react app files will be copied over to the `_export` folder of your desech project.
- There you can run the following, to test the react app:

```sh
npm install --force
npm start
```

- Now you can access you react app at `http://localhost:3000/`
- Every time you save inside Desech Studio, it will push updates to the react app

## Desech Studio integration

### React attributes/properties

- Inside Desech Studio there are 2 places where you can add react attributes/properties:
  - when you click on a component
  - when you click on an html element in the HTML section > Element properties
- Here you can set any react specific attributes like `tabIndex`, `onClick`, `dangerouslySetInnerHTML`, etc.
  - If you set `className` it will be added to the existing classes set by `Desech Studio`
- To use `if conditions` or `for loops` you need to use `reactIf` or `reactFor`, similar to how angular and vue works:
  - `reactIf` with `users.length > 0` will export this react code:
    - `{users.length > 0 && <div>...</div>}`
  - `reactFor` with `users :: user` will export this react code:
    - `{users.map(user => <li>...</li>)}`
    - Please remember to add a `key` property too, for example `key` = `{user.id}`
  - `reactIfFor` with `users.length > 0 :: users :: user` will export this react code:
    - `{users.length > 0 && users.map(user => <li>...</li>)}`
  - `reactForIf` with `users :: user :: user.id > 0` will export this react code:
    - `{users.map(user => user.id > 0 && <li>...</li>}`
  - You can only have one of these properties at one time. You can't have both `reactIf` and `reactFor` for example. Instead use `reactIfFor` or `reactForIf`
  - As you have noticed the split string between these values is a ` :: ` - double colon with spaces in between.

### Tips

- Make sure you set an `alt` value for images, otherwise react will complain about it
- `checked` html attributes are removed; instead use the property `defaultChecked`
- `selected` html attributes are removed; instead use the property `value` in the `select` element instead of the `option` element
- Anywhere inside text you can write code like `{user.userId}` and it will be exported as react JSX code
- SVG code inside html is poorly supported by JSX, so it's best to include svg as images

- That's it. Ignore the rest if you don't plan on doing development on this plugin.

## Plugin Development

If you plan on helping out with code or extend this plugin, do the following:

- delete everything in the `dist` folder so we can restart the build process

```sh
cd /~/somewhere-but-not-inside-the-plugin-folder
git clone https://github.com/facebook/create-react-app
npx create-react-app my-app
cd my-app
npm run eject
npm install react-router-dom
```

- Cleanup

```sh
rm -rf node_modules public .git package-lock.json yarn.lock
cd src
rm -rf App* index.css logo.svg
```

- open the `src/index.js` file and delete the `import './index.css';` line
- move the `my-app` folder to the plugin `dist` folder
- you can delete the `create-react-app` folder and anything you setup for it

```sh
cd /~/user/.config/Electron/plugin/desech-studio-react
npm install
```

## Included npm packages

All Desech Studio plugins have access to the following npm libraries, because they come with the application:
- `lib.AdmZip` [adm-zip](https://www.npmjs.com/package/adm-zip)
- `lib.archiver` [archiver](https://www.npmjs.com/package/archiver)
- `lib.fse` [fs-extra](https://www.npmjs.com/package/fs-extra)
- `lib.jimp` [jimp](https://www.npmjs.com/package/jimp)
- `lib.beautify` [js-beautify](https://www.npmjs.com/package/js-beautify)
- `lib.jsdom` [jsdom](https://www.npmjs.com/package/jsdom)
- `lib.fetch` [node-fetch](https://www.npmjs.com/package/node-fetch)

## Other Documentation

- Go to [facebook/create-react-app](https://github.com/facebook/create-react-app) to read the documentation.
