# React plugin for Desech Studio

## Install

- In Desech Studio
  - Go to Settings > Plugins, search for "React" and install it
  - Go to File > Project Settings > Export Code Plugin > set to "React"
- Using a design system works with this plugin, because we copy over all the css/js files.

## Test the react app

- In Desech Studio add an element to the canvas and Save.
- Every time you save, the react app files will be copied over to the `_export` folder of your desech project.
- There you can run the following, to test the react app

```sh
npm install
npm start
```

- Now you can access you react app at `http://localhost:3000/`
- Every time you save inside Desech Studio, it will push updates to the react app

## Tips

- Inside Desech Studio you will find in the HTML section of an element, a sub-section called `Programming Properties`. Here you can set any react specific attributes like `tabIndex`, `onClick`, `dangerouslySetInnerHTML`, etc.
  - You can't set `className` because it's already set by `Desech Studio`
- To use `if conditions` or `for loops` you need to use `reactIf` or `reactFor`, similar to how angular and vue works:
  - `reactIf` with `unreadMessages.length > 0` will export this react code:
    - `{unreadMessages.length > 0 && <div>...</div>}`
  - `reactFor` with `props.posts/post` will export this react code:
    - `{props.posts.map(post => <li>...</li>)}`
    - Please remember to add a `key` property too, for example `key` = `{post.id}`
  - `reactIfFor` with `test === 1/props.posts/post` will export this react code:
    - `{test === 1 && props.posts.map(post => <li>...</li>)}`
  - `reactForIf` with `props.posts/post/post.id > 0` will export this react code:
    - `{props.posts.map(post => post.id > 0 && <li>...</li>}`
  - Only one of these properties is allowed to exist on one element. You can't have both `reactIf` and `reactFor` for example. Instead use `reactIfFor` or `reactForIf`
- Make sure you set an `alt` value for images, otherwise react will complain about it
- `checked` html attributes are removed; instead use the programming property `defaultChecked`
- `selected` html attributes are removed; instead use the programming property `value` in the `select` element instead of the `option` element
- Anywhere inside text you can write code like `{user.userId}` and it will be exported as such and react will see it as code

- That's it. Ignore the rest if you don't plan on doing development on this plugin.

## Plugin Development

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

## Included npm packages

All Desech Studio plugins have access to the following npm libraries, because they come with the application:
- `lib.AdmZip` [adm-zip](https://www.npmjs.com/package/adm-zip)
- `lib.archiver` [archiver](https://www.npmjs.com/package/archiver)
- `lib.fse` [fs-extra](https://www.npmjs.com/package/fs-extra)
- `lib.jimp` [jimp](https://www.npmjs.com/package/jimp)
- `lib.beautify` [js-beautify](https://www.npmjs.com/package/js-beautify)
- `lib.jsdom` [jsdom](https://www.npmjs.com/package/jsdom)
- `lib.fetch` [node-fetch](https://www.npmjs.com/package/node-fetch)

## Documentation

Go to [facebook/create-react-app](https://github.com/facebook/create-react-app) to read the documentation.
