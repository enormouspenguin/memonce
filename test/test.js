/**
 * Created with JetBrains WebStorm.
 * User: user
 * Date: 9/25/13
 * Time: 3:51 AM
 * To change this template use File | Settings | File Templates.
 */
var tap = require("tap")
    , test = tap.test
    , expect = require("chai").expect
    , memonce;

test("1/ Module loading", function(t) {
    t.doesNotThrow(function() {
        t.ok(memonce = require("../index.js"), "module existed");
    }, "module load without exception");
    t.end();
});

test("2/ Run once and only once", function(t) {
    var counter = 0
        , fn = memonce(incr);
    function incr(n) {
        counter += n || 1;
    }
    for(var i = 1; i < 100; i++) {
        fn(i);
    }
    t.equal(counter, 1, "correctly ran only once");
    t.end();
});

test("3/ Simple exception caching", function(t) {
    var err = new Error("Exceptional exception")
        fn = memonce(throwAway);
    function throwAway(err) {
        throw err;
    }
    try {
        fn(err);
    } catch(e) {
        t.equal(e, err, "first error was correctly thrown");
        t.equal(fn.memonce.threw, err, "first error was correctly cached");
    }
    try {
        fn(new Error());
    } catch(e) {
        t.equal(e, err, "next error was correctly thrown");
        t.equal(fn.memonce.threw, err, "next error was correctly cached");
    }
    t.end();
});

test("4/ Sync result return caching", function(t) {
    function rand() {
        return Math.random();
    }
    var fn = memonce(rand)
        , res = fn();
    t.deepEqual(res, fn.memonce.sync, "first direct return and cached return are the same");
    res = fn();
    t.deepEqual(res, fn.memonce.sync, "next direct return and cached return are the same");
    t.end();
});

test("5/ Async error caching", function(t) {
    var err = new Error("")
        , fn = memonce(resError);
    function resError(cb) {
        cb(err);
    }
    fn(function(erro) {
        t.equal(erro, err, "first error was correctly passed");
        t.equal(fn.memonce.error, err, "first error was correctly cached");
    });
    fn(function(erro) {
        t.equal(erro, err, "next error was correctly passed");
        t.equal(fn.memonce.error, err, "next error was correctly cached");
    })
    t.end();
});

test("6/ Async single result passing caching", function(t) {
    var value
        , fn = memonce(async);
    function async(cb) {
        if(!value) {
            value = Math.random();
        }
        cb(null, value);
    }
    fn(function(err, val) {
        t.notOk(err, "first no error");
        t.equal(val, value, "first direct value is correct");
        t.equal(fn.memonce.async, value, "first cached value is correct");
    });
    fn(function(err, val) {
        t.notOk(err, "next no error");
        t.equal(val, value, "next direct value is correct");
        t.equal(fn.memonce.async, value, "next cached value is correct");
    })
    t.end();
});

test("7/ Async multi result passing caching", function(t) {
    var value1, value2, value3
        , fn = memonce(async);
    function async(cb) {
        if(!value1 && !value2 && !value3) {
            value1 = Math.random();
            value2 = Math.random();
            value3 = Math.random();
        }
        cb(null, value1, value2, value3);
    }
    fn(function(err, val1, val2, val3) {
        t.notOk(err, "first no error");
        t.equal(val1, value1, "first direct value 1 is correct");
        t.equal(val2, value2, "first direct value 2 is correct");
        t.equal(val3, value3, "first direct value 3 is correct");
        t.doesNotThrow(function() {
            expect(fn.memonce.async).to.have.members([value1, value2, value3]);
        });;
    });
    fn(function(err, val1, val2, val3) {
        t.notOk(err, "next no error");
        t.equal(val1, value1, "next direct value 1 is correct");
        t.equal(val2, value2, "next direct value 2 is correct");
        t.equal(val3, value3, "next direct value 3 is correct");
        t.doesNotThrow(function() {
            expect(fn.memonce.async).to.have.members([value1, value2, value3]);
        });
    })
    t.end();
});

test("8/ Events", function(t) {
    t.plan(9);
    var value = Math.random()
        , er = new Error("Exceptional exception")
        , fnAsync = memonce(async)
        , fnRetur = memonce(retur)
        , fnErro = memonce(erro)
        , fnThro = memonce(thro);
    function async(cb) {
        cb(null, value, value);
    }
    function retur() {
        return value;
    }
    function erro(cb) {
        cb(er);
    }
    function thro() {
        throw er;
    };
    fnAsync
        .on("callback", function(params) {
            t.deepEqual(params, [null, value, value], "called back");
        })
        .on("success", function(params) {
            t.deepEqual(params, [value, value], "succeeded");
        });
    fnRetur
        .on("invoke", function() {
            t.ok(true, "invoked");
        })
        .on("reinvoke", function() {
            t.ok(true, "reinvoked");
        })
        .on("return", function(val) {
            t.equal(val, value, "returned");
        });
    fnErro
        .on("callback", function(params) {
            t.deepEqual(params, [er], "called back");
        })
        .on("failure", function(err) {
            t.equal(err, er, "failed");
        });
    fnThro
        .on("throw", function(err) {
            t.equal(err, er, "threw");
        });
    try{
        fnAsync(function(){});
        fnRetur();
        fnRetur();
        fnErro(function(){});
        fnThro();
    } catch(e) {
        t.equal(e, er, "last one");
    }
});