# JavaScript to Lua

This project is missing many features (classes, etc). I made this to learn about transpiling using an abstract syntax tree.

Playground: https://shouxtech.github.io/js-to-lua/

```javascript
function callMe(args) {
    console.log(args);
}

function abc() {
    let a = 5;
    a += 2;
    callMe(a);
}

const a = 5;
let b = 'true' != a;

if ((5 == 2) && (true != false)) {
    console.log('ok');
} else {
    console.log('abc');
}

const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, {a: 1, b: 2}];
const obj = {a: 1, b: 2, c: [3, 4]};

const i = 0;
while (i < 10) {
    console.log(i);
    i++;
}
```
Gets transpiled to (with formatting enabled)
```lua
local function callMe(args)
    console.log(args)
end
local function abc()
    local a = 5
    a = a + 2
    callMe(a)
end
local a = 5
local b = "true" ~= a
if 5 == 2 and true ~= false then
    console.log("ok")
else
    console.log("abc")
end
local arr = {1, 2, 3, 4, 5, 6, 7, 8, 9, 10, {a = 1, b = 2}}
local obj = {a = 1, b = 2, c = {3, 4}}
local i = 0
while i < 10 do
    console.log(i)
    i = i + 1
end
```
