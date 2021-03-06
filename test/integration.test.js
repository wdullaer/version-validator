'use strict'
const chai = require('chai')
const chaiHTTP = require('chai-http')
const chaiPromise = require('chai-as-promised')
chai.use(chaiHTTP)
chai.use(chaiPromise)

const expect = chai.expect
const express = require('express')
const validateVersion = require('../lib')

const request = (app) => chai.request(app)

describe('Integration tests', () => {
  describe('validateVersion()', () => {
    it('should parse a valid version in the query string', () => {
      const versions = ['1.0.0']
      const resp = request(createServer(versions))
        .get('/')
        .query({ version: versions[0] })

      return expect(resp).to.eventually.have.status(200)
    })

    it('should parse a valid version in the header', () => {
      const versions = ['1.0.0']
      const resp = request(createServer(versions))
        .get('/')
        .set('accept-version', versions[0])

      return expect(resp).to.eventually.have.status(200)
    })

    it('should prefer the query string over the header', () => {
      const versions = ['1.0.0']
      const resp = request(createServer(versions))
        .get('/')
        .set('accept-version', '2.0.0')
        .query({ version: versions[0] })

      return expect(resp).to.eventually.have.status(200)
    })

    it('should send the max version if no version is specified and a version is not mandatory', () => {
      const versions = ['1.0.0', '2.0.0']
      const resp = request(createServer(versions))
        .get('/')

      return expect(resp).to.eventually.have.status(200)
        .and.be.json
        .and.have.nested.property('body.matchedVersion', '2.0.0')
    })

    it('should send an error reply if version is missing while mandatory', () => {
      const options = {
        isMandatory: true,
        versions: ['1.0.0']
      }
      const resp = request(createServer(options))
        .get('/')

      return expect(resp).to.eventually.have.status(400)
    })

    it('should send an error when the version is not valid', () => {
      const versions = ['1.0.0']
      const resp = request(createServer(versions))
        .get('/')
        .query({ version: 'a.b.c' })

      return expect(resp).to.eventually.have.status(400)
    })

    it('should send an error when the version is not supported', () => {
      const versions = ['1.0.0']
      const resp = request(createServer(versions))
        .get('/')
        .query({ version: '2.0.0' })

      return expect(resp).to.eventually.have.status(400)
    })

    it('should provide additional information in the default error reply', () => {
      const versions = ['1.0.0']
      const resp = request(createServer(versions))
        .get('/')
        .query({ version: '2.0.0' })

      return expect(resp).to.eventually.have.status(400)
        .and.be.json
        .and.have.property('body').that.deep.equals({
          statusCode: 400,
          title: 'Invalid Version',
          detail: 'Supported Versions: [1.0.0]'
        })
    })

    it('should call the next middleware with an error when sendReply = false', () => {
      const options = {
        sendReply: false,
        versions: ['1.0.0']
      }
      const resp = request(createServer(options))
        .get('/')
        .query({ version: '2.0.0' })

      return expect(resp).to.eventually.have.status(400)
        .and.have.property('text', 'Invalid Version')
    })

    it('should call the next middleware with a custom error when sendReply = false and generateError is given', () => {
      const options = {
        sendReply: false,
        generateError: () => new Error('custom error'),
        versions: ['1.0.0']
      }
      const resp = request(createServer(options))
        .get('/')
        .query({ version: '2.0.0' })

      return expect(resp).to.eventually.have.status(500)
        .and.have.property('text', 'custom error')
    })

    it('should set API-VERSION header when sendVersionHeader = true', () => {
      const options = {
        versions: ['1.0.0']
      }
      const resp = request(createServer(options))
        .get('/')
        .query({ version: '1.0.0' })

      return expect(resp).to.eventually.have.status(200)
        .and.have.header('API-VERSION', '1.0.0')
    })

    it('should not set API-VERSION header when sendVersionHeader = false', () => {
      const options = {
        versions: ['1.0.0'],
        sendVersionHeader: false
      }
      const resp = request(createServer(options))
        .get('/')
        .query({ version: '1.0.0' })

      return expect(resp).to.eventually.have.status(200)
        .and.not.have.header('API-VERSION')
    })
  })

  describe('isVersion', () => {
    it('should call the next handler in the chain if the version matches', () => {
      const version = '1.0.0'
      const resp = request(createRoutingServer([version], version))
        .get('/')
        .query({ version })

      return expect(resp).to.eventually.have.status(200)
        .and.be.json
    })

    it('should call the next route if the version does not match', () => {
      const version = '2.0.0'
      const requestedVersion = '3.0.0'
      const resp = request(createRoutingServer([requestedVersion, version], version))
        .get('/')
        .query({ version: requestedVersion })

      return expect(resp).to.eventually.have.status(201)
        .and.be.json
    })
  })
})

function createServer (options) {
  const app = express()
  app.use(validateVersion.validateVersion(options))
  app.get('*', (req, res) => {
    res.status(200).json({ matchedVersion: req.matchedVersion, version: req.version })
  })
  app.use((error, req, res, next) => {
    res.status(error.status || 500).send(error.message)
  })
  return app
}

function createRoutingServer (versions, version) {
  const app = express()
  app.use(validateVersion.validateVersion(versions))
  app.get('*', validateVersion.isVersion(version), (req, res) => {
    res.status(200).json({ matchedVersion: req.matchedVersion, version: req.version })
  })
  app.get('*', (req, res) => {
    res.status(201).json({ matchedVersion: req.matchedVersion, version: req.version })
  })
  return app
}
