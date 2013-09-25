var util = require("util")
    , events = require("events")
    , EventEmitter = events.EventEmitter;

function isFunction(value) {
    return typeof value == 'function';
}

function memToMemonce(mem) {
    return {
        cbThis: mem.cbThis,
        threw: mem.threw,
        error: mem.error && mem.error[0],
        sync: mem.sync,
        async: mem.async && ((mem.async.length == 2) ? mem.async[1] : mem.async.slice(1))
    }
}

var Memonce = Object.create(Function.prototype);

Object.keys(EventEmitter.prototype).forEach(function(method) {
    if (!Memonce[method])
        Memonce[method] = EventEmitter.prototype[method];
});

module.exports = function(fn, fnThis) {
    if(!isFunction(fn)) {
        throw new Error("Not a function!");
    }
    var isDone = false
        , mem = {
            cbThis: null,
            threw:null,
            error: null,//Array
            sync: null,
            async: null//Array
        }
        , wrapper = function() {
            var cb = arguments[arguments.length-1]
                , isFn = isFunction(cb);
            if(isDone) {
                wrapper.emit("reinvoke", Array.prototype.slice.call(arguments));
                if(mem.threw) {
                    throw mem.threw;
                }
                isFn && cb.apply(mem.cbThis, mem.error || mem.async);
                return mem.sync;
            }
            var args = Array.prototype.slice.call(arguments);
            wrapper.emit("invoke", args);
            isDone = true;
            if(isFn) {
                args[args.length-1] = function() {
                    var args = Array.prototype.slice.call(arguments);
                    wrapper.emit("callback", args, this);
                    mem.cbThis = this;
                    if(arguments[0]) {
                        mem.error = [arguments[0]];
                        wrapper.memonce = memToMemonce(mem);
                        wrapper.emit("failure", wrapper.memonce.error);
                        return cb.apply(mem.cbThis, mem.error);
                    }
                    mem.async = args;
                    wrapper.memonce = memToMemonce(mem);
                    wrapper.emit("success", wrapper.memonce.async);
                    cb.apply(mem.cbThis, mem.async);
                };
            }
            try {
                var ret = mem.sync = fn.apply(fnThis, args);
                wrapper.memonce = memToMemonce(mem);
                wrapper.emit("return", ret);
                return ret;
            } catch (err) {
                mem.threw = err;
                wrapper.memonce = memToMemonce(mem);
                wrapper.emit("throw", err);
                throw err;
            }
        }
    wrapper.__proto__ = Memonce;
    EventEmitter.call(wrapper);
    return wrapper;
};