# Version Validator
![NPM Version](https://img.shields.io/npm/v/version-validator.svg)
![Build Status](https://github.com/wdullaer/sse-utils/workflows/version-validator/badge.svg)
![Dependency Status](https://david-dm.org/wdullaer/version-validator.svg)
[![Code Climate](https://codeclimate.com/github/wdullaer/version-validator/badges/gpa.svg)](https://codeclimate.com/github/wdullaer/version-validator)
[![Test Coverage](https://codeclimate.com/github/wdullaer/version-validator/badges/coverage.svg)](https://codeclimate.com/github/wdullaer/version-validator/coverage)

This package will generate middleware to handle version management in your REST API.
It is based on the conventions used in [restify](https://restify.com) and allows you to easily create a similar flow in  [expressjs](https://expressjs.com).

The package will parse the version as follows:

1. Specified in the query parameter version: `req.query.version`
2. Specified in the header as `accept-version`: `req.headers['accept-version']`

The queryString parameter takes precedence over the header

Versions are expected to be expressed as semver queries (the same way you specify npm package versions):

```
GET /?version=~1.0.0
```

## Installation
```bash
npm install version-validator
```

## Usage Examples

### Basic
In its most basic form you can use this library to add `req.version` and `req.matchedVersion` to your requests

```javascript
let app = require('express')()
let {validateVersion} = require('version-validator')
const versions = ['1.0.0', '1.1.0', '2.0.0']

app.use(validateVersions(versions))

app.get('*', (req, res) => {
  res.status(200).json({
    version: req.version,
    matchedVersion: req.matchedVersion
  })
})
```

### Routing based on version
The library also exposes a helper function which will route traffic into the chain if it matches, or to the next route if it doesn't

```javascript
let app = require('express')()
let {isVersion, validateVersion} = require('version-validator')
const versions = ['1.0.0', '1.1.0', '2.0.0']

app.use(validateVersions(versions))

app.get('*', isVersion('1.0.0'), (req, res) => {
  // req.matchedVersion will be '1.0.0' here
  res.status(200).json({
    version: req.version,
    matchedVersion: req.matchedVersion
  })
})

app.get('*', (req, res) => {
  // req.matchedVersion will be '1.1.0' or '2.0.0' here
  res.status(200).json({
    version: req.version,
    matchedVersion: req.matchedVersion
  })
})
```

### Make the version mandatory
By default `validateVersion` will interprete no version as semver '\*'. You can make the version specification mandatory by passing `isMandatory: false`, in which case it will return an error if the version is missing

```javascript
app.use(validateVersion{
  isMandatory: true,
  versions: ['1.0.0']
})
```

### Do your own error handling
By default `validateVersion` will send a reply directly when the version is not supported. However you can have it call the expressjs error handler instead

```javascript
app.use(validateVersions({
  sendReply: false,
  versions: ['1.0.0']
}))

app.get('*', (req, res) => res.status(200).send('You requested a valid version'))
app.use((error, req, res, next) => res.status(error.status).send('You requested an invalid version'))
```

You can customize the error that is passed in the callback by giving an error generating function as the `generateError` parameter:

```javascript
app.use(validateVersions({
  sendReply: false,
  generateError: () => new Error('my-custom-error')
  versions: ['1.0.0']
}))

app.get('*', (req, res) => res.status(200).send('You requested a valid version'))
app.use((error, req, res, next) => res.status(500).send(error.message))
// error.message will be 'my-custom-error'
```

## API
### ErrorGenerator

A function generating a custom error to be passed into next when the version
is not valid

Returns **[error](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error)**

### ValidatorOptions

An object containing the configuration options of the validateVersion function

**Properties**

-   `versions` **[Array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array)&lt;[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)>**
-   `sendReply` **?[boolean](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Boolean)**
-   `isMandatory` **?[boolean](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Boolean)**
-   `sendVersionHeader` **?[boolean](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Boolean)**
-   `generateError` **?[ErrorGenerator](#errorgenerator)**

### validateVersion

Generates a middleware to parse and validate versions out of the request

**Parameters**

-   `args` **([ValidatorOptions](#validatoroptions) \| [Array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array)&lt;[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)>)** An object of options, or an array of supported semver versions

**Examples**

```javascript
let app = require('express')();
let vv = require('version-validator');

app.use(vv.validateVersion({
  versions: ['1.0.0'],
  isMandatory: true
}));
app.all('/', (req, res) => res.status(200).json({
  req.version,
  req.matchedVersion
}));
```

-   Throws **[TypeError](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypeError)** Properties of args must have their specified types

Returns **Middleware** A middleware that validates the requested version and populates `req.version` and `req.matchedVersion`

### isVersion

Generates a middleware route that routes the request into `next()` if the version
matches and `next('route')` if the version does not matches

**Parameters**

-   `version` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** A semver string

**Examples**

```javascript
let app = require('express')();
let vv = require('version-validator');

app.use(vv.validateVersion(['1.0.0']));
app.all('/', vv.isVersion('1.0.0'), (req, res) => res.status(200).send(`${req.matchedVersion} is 1.0.0`));
app.all('/', (req, res) => res.status(200).send(`${req.matchedVersion} is not 1.0.0`));
```

-   Throws **[TypeError](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypeError)** `version` must be a valid semver string

Returns **Middleware** A middleware to route requests for this version
