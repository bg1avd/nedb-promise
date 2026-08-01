/**
 * Tests for the Stream API (P1) + Cursor thenable support.
 * Streams: createReadStream / createWriteStream / createUpdateStream / createRemoveStream
 */
var should = require('chai').should()
  , assert = require('chai').assert
  , Datastore = require('../lib/datastore')
  , model = require('../lib/model')
  ;


describe('Stream API', function () {
  var db;

  beforeEach(function (done) {
    db = new Datastore({ inMemoryOnly: true });
    db.insert([
      { name: 'Alice', age: 30, status: 'inactive' }
    , { name: 'Bob', age: 25, status: 'inactive' }
    , { name: 'Charlie', age: 35, status: 'active' }
    ], function (err) { assert.isNull(err); done(); });
  });

  var collect = function (stream) {
    return new Promise(function (resolve, reject) {
      var docs = [];
      stream.on('data', function (d) { docs.push(d); });
      stream.on('end', function () { resolve(docs); });
      stream.on('error', reject);
    });
  };

  var finish = function (stream) {
    return new Promise(function (resolve, reject) {
      stream.on('finish', resolve);
      stream.on('error', reject);
    });
  };

  describe('createReadStream', function () {
    it('Emits all matching documents', function (done) {
      db.createReadStream({ query: { age: { $gte: 30 } } })
        .on('data', function () {})
        .on('end', done)
        .on('error', done);
    });

    it('Filters by the query', function (done) {
      collect(db.createReadStream({ query: { age: { $gte: 30 } } }))
        .then(function (docs) {
          var names = docs.map(function (d) { return d.name; }).sort();
          names.should.deep.equal(['Alice', 'Charlie']);
          done();
        })
        .catch(done);
    });

    it('Emits all documents with an empty query', function (done) {
      collect(db.createReadStream())
        .then(function (docs) {
          docs.length.should.equal(3);
          done();
        })
        .catch(done);
    });

    it('Emits deep copies (no reference to internal docs)', function (done) {
      collect(db.createReadStream())
        .then(function (docs) {
          docs[0].custom = 'nope';
          return db.find({ name: 'Alice' });
        })
        .then(function (orig) {
          should.not.exist(orig[0].custom);
          done();
        })
        .catch(done);
    });
  });

  describe('createWriteStream', function () {
    it('Inserts documents written through the stream (single + batched _writev)', function (done) {
      var ws = db.createWriteStream();
      // Two back-to-back writes in the same tick exercise the _writev batched path
      ws.write({ name: 'Dave', age: 40 });
      ws.write({ name: 'Eve', age: 45 });
      ws.end({ name: 'Frank', age: 50 });

      finish(ws).then(function () {
        return db.count({});
      }).then(function (c) {
        c.should.equal(6);
        done();
      }).catch(done);
    });
  });

  describe('createUpdateStream', function () {
    it('Applies the update to documents passing through', function (done) {
      var first = new Promise(function (resolve, reject) {
        db.find({ name: 'Alice' }, function (err, docs) {
          if (err) { return reject(err); }
          resolve(docs[0]._id);
        });
      });

      first.then(function (id) {
        var us = db.createUpdateStream({ update: { $set: { status: 'archived' } } });
        us.write({ _id: id });
        us.end();
        return finish(us).then(function () { return id; });
      }).then(function (id) {
        return db.find({ _id: id });
      }).then(function (doc) {
        doc[0].status.should.equal('archived');
        done();
      }).catch(done);
    });

    it('Does not touch documents not passed through', function (done) {
      var first = new Promise(function (resolve, reject) {
        db.find({ name: 'Bob' }, function (err, docs) {
          if (err) { return reject(err); }
          resolve(docs[0]._id);
        });
      });

      first.then(function (id) {
        var us = db.createUpdateStream({ update: { $set: { status: 'archived' } } });
        us.write({ _id: id });
        us.end();
        return finish(us).then(function () { return id; });
      }).then(function () {
        return db.find({ name: 'Charlie' });
      }).then(function (doc) {
        doc[0].status.should.equal('active');
        done();
      }).catch(done);
    });
  });

  describe('createRemoveStream', function () {
    it('Removes documents passing through', function (done) {
      var first = new Promise(function (resolve, reject) {
        db.find({ name: 'Alice' }, function (err, docs) {
          if (err) { return reject(err); }
          resolve(docs[0]._id);
        });
      });

      first.then(function (id) {
        var rs = db.createRemoveStream();
        rs.write({ _id: id });
        rs.end();
        return finish(rs);
      }).then(function () {
        return db.count({ name: 'Alice' });
      }).then(function (c) {
        c.should.equal(0);
        return db.count({});
      }).then(function (total) {
        total.should.equal(2);
        done();
      }).catch(done);
    });
  });

  describe('Pipe compositions', function () {
    it('Pipe readStream -> updateStream archives all matching docs', function (done) {
      db.createReadStream({ query: { status: 'inactive' } })
        .pipe(db.createUpdateStream({ update: { $set: { status: 'archived' } } }))
        .on('finish', function () {
          db.find({ status: 'archived' }, function (err, docs) {
            assert.isNull(err);
            docs.length.should.equal(2);
            done();
          });
        })
        .on('error', done);
    });

    it('Pipe readStream -> removeStream removes all matching docs', function (done) {
      db.createReadStream({ query: { status: 'inactive' } })
        .pipe(db.createRemoveStream())
        .on('finish', function () {
          db.count({ status: 'inactive' }, function (err, c) {
            assert.isNull(err);
            c.should.equal(0);
            done();
          });
        })
        .on('error', done);
    });
  });
});


describe('Cursor thenable', function () {
  var db;

  beforeEach(function (done) {
    db = new Datastore({ inMemoryOnly: true });
    db.insert([
      { name: 'A', age: 30 }
    , { name: 'B', age: 20 }
    , { name: 'C', age: 40 }
    ], function (err) { assert.isNull(err); done(); });
  });

  it('Can be awaited directly (find)', function (done) {
    db.find({}).then(function (docs) {
      docs.length.should.equal(3);
      done();
    }).catch(done);
  });

  it('Supports chainable sort/limit/skip then await', function (done) {
    db.find({})
      .sort({ age: -1 })
      .limit(2)
      .then(function (docs) {
        docs.map(function (d) { return d.name; }).should.deep.equal(['C', 'A']);
        done();
      })
      .catch(done);
  });

  it('Supports await findOne and count', function (done) {
    var p = (async function () {
      var one = await db.findOne({ name: 'B' });
      var total = await db.count({});
      return [one.name, total];
    })();
    p.then(function (res) {
      res.should.deep.equal(['B', 3]);
      done();
    }).catch(done);
  });
});
