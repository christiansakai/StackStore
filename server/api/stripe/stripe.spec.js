'use strict';

var should = require('should');
var app = require('../../app');
var request = require('supertest');

describe('GET /api/stripes', function() {

  it('should respond with 500 if no stripes', function(done) {
    request(app)
      .get('/api/stripes')
      .expect(500, done)
  });

  // it('should respond with JSON array', function(done) {
  //   request(app)
  //     .get('/api/stripes')
  //     .expect(200)
  //     .expect('Content-Type', /json/)
  //     .end(function(err, res) {
  //       if (err) return done(err);
  //       res.body.should.be.instanceof(Array);
  //       done();
  //     });
  // });
});
