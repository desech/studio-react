# React plugin for [Desech Studio](https://www.desech.com/)

[www.desech.com](https://www.desech.com/)

## Install

- In Desech Studio
  - Go to Settings > Plugins > React and install it
  - Go to File > Project Settings > Export Code Plugin > set to "React"

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

## Storybook integration

- Check the [docs](https://storybook.js.org/docs/react/get-started/install) for further reading

```sh
export NODE_OPTIONS=--openssl-legacy-provider # linux / mac os only
set NODE_OPTIONS=--openssl-legacy-provider # windows only
npm run storybook
```

- Check the `_export/src/stories` folder for the actual stories

## Desech Studio integration

### React attributes/properties

- Anchor links need to follow this format `/contact.html` with a backslash at the beginning and an `.html` extension at the end
- Inside Desech Studio you can add react attributes/properties in the Programming properties for both elements and components
- You can set any react specific attributes like `tabIndex`, `onClick`, `dangerouslySetInnerHTML`, etc.
- To use `if conditions` or `for loops` you need to use `reactIf` or `reactFor`, similar to how angular and vue works:
  - `reactIf` with `users.length > 0` will export this react code:
    - `{users.length > 0 && <div>...</div>}`
  - `reactFor` with `users :: user` will export this react code:
    - `{users.map(user => <li>...</li>)}`
    - Please remember to add a `key` property too, for example `key` = `{user.id}`
    - If you don't want a custom `key` then you can just use `reactFor` = `users :: (user, index)` and `key` = `{index}`
  - `reactIfFor` with `users.length > 0 :: users :: user` will export this react code:
    - `{users.length > 0 && users.map(user => <li>...</li>)}`
  - `reactForIf` with `users :: user :: user.id > 0` will export this react code:
    - `{users.map(user => user.id > 0 && <li>...</li>}`
  - You can only have one of these properties at one time. You can't have both `reactIf` and `reactFor` for example. Instead use `reactIfFor` or `reactForIf`
  - As you have noticed the split string between these values is a ` :: ` - double colon with spaces in between.

### Tips

- Make sure you set an `alt` value for images, otherwise react will complain about it
- `selected` attributes are removed from `<option>` elements; instead use the property `defaultValue` in `<select>` instead of `<option>`
- SVG code inside html is poorly supported by JSX, so make sure the svg is clean without styles and meta tags
- Anywhere inside text you can write code like `{user.userId}` and it will be exported as react JSX code. But it's recommended you set data with `state` not manually add it in Desech Studio through text and attributes. This will help the designer to not have to deal with code.

### Limitations

- Using js code like `{user}` in text and property values works, but if you add it as a component override, then it will no longer be parsed as code.
  - This happens because when dealing with html text, we use `dangerouslySetInnerHTML` and this doesn't render js code inside.
  - As for property values, the overrides are coming from the component parent which has all the data stored as a json. Changing this from strings to actual code will show errors, since we will need those variables set in both the parent component and the child component that has the overrides.
- `reactIf`, `reactFor`, etc can't be used as component overrides. If you do override them, then the overrides will simply be ignored.
- The `className` property set in Desech Studio is ignored because it causes issues with overrides.

## Plugin Development

- That's it. Ignore the rest if you don't plan on doing development on this plugin.
- If you plan on helping out with code or extend this plugin, do the following:

```sh
cd /~/user/.config/Electron/plugin
  - this is the plugins folder of `Desech Studio` on Linux
rm -rf desech-studio-react
  - if you have the react plugin already install, delete it
git clone git@github.com:desech/studio-react.git desech-studio-react
  - you might need to use your own fork of this repo on github
npm i -f
cd dist
rm -rf *
npx create-react-app my-app
cd my-app
npm run eject
  - you might need to git commit and push all changes before ejecting if you are in a git repo
  - alternatively you can just remove the `.git` folder
npm install react-router-dom
npm install prop-types
npx sb init
- open `.storybook/main.js` and add `staticDirs: ['../public']`
rm -rf node_modules public .git package-lock.json yarn.lock src/stories
cd src
rm -rf App* index.css logo.svg
- open the `src/index.js` file and delete the `import './index.css';` line
```

- Now `Desech Studio` will use this git repository for the react plugin instead of the standard one.
- Warning: Make sure you don't touch the version in the `package.json` file, because Desech Studio will try to upgrade and it will delete everything and re-download the new version of this plugin.
  - Only update the version when you git push everything and you are done with development

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

## Desech Studio website

 - [www.desech.com](https://www.desech.com/)
