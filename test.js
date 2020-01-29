// JavaScript source code

var Q = require('q');

Q()
    .then(() => {
        var a = new Promise(async (resolve) => {
            await sleep(1000);
            resolve('a');
        });

        var b = new Promise((resolve) => resolve('b'));

        return Promise.all([b, a]) 
    })
    .then((result) => console.log('result final then', result));
    

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}  