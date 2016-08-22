'use strict'
let expect = require('chai').expect
let rewire = require('rewire')

let versionValidator = rewire('../lib')

let addVersion = versionValidator.__get__('addVersion')
let generateDefaultError = versionValidator.__get__('generateDefaultError')
let isVersion = versionValidator.__get__('isVersion')
let routeVersion = versionValidator.__get__('routeVersion')
let sendError = versionValidator.__get__('sendError')
let sendReply = versionValidator.__get__('sendReply')
let validateArgs = versionValidator.__get__('validateArgs')
let validateVersion = versionValidator.__get__('validateVersion')

describe('validateVersion()', () => {
  it('should return a bound version of addVersion', () => {
    expect(validateVersion(['1.0.0'])).to.be.a('function')
      .that.has.property('name', 'bound addVersion')
  })
})

describe('addVersion()', () => {
  it('should set req.version to the requested version in the query', () => {
    const versions = ['1.0.0']
    const req = {
      query: {version: '>=1.0.0'}
    }
    const func = addVersion.bind({supportedVersions: versions})
    const next = () => expect(req.version).to.equal('>=1.0.0')

    func(req, null, next)
  })

  it('should set req.version to the requested version in the header', () => {
    const versions = ['1.0.0']
    const req = {
      query: {},
      headers: {'accept-version': '>=1.0.0'}
    }
    const func = addVersion.bind({supportedVersions: versions})
    const next = () => expect(req.version).to.be.equal('>=1.0.0')

    func(req, null, next)
  })

  it('should prefer the query over the header', () => {
    const versions = ['1.0.0']
    const req = {
      query: {version: '>=1.0.0'},
      headers: {'api-version': '>=0.9.0'}
    }
    const func = addVersion.bind({supportedVersions: versions})
    const next = () => expect(req.version).to.be.equal('>=1.0.0')

    func(req, null, next)
  })

  it('should set req.matchedVersion', () => {
    const versions = ['1.0.0']
    const req = {
      query: {version: '>=0.9.5'}
    }
    const func = addVersion.bind({supportedVersions: versions})
    const next = () => expect(req.matchedVersion).to.be.equal('1.0.0')

    func(req, null, next)
  })

  it('should set API-VERSION in the response when this.sendVersionHeader = true', () => {
    let called = false
    const versions = ['1.0.0']
    const req = {
      query: {version: '~1.0.0'}
    }
    const func = addVersion.bind({supportedVersions: versions, sendVersionHeader: true})
    const res = {
      set: (header, value) => {
        expect(header).to.equal('API-VERSION')
        expect(value).to.equal('1.0.0')
        called = true
      }
    }
    const next = () => {}

    func(req, res, next)
    expect(called).to.equal.true
  })

  it('should not set API-VERSION in the response when this.sendVersionHeader = false', () => {
    let called = false
    const versions = ['1.0.0']
    const req = {
      query: {version: '~1.0.0'}
    }
    const func = addVersion.bind({supportedVersions: versions, sendVersionHeader: false})
    const res = {
      set: (header, value) => {
        called = true
      }
    }
    const next = () => {}

    func(req, res, next)
    expect(called).to.equal.false
  })

  it('should call handleUnsupported if there is no matching version', () => {
    let called = false
    const options = {
      handleUnsupported: () => {
        called = true
      },
      supportedVersions: ['1.0.0']
    }
    const req = {
      query: {version: '2.0.0'}
    }
    const func = addVersion.bind(options)
    const next = () => expect(called).to.be.true

    func(req, null, next)
  })
})

