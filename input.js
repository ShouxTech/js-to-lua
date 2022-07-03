function callMe(args) {
    console.log(args);
}

function abc() {
    let a = 5;
    a += 2;
    callMe(a);
    return 'hi';
}

const a = 5;
let b = 'true' != a;

if ((5 == 2) && (true != false)) {
    console.log('ok');
} else if (!true) {
    console.log('abc');
} else {
    console.log('def');
}

const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, {a: 1, b: 2}];
const obj = {a: 1, b: 2, c: [3, 4]};

const notFive = !5

let i = 0;
while (i < 10) {
    console.log(i);
    i++;
    break;
}

for (let i = 0; i < 10; i++) {
    console.log(i);
}

for (const data of arr) {
	console.log(data);
}

const luaStr = 'lua';

const str = `${luaStr}world`;
const str2 = `hello${luaStr}`;
const str3 = `hello${luaStr}world`;
const str4 = `${luaStr}`;
const str5 = `hello`;
const str6 = ``;

const arrowFunc = (data) => {
    console.log('hello from an arrow function', data);
}
