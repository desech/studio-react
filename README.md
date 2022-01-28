# React plugin for [Desech Studio](https://www.desech.com/)

[www.desech.com](https://www.desech.com/)

## Install

- In Desech Studio
  - Go to Settings > Plugins > React and install it
  - Go to File > Project Settings > Export Code Plugin > set to "React"

## Test the react app

- In Desech Studio add an element and Save.
- Every time you save, the react app files will be copied over to the `_export` folder of your desech project.
- Know that while `Desech Studio` creates new react component files and only updates the named sections, it will not cleanup components that you have removed/moved/renamed. This also applies to storybook files. You will have to manually remove the unneeded react files.
- There you can run the following, to test the react app:

```sh
npm install --force
npm start
```

- Now you can access your react app at `http://localhost:3000/`
- Every time you save inside Desech Studio, it will push updates to the react app

## Storybook integration

- Check the [docs](https://storybook.js.org/docs/react/writing-stories/introduction) for further reading

```sh
export NODE_OPTIONS=--openssl-legacy-provider # linux / mac os only
set NODE_OPTIONS=--openssl-legacy-provider # windows only
npm run storybook
```

- Check the `_export/src/stories` folder for the actual stories

## Desech Studio integration

### Tips

- Anchor links need to follow this format `/contact.html` with a backslash at the beginning and an `.html` extension at the end
  - `<a>` elements are not converted to `<Link>` because of how overrides work. You will have to add your own page history code to the application.
- Anywhere inside text you can write code like `{user.userId}` and it will be exported as react JSX code.
  - Element attributes and properties are also converted to code if they are wrapped between curly brackets, ie `{foo}`
  - If you add it as a component override, then it will no longer be parsed as code.
- `reactIf`, `reactFor`, etc can't be used as component overrides. If you do override them, then the overrides will simply be ignored.
- If you're getting a babel error for `NODE_ENV`, then do what it says. Open the `_export/node_modules/babel-preset-react-app/index.js` file and set `const env = 'development'`
- Make sure you set an `alt` value for images, otherwise react will complain about it
- Instead of `<option>` elements with the `selected` attribute, you should add the attribute`defaultValue` on the `<select>` element.
- SVG code inside html is poorly supported by JSX, so make sure the svg is clean without styles and meta tags
- For textarea elements, you need to use the `defaultValue` property, instead of setting the textarea value field.
- Note that React handles [white space differently](https://reactjs.org/blog/2014/02/20/react-v0.9.html#jsx-whitespace). In Desech Studio, you will need to add `{' '}` in between the text inline elements that require it.
- If you use dots inside attribute/property names, React won't be able to parse the JSX code.
- If you want to use curly brackets `{` and `}` as text, not as JSX code, then use `{'{'}` and `{'}'}` like so: `Some object {'{'}id: 1{'}'}`. This will make react to render it as `Some object {id: 1}`
  - If the information is coming from the database, then you will have to parse your text and replace all curly brackets with the corresponding variable
- When we replace attribute value strings with JSX code we will remove the extra quotes. If you have some random text inside an html element like `attribute="{curly}"`, after the replace, it will become `attribute={curly}`, without the quotes.
  - If you want the quotes, then use this text inside Desech Studio `attribute={'"'}{curly}{'"'}`
- `className` properties are ignored

### React attributes/properties

- Inside Desech Studio you can add react directives in the Programming properties for both elements and components
- You can set any react specific attributes like `tabIndex`, `onClick`, `dangerouslySetInnerHTML`, etc.
  - If you want to set `dangerouslySetInnerHTML`, then you must use a block, not a text element and then set the value for the property to `{{ __html: '<b>bold</b' }}`
  - If you try to override `dangerouslySetInnerHTML` it will result in a JSX parsing error
- To use `if conditions` or `for loops` you need to use `reactIf` or `reactFor`, similar to how angular and vue works:
  - `reactIf` with `users.length > 0` will export this react code:
    - `{users.length > 0 && <div>...</div>}`
  - `reactFor` with `user in users` will export this react code:
    - `{users.map(user => <li>...</li>)}`
    - Please remember to add a `key` property too, for example `key` = `{user.id}`
    - If you don't want a custom `key` then you can just use `reactFor` = `(user, index) in users` and `key` = `{index}`
  - `reactIfFor` with `users.length > 0 :: user in users` will export this react code:
    - `{users.length > 0 && users.map(user => <li>...</li>)}`
  - `reactForIf` with `user in users :: user.id > 0` will export this react code:
    - `{users.map(user => user.id > 0 && <li>...</li>}`
  - You can only have one of these properties at one time. You can't have both `reactIf` and `reactFor` for example. Instead use `reactIfFor` or `reactForIf`

## Plugin Development

- That's it. Ignore the rest if you don't plan on doing development on this plugin.
- It's also probably best to have `Desech Studio` closed during this step.
- If you plan on helping out with code or extend this plugin, do the following:

```sh
cd "/home/<username>/.config/Desech Studio/plugin"
  - this is the plugins folder of `Desech Studio` on Linux
  - on Mac it's `/home/<username>/Library/Application Support/Desech Studio/plugin`
  - on Windows it's `C:/Users/<username>/AppData/Desech Studio/plugin`
rm -rf desech-studio-react
  - if you have the react plugin already install, delete it
git clone git@github.com:desech/studio-react.git desech-studio-react
  - you might need to use your own fork of this repo on github
cd desech-studio-react
npm install --force
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
- open `.storybook/main.js` and add `"staticDirs": [ "../public" ],`
rm -rf node_modules public .git package-lock.json yarn.lock
cd src
rm -rf App* index.css logo.svg stories
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