describe('validateArgs()', () => {
  it('should set an array input as args.versions', () => {
    const versions = ['1.0.0']

    expect(validateArgs(versions)).to.have.property('versions').that.deep.equals(versions)
  })

  it('should throw an error if the input is not an array or object', () => {
    const versions = '1.0.0'
    const func = validateArgs.bind(null, versions)

    expect(func).to.throw(TypeError, 'Arguments should contain a list of supported versions')
  })

  it('should throw an error if versions is not an array', () => {
    const options = {versions: '1.0.0'}
    const func = validateArgs.bind(null, options)
    expect(func).to.throw(TypeError, 'versions should be a list of strings')
  })

  it('should throw an error if the input does not contain a list of supported versions', () => {
    const options = {isMandatary: true}
    const func = validateArgs.bind(null, options)

    expect(func).to.throw(TypeError, 'Arguments should contain a list of supported versions')
  })

  it('should throw an error if one of the supported versions is invalid', () => {
    const versions = ['a.b.c']
    const func = validateArgs.bind(null, versions)

    expect(func).to.throw(TypeError, 'Version a.b.c is not a valid semver string')
  })

  it('should default sendReply to true', () => {
    const options = {
      versions: ['1.0.0']
    }

    expect(validateArgs(options)).to.have.property('sendReply', true)
  })

  it('should set sendReply to the supplied value', () => {
    const options = {
      versions: ['1.0.0'],
      sendReply: false
    }

    expect(validateArgs(options)).to.have.property('sendReply', false)
  })

  it('should throw an error if sendReply is not a boolean', () => {
    const options = {
      versions: ['1.0.0'],
      sendReply: 'true'
    }
    const func = validateArgs.bind(null, options)

    expect(func).to.throw(TypeError, 'sendReply should be a boolean')
  })

  it('should default isMandatory to false', () => {
    const options = {
      versions: ['1.0.0']
    }

    expect(validateArgs(options)).to.have.property('isMandatory', false)
  })

  it('should set isMandatory to the supplied value', () => {
    const options = {
      versions: ['1.0.0'],
      isMandatory: true
    }

    expect(validateArgs(options)).to.have.property('isMandatory', true)
  })

  it('should throw an error if isMandatory is not a boolean', () => {
    const options = {
      versions: ['1.0.0'],
      isMandatory: 'true'
    }
    const func = validateArgs.bind(null, options)

    expect(func).to.throw(TypeError, 'isMandatory should be a boolean')
  })

  it('should default sendVersionHeader to true', () => {
    const options = {
      versions: ['1.0.0']
    }

    expect(validateArgs(options)).to.have.property('sendVersionHeader', true)
  })

  it('should set sendVersionHeader to the supplied value', () => {
    const options = {
      versions: ['1.0.0'],
      sendVersionHeader: false
    }

    expect(validateArgs(options)).to.have.property('sendVersionHeader', false)
  })

  it('should throw an error if sendVersionHeader is not a boolean', () => {
    const options = {
      versions: ['1.0.0'],
      sendVersionHeader: 'true'
    }
    const func = validateArgs.bind(null, options)

    expect(func).to.throw(TypeError, 'sendVersionHeader should be a boolean')
  })

  it('should default generateError to generateDefaultError()', () => {
    const options = {
      versions: ['1.0.0']
    }

    expect(validateArgs(options)).to.have.property('generateError')
      .that.is.a('function').with.property('name', 'bound generateDefaultError')
  })

  it('should set generateError to the supplied value', () => {
    let called = false
    const options = {
      versions: ['1.0.0'],
      generateError: () => {
        called = true
      }
    }

    expect(validateArgs(options)).to.have.property('generateError').that.is.a('function')
    expect(validateArgs(options).generateError()).to.satisfy(() => called)
  })

  it('should throw an error if generateError is not a function', () => {
    const options = {
      versions: ['1.0.0'],
      generateError: 'function'
    }
    const func = validateArgs.bind(null, options)

    expect(func).to.throw(TypeError, 'generateError should be a function')
  })
})

describe('sendError', () => {
  it('should call next with the bound argument', () => {
    let called = false
    const generateError = () => {
      called = true
    }
    const func = sendError.bind(generateError)
    const next = () => expect(called).to.be.true

    func(null, null, next)
  })
})

describe('sendReply()', () => {
  it('should send statusCode 400', () => {
    let called = false
    const res = {
      status: (code) => {
        called = true
        expect(code).to.equal(400)
        return res
      },
      json: () => {}
    }
    const func = sendReply.bind(['1.0.0'])

    func(null, res)
    expect(called).to.be.true
  })

  it('should send a json response', () => {
    let called = false

    const res = {
      status: () => res,
      json: (payload) => {
        called = true
      }
    }
    const func = sendReply.bind(['1.0.0'])

    func(null, res)
    expect(called).to.be.true
  })

  it('should send a list of supported versions', () => {
    const expectedResponse = {
      statusCode: 400,
      title: 'Invalid Version',
      detail: 'Supported Versions: [1.0.0]'
    }
    const res = {
      status: () => res,
      json: (payload) => expect(payload).to.deep.equal(expectedResponse)
    }
    const func = sendReply.bind(['1.0.0'])

    func(null, res)
  })
})

describe('generateDefaultError', () => {
  before(() => {
    generateDefaultError = generateDefaultError.bind(['1.0.0'])
  })
  it('should return an error', () => {
    expect(generateDefaultError()).to.be.an('error')
  })

  it('should contain a 400 status property', () => {
    expect(generateDefaultError()).to.have.a.property('status', 400)
  })

  it('should have a message "Invalid Version"', () => {
    expect(generateDefaultError()).to.have.a.property('message', 'Invalid Version')
  })

  it('should have a detail property with a list of supported versions', () => {
    expect(generateDefaultError()).to.have.a.property('detail', 'Supported Versions: [1.0.0]')
  })
})

describe('isVersion()', () => {
  it('should return a bound copy of routeVersion', () => {
    const version = '1.0.0'
    const output = isVersion(version)

    expect(output).to.be.a('function').that.has.property('name', 'bound routeVersion')
  })

  it('should throw an error if the version is not valid', () => {
    const version = 'a.b.c'
    const output = isVersion.bind(null, version)

    expect(output).to.throw(TypeError)
  })

  it('should throw an error if the version is not a string', () => {
    const version = {foo: 'bar'}
    const output = isVersion.bind(null, version)

    expect(output).to.throw(TypeError)
  })
})

describe('routeVersion()', () => {
  it('should call next() when the version matches', () => {
    const version = '1.0.0'
    const router = routeVersion.bind(version)
    const req = {matchedVersion: version}
    const next = (arg) => {
      expect(arg).to.be.undefined
    }

    router(req, null, next)
  })

  it('should call next(\'route\') when the version does not match', () => {
    const version = '1.0.0'
    const router = routeVersion.bind(version)
    const req = {matchedVersion: '2.0.0'}
    const next = (arg) => {
      expect(arg).to.equal('route')
    }

    router(req, null, next)
  })
})
