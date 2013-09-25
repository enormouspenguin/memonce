memonce
=======

###Create async function wrapper that ensure wrapped function is only excecuted once and memorize execution result to pass to subsequence invocation. Combine power of memoize and once to help create async loading module.

##Usage

Pass to memonce a function and it will return a wrap around function of that function. Invoke the new function to get desired result (that is only invoke once, cache all return/throw/async result/async error of that single call, emit events as necessary). 

    var memonce = require("memonce");
    
    function asyncThings(cb) {
        cb(null, "Async result passing: " + Math.random());
    }
    
    var fn = memonce(asyncThings);
    
    fn(function(err, result) {
        console.log(result);
    });//The only one tine the real function is invoked
    
    fn(function(err, result) {
        console.log(result);
    });//Only pass result from cached first time invocation of real function, not invoking it.

More example at the `test/` folder.

##Events: 

`invoke`: at the first invocation of the function. 

`reinvoke`: at any subsequence invocation. 

`return`: after the real function return, but before the wrapper function return. 

`throw`: after the real function throw, but before the wrapper function throw. 

`callback`: after the real function's callback get called, but before the wrapper function's callback get called. 

`success`: after "callback" event and only if callback function receive no error (the first parameter of callback function have no or null value). 

`failure`: same as "success" event but only if there is an error. 
